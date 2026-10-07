package engine

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/diamondburned/arikawa/v3/utils/json/option"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/message"
)

const (
	// componentUnavailableMessage is shown when a component or modal can't be
	// resolved to a flow anymore, e.g. because the message, command or flow it
	// belonged to was deleted. Without any response Discord would only show a
	// generic "This interaction failed".
	componentUnavailableMessage = "Thành phần này không còn khả dụng."
	// componentErrorMessage is shown when resolving the flow failed for an
	// internal reason (e.g. a database error) that may succeed on retry.
	componentErrorMessage = "Đã xảy ra lỗi khi xử lý tương tác, vui lòng thử lại."
)

// errResumeTargetNotFound means the command, event listener or message instance
// a resume point belongs to (or the node within its flow) no longer exists.
var errResumeTargetNotFound = errors.New("resume target not found")

// handleComponentInteraction dispatches interactions with message components
// (buttons and select menus) to their flow. Components either belong to a
// message template instance (custom ID = flow source ID) or to a message that
// was sent by a flow (custom ID = resume point + component ID).
func (a *App) handleComponentInteraction(session *state.State, e *gateway.InteractionCreateEvent, d discord.ComponentInteraction) {
	customID := string(d.ID())

	if resumePointID, _, ok := message.DecodeCustomIDMessageComponentResumePoint(customID); ok {
		a.resumeFlow(session, e, resumePointID, &componentExecution{
			logInteraction: a.logComponentInteractions(),
		})
		return
	}

	if e.Message == nil {
		a.respondComponentUnavailable(session, e, "interaction has no message")
		return
	}

	instanceModel, err := a.env.MessageInstanceStore.MessageInstanceByDiscordMessageID(context.TODO(), e.Message.ID.String())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			a.respondComponentUnavailable(session, e, "message instance not found")
			return
		}

		slog.Error(
			"Failed to get message instance by discord message ID",
			slog.String("app_id", a.id),
			slog.String("discord_message_id", e.Message.ID.String()),
			slog.String("error", err.Error()),
		)
		respondEphemeral(session, e, componentErrorMessage)
		return
	}

	instance, err := NewMessageInstance(a.id, instanceModel, a.env)
	if err != nil {
		slog.Error(
			"Failed to create message instance",
			slog.String("app_id", a.id),
			slog.String("message_id", instanceModel.MessageID),
			slog.String("error", err.Error()),
		)
		respondEphemeral(session, e, componentErrorMessage)
		return
	}

	targetFlow, ok := instance.Flow(customID)
	if !ok {
		a.respondComponentUnavailable(session, e, "component flow not found")
		return
	}

	// A message sent before its button was turned into a select (or the other
	// way around) must not run a flow written for the other component.
	if targetFlow.IsComponentSelectEntry() != (d.Type() != discord.ButtonComponentType) {
		a.respondComponentUnavailable(session, e, "component type changed")
		return
	}

	go instance.HandleComponent(session, e, customID, targetFlow, &componentExecution{
		component:      instance.Component(context.Background(), customID),
		logInteraction: a.logComponentInteractions(),
	})
}

// logComponentInteractions reports whether the app wants every component
// interaction to be logged.
func (a *App) logComponentInteractions() bool {
	settings := a.prefixSettings(context.Background())
	return settings != nil && settings.LogComponentInteractions
}

// describeComponentInteraction describes a component interaction for the app
// logs, e.g. `alex đã chọn "VPS" trong menu "Chọn sản phẩm"`. Only IDs and
// configured labels are included, never message contents.
func describeComponentInteraction(i *discord.InteractionEvent, comp *message.ComponentData) string {
	user := "Người dùng"
	if sender := i.Sender(); sender != nil {
		user = fmt.Sprintf("%s (%s)", sender.Username, sender.ID)
	}

	data, ok := i.Data.(discord.ComponentInteraction)
	if !ok {
		return ""
	}

	name := string(data.ID())
	if comp != nil {
		switch {
		case comp.Label != "":
			name = comp.Label
		case comp.Placeholder != "":
			name = comp.Placeholder
		}
	}

	if data.Type() == discord.ButtonComponentType {
		return fmt.Sprintf("%s đã bấm nút %q", user, name)
	}

	values := selectInteractionValues(data)
	labels := make([]string, len(values))
	for i, v := range values {
		labels[i] = v
		if comp != nil {
			if o, ok := comp.OptionByValue(v); ok {
				labels[i] = fmt.Sprintf("%s (%s)", o.Label, v)
			}
		}
	}

	if len(labels) == 0 {
		return fmt.Sprintf("%s đã bỏ chọn tất cả trong menu %q", user, name)
	}
	return fmt.Sprintf("%s đã chọn %s trong menu %q", user, strings.Join(labels, ", "), name)
}

func selectInteractionValues(data discord.ComponentInteraction) []string {
	var values []string
	switch d := data.(type) {
	case *discord.StringSelectInteraction:
		values = d.Values
	case *discord.UserSelectInteraction:
		for _, id := range d.Values {
			values = append(values, id.String())
		}
	case *discord.RoleSelectInteraction:
		for _, id := range d.Values {
			values = append(values, id.String())
		}
	case *discord.ChannelSelectInteraction:
		for _, id := range d.Values {
			values = append(values, id.String())
		}
	case *discord.MentionableSelectInteraction:
		for _, id := range d.Values {
			values = append(values, id.String())
		}
	}
	return values
}

// handleModalInteraction continues the flow that opened the modal.
func (a *App) handleModalInteraction(session *state.State, e *gateway.InteractionCreateEvent, d *discord.ModalInteraction) {
	resumePointID, ok := message.DecodeCustomIDModalResumePoint(string(d.CustomID))
	if !ok {
		a.respondComponentUnavailable(session, e, "invalid modal custom ID")
		return
	}

	a.resumeFlow(session, e, resumePointID, nil)
}

// resumeFlow continues a suspended flow from the node its resume point refers
// to. exec is set when resuming because of a component interaction.
func (a *App) resumeFlow(session *state.State, e *gateway.InteractionCreateEvent, resumePointID string, exec *componentExecution) {
	ctx := context.TODO()

	resumePoint, err := a.env.ResumePointStore.ResumePoint(ctx, resumePointID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			a.respondComponentUnavailable(session, e, "resume point not found")
			return
		}

		slog.Error(
			"Failed to get resume point",
			slog.String("app_id", a.id),
			slog.String("resume_point_id", resumePointID),
			slog.String("error", err.Error()),
		)
		respondEphemeral(session, e, componentErrorMessage)
		return
	}

	if resumePoint.ExpiresAt.Valid && resumePoint.ExpiresAt.Time.Before(time.Now().UTC()) {
		a.respondComponentUnavailable(session, e, "resume point expired")
		return
	}

	node, links, err := a.resolveResumePoint(ctx, resumePoint)
	if err != nil {
		if errors.Is(err, errResumeTargetNotFound) {
			a.respondComponentUnavailable(session, e, err.Error())
			return
		}

		slog.Error(
			"Failed to resolve resume point",
			slog.String("app_id", a.id),
			slog.String("resume_point_id", resumePointID),
			slog.String("error", err.Error()),
		)
		respondEphemeral(session, e, componentErrorMessage)
		return
	}

	go a.env.executeComponentFlowEvent(
		context.Background(),
		a.id,
		node,
		session,
		e,
		links,
		&resumePoint.FlowState,
		exec,
	)
}

// resolveResumePoint finds the flow node a resume point continues from, along
// with the entity links of the flow it belongs to. Resume points can be created
// by any flow that sends components or opens a modal: commands, event listeners
// (including custom event subscribers) and component flows of message instances.
func (a *App) resolveResumePoint(ctx context.Context, rp *model.ResumePoint) (*flow.CompiledFlowNode, entityLinks, error) {
	var root *flow.CompiledFlowNode
	var links entityLinks

	switch {
	case rp.CommandID.Valid:
		a.RLock()
		command, ok := a.commands[rp.CommandID.String]
		a.RUnlock()
		if !ok {
			return nil, entityLinks{}, fmt.Errorf("command %s: %w", rp.CommandID.String, errResumeTargetNotFound)
		}

		root = command.flow
		links = entityLinks{CommandID: rp.CommandID}
	case rp.EventListenerID.Valid:
		a.RLock()
		listener, ok := a.listeners[rp.EventListenerID.String]
		a.RUnlock()
		if !ok {
			return nil, entityLinks{}, fmt.Errorf("event listener %s: %w", rp.EventListenerID.String, errResumeTargetNotFound)
		}

		root = listener.flow
		links = entityLinks{EventListenerID: rp.EventListenerID}
	case rp.ScheduleID.Valid:
		if a.env.ScheduleStore == nil {
			return nil, entityLinks{}, fmt.Errorf("schedule store is not configured")
		}

		schedule, err := a.env.ScheduleStore.Schedule(ctx, rp.ScheduleID.String)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return nil, entityLinks{}, fmt.Errorf("schedule %s: %w", rp.ScheduleID.String, errResumeTargetNotFound)
			}
			return nil, entityLinks{}, fmt.Errorf("failed to get schedule: %w", err)
		}

		compiled, err := flow.CompileSchedule(schedule.FlowSource)
		if err != nil {
			return nil, entityLinks{}, fmt.Errorf("failed to compile schedule flow: %w", err)
		}

		root = compiled
		links = entityLinks{ScheduleID: rp.ScheduleID}
	case rp.MessageInstanceID.Valid:
		instanceModel, err := a.env.MessageInstanceStore.MessageInstance(
			ctx,
			rp.MessageID.String,
			uint64(rp.MessageInstanceID.Int64),
		)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return nil, entityLinks{}, fmt.Errorf("message instance %d: %w", rp.MessageInstanceID.Int64, errResumeTargetNotFound)
			}
			return nil, entityLinks{}, fmt.Errorf("failed to get message instance: %w", err)
		}

		instance, err := NewMessageInstance(a.id, instanceModel, a.env)
		if err != nil {
			return nil, entityLinks{}, fmt.Errorf("failed to create message instance: %w", err)
		}

		targetFlow, ok := instance.Flow(rp.FlowSourceID.String)
		if !ok {
			return nil, entityLinks{}, fmt.Errorf("flow source %s: %w", rp.FlowSourceID.String, errResumeTargetNotFound)
		}

		root = targetFlow
		links = instance.links(rp.FlowSourceID.String)
	default:
		// e.g. resume points of scheduled flows created before schedule_id was
		// tracked, or whose owner was deleted (the link is set to NULL).
		return nil, entityLinks{}, fmt.Errorf("resume point has no resumable owner: %w", errResumeTargetNotFound)
	}

	node := root.FindChildWithID(rp.FlowNodeID, true)
	if node == nil {
		return nil, entityLinks{}, fmt.Errorf("flow node %s: %w", rp.FlowNodeID, errResumeTargetNotFound)
	}

	return node, links, nil
}

func (a *App) respondComponentUnavailable(session *state.State, e *gateway.InteractionCreateEvent, reason string) {
	slog.Info(
		"Interaction target is no longer available",
		slog.String("app_id", a.id),
		slog.String("interaction_id", e.ID.String()),
		slog.String("reason", reason),
	)
	respondEphemeral(session, e, componentUnavailableMessage)
}

func respondEphemeral(session *state.State, e *gateway.InteractionCreateEvent, content string) {
	err := session.RespondInteraction(e.ID, e.Token, api.InteractionResponse{
		Type: api.MessageInteractionWithSource,
		Data: &api.InteractionResponseData{
			Content: option.NewNullableString(content),
			Flags:   discord.EphemeralMessage,
		},
	})
	if err != nil {
		slog.Warn(
			"Failed to respond to interaction",
			slog.String("interaction_id", e.ID.String()),
			slog.String("error", err.Error()),
		)
	}
}
