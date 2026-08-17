package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"gopkg.in/guregu/null.v4"
)

type SessionLookup interface {
	SessionForApp(appID string) *state.State
}

type Env struct {
	Config               EngineConfig
	SessionLookup        SessionLookup
	AppStore             store.AppStore
	AppSettingsStore     store.AppSettingsStore
	AssetStore           store.AssetStore
	LogStore             store.LogStore
	UsageStore           store.UsageStore
	MessageStore         store.MessageStore
	MessageInstanceStore store.MessageInstanceStore
	CommandStore         store.CommandStore
	EventListenerStore   store.EventListenerStore
	CustomEventStore     store.CustomEventStore
	CustomTableStore     store.CustomTableStore
	ScheduleStore        store.ScheduleStore
	PluginInstanceStore  store.PluginInstanceStore
	PluginValueStore     store.PluginValueStore
	PluginRegistry       *plugin.Registry
	VariableValueStore   store.VariableValueStore
	ResumePointStore     store.ResumePointStore
	HttpClient           *http.Client
	// AIProvider routes AI requests to the upstream that owns each model. Nil
	// when no AI provider is configured, in which case a mock is used.
	AIProvider              *AIProvider
	TokenCrypt              *util.SymmetricCrypt
	InternalEventDispatcher InternalEventDispatcher
}

type entityLinks struct {
	CommandID         null.String
	EventListenerID   null.String
	MessageID         null.String
	ScheduleID        null.String
	MessageInstanceID null.Int
	FlowSourceID      null.String // For message templates that have multiple flows
}

func (s Env) flowProviders(appID string, session *state.State, links entityLinks) flow.FlowProviders {
	var aiProvider provider.AIProvider = &provider.MockAIProvider{}
	if s.AIProvider != nil {
		aiProvider = s.AIProvider
	}

	return flow.FlowProviders{
		Discord: NewDiscordProvider(appID, s.AppStore, s.AssetStore, session),
		Log: NewLogProvider(
			appID,
			s.LogStore,
			links,
		),
		HTTP:            NewHTTPProvider(s.HttpClient),
		AI:              aiProvider,
		MessageTemplate: NewMessageTemplateProvider(s.MessageStore, s.MessageInstanceStore),
		Variable:        NewVariableProvider(s.VariableValueStore),
		Economy:         NewEconomyProvider(s.VariableValueStore),
		Cooldown:        NewCooldownProvider(s.VariableValueStore),
		ResumePoint: NewResumePointProvider(
			s.ResumePointStore,
			appID,
			links,
		),
		InternalEvent: NewInternalEventProvider(appID, s.CustomEventStore, s.InternalEventDispatcher),
		CustomTable:   NewCustomTableProvider(appID, s.CustomTableStore),
	}
}

func (s Env) flowContext(
	ctx context.Context,
	appID string,
	session *state.State,
	event gateway.Event,
	links entityLinks,
	state *flow.FlowContextState,
) *flow.FlowContext {
	providers := s.flowProviders(appID, session, links)

	var fCtx *flow.FlowContext

	switch e := event.(type) {
	case *gateway.InteractionCreateEvent:
		fCtx = flow.NewContext(
			ctx,
			30*time.Second,
			&InteractionData{
				interaction: &e.InteractionEvent,
			},
			providers,
			flow.FlowContextLimits{
				MaxStackDepth: s.Config.MaxStackDepth,
				MaxOperations: s.Config.MaxOperations,
				MaxCredits:    s.Config.MaxCredits,
			},
			eval.NewContextFromInteraction(&e.InteractionEvent, session),
			state,
		)
	default:
		fCtx = flow.NewContext(
			ctx,
			30*time.Second,
			&EventData{
				event: event,
			},
			providers,
			flow.FlowContextLimits{
				MaxStackDepth: s.Config.MaxStackDepth,
				MaxOperations: s.Config.MaxOperations,
				MaxCredits:    s.Config.MaxCredits,
			},
			eval.NewContextFromEvent(event, session),
			state,
		)
	}

	return fCtx
}

// executeTextCommand runs a command's flow that was triggered by a text/prefix
// message (instead of a slash command interaction).
func (s Env) executeTextCommand(
	ctx context.Context,
	appID string,
	node *flow.CompiledFlowNode,
	session *state.State,
	event *gateway.MessageCreateEvent,
	args map[string]any,
	links entityLinks,
) {
	defer s.recoverPanic(appID, links)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	providers := s.flowProviders(appID, session, links)
	fCtx := flow.NewContext(
		ctx,
		30*time.Second,
		&PrefixCommandData{event: event},
		providers,
		flow.FlowContextLimits{
			MaxStackDepth: s.Config.MaxStackDepth,
			MaxOperations: s.Config.MaxOperations,
			MaxCredits:    s.Config.MaxCredits,
		},
		eval.NewContextFromTextCommand(event, args, session),
		nil,
	)
	defer fCtx.Cancel()

	if err := node.Execute(fCtx); err != nil {
		s.createLogEntry(
			appID,
			model.LogLevelError,
			fmt.Sprintf("Failed to execute prefix command: %v", err),
			links,
		)
	}

	s.createUsageRecord(appID, model.UsageRecordTypeCommandFlowExecution, fCtx.CreditsUsed(), links)
}

func (s Env) executeFlowEvent(
	ctx context.Context,
	appID string,
	node *flow.CompiledFlowNode,
	session *state.State,
	event gateway.Event,
	links entityLinks,
	state *flow.FlowContextState,
) {
	defer s.recoverPanic(appID, links)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	fCtx := s.flowContext(ctx, appID, session, event, links, state)
	defer fCtx.Cancel()

	shouldExecute, err := node.FilterEvent(fCtx)
	if err != nil {
		s.createLogEntry(
			appID,
			model.LogLevelError,
			fmt.Sprintf("Failed to filter events: %v", err),
			links,
		)
		return
	}

	if !shouldExecute {
		return
	}

	err = node.Execute(fCtx)
	if err != nil {
		s.createLogEntry(
			appID,
			model.LogLevelError,
			fmt.Sprintf("Failed to execute flow event: %v", err),
			links,
		)
	}

	s.createUsageRecord(
		appID,
		model.UsageRecordTypeCommandFlowExecution,
		fCtx.CreditsUsed(),
		links,
	)
}

func (s Env) executeWebhookEvent(
	ctx context.Context,
	appID string,
	node *flow.CompiledFlowNode,
	payload json.RawMessage,
	links entityLinks,
) {
	defer s.recoverPanic(appID, links)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var session *state.State
	if s.SessionLookup != nil {
		session = s.SessionLookup.SessionForApp(appID)
	}

	providers := s.flowProviders(appID, session, links)
	fCtx := flow.NewContext(
		ctx,
		30*time.Second,
		&WebhookEventData{payload: payload},
		providers,
		flow.FlowContextLimits{
			MaxStackDepth: s.Config.MaxStackDepth,
			MaxOperations: s.Config.MaxOperations,
			MaxCredits:    s.Config.MaxCredits,
		},
		eval.NewContextFromWebhookEvent(payload),
		nil,
	)
	defer fCtx.Cancel()

	shouldExecute, err := node.FilterEvent(fCtx)
	if err != nil {
		s.createLogEntry(appID, model.LogLevelError, fmt.Sprintf("Failed to filter webhook event: %v", err), links)
		return
	}
	if !shouldExecute {
		return
	}

	if err := node.Execute(fCtx); err != nil {
		s.createLogEntry(appID, model.LogLevelError, fmt.Sprintf("Failed to execute webhook event: %v", err), links)
	}

	s.createUsageRecord(appID, model.UsageRecordTypeCommandFlowExecution, fCtx.CreditsUsed(), links)
}

// executeScheduledFlow runs a schedule's flow. Like a webhook event there is no
// Discord event or interaction; the flow acts as the bot via the app's session
// (looked up by app id). It is modeled on executeWebhookEvent.
func (s Env) executeScheduledFlow(
	ctx context.Context,
	appID string,
	node *flow.CompiledFlowNode,
	links entityLinks,
) {
	defer s.recoverPanic(appID, links)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var session *state.State
	if s.SessionLookup != nil {
		session = s.SessionLookup.SessionForApp(appID)
	}

	providers := s.flowProviders(appID, session, links)
	fCtx := flow.NewContext(
		ctx,
		30*time.Second,
		&ScheduleData{},
		providers,
		flow.FlowContextLimits{
			MaxStackDepth: s.Config.MaxStackDepth,
			MaxOperations: s.Config.MaxOperations,
			MaxCredits:    s.Config.MaxCredits,
		},
		eval.NewContextForSchedule(session),
		nil,
	)
	defer fCtx.Cancel()

	if err := node.Execute(fCtx); err != nil {
		s.createLogEntry(appID, model.LogLevelError, fmt.Sprintf("Failed to execute scheduled flow: %v", err), links)
	}

	s.createUsageRecord(appID, model.UsageRecordTypeScheduledFlowExecution, fCtx.CreditsUsed(), links)
}

func (s Env) createLogEntry(appID string, level model.LogLevel, message string, links entityLinks) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	// Create log entry which will be displayed in the dashboard
	err := s.LogStore.CreateLogEntry(ctx, model.LogEntry{
		AppID:           appID,
		Level:           level,
		Message:         message,
		CommandID:       links.CommandID,
		EventListenerID: links.EventListenerID,
		MessageID:       links.MessageID,
		ScheduleID:      links.ScheduleID,
		CreatedAt:       time.Now().UTC(),
	})
	if err != nil {
		slog.With("error", err).With("app_id", appID).Error("Failed to create log entry from engine")
	}
}

func (s Env) createUsageRecord(appID string, usageType model.UsageRecordType, creditsUsed int, links entityLinks) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
	defer cancel()

	start := time.Now()
	err := s.UsageStore.CreateUsageRecord(ctx, model.UsageRecord{
		AppID:           appID,
		Type:            usageType,
		CommandID:       links.CommandID,
		EventListenerID: links.EventListenerID,
		MessageID:       links.MessageID,
		ScheduleID:      links.ScheduleID,
		CreditsUsed:     creditsUsed,
		CreatedAt:       time.Now().UTC(),
	})
	duration := time.Since(start)

	if duration > time.Second*10 {
		slog.With("duration", duration).
			With("app_id", appID).
			Warn("Usage record creation took longer than 10 seconds")
	}

	if err != nil {
		slog.With("error", err).With("app_id", appID).Error("Failed to create usage record from engine")
	}
}

func (s Env) recoverPanic(appID string, links entityLinks) {
	if r := recover(); r != nil {
		slog.With("error", r).
			With("app_id", appID).
			With("command_id", links.CommandID.String).
			With("message_id", links.MessageID.String).
			With("event_listener_id", links.EventListenerID.String).
			Error("Recovered from panic in engine handler")
		fmt.Println(fmt.Sprintf("%s", r), "\n", string(debug.Stack()))

		s.createLogEntry(
			appID,
			model.LogLevelError,
			fmt.Sprintf("Recovered from panic: %v", r),
			links,
		)
	}
}
