package engine

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

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
		a.resumeFlow(session, e, resumePointID)
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

	go instance.HandleComponent(session, e, customID, targetFlow)
}

// handleModalInteraction continues the flow that opened the modal.
func (a *App) handleModalInteraction(session *state.State, e *gateway.InteractionCreateEvent, d *discord.ModalInteraction) {
	resumePointID, ok := message.DecodeCustomIDModalResumePoint(string(d.CustomID))
	if !ok {
		a.respondComponentUnavailable(session, e, "invalid modal custom ID")
		return
	}

	a.resumeFlow(session, e, resumePointID)
}

// resumeFlow continues a suspended flow from the node its resume point refers to.
func (a *App) resumeFlow(session *state.State, e *gateway.InteractionCreateEvent, resumePointID string) {
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

	go a.env.executeFlowEvent(
		context.Background(),
		a.id,
		node,
		session,
		e,
		links,
		&resumePoint.FlowState,
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
		// e.g. resume points created by scheduled flows, which aren't linked to
		// an entity that can be resumed.
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
