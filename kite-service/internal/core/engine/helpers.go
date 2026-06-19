package engine

import (
	"context"
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

type Env struct {
	Config               EngineConfig
	AppStore             store.AppStore
	AppSettingsStore     store.AppSettingsStore
	AssetStore           store.AssetStore
	LogStore             store.LogStore
	UsageStore           store.UsageStore
	MessageStore         store.MessageStore
	MessageInstanceStore store.MessageInstanceStore
	CommandStore         store.CommandStore
	EventListenerStore   store.EventListenerStore
	PluginInstanceStore  store.PluginInstanceStore
	PluginValueStore     store.PluginValueStore
	PluginRegistry       *plugin.Registry
	VariableValueStore   store.VariableValueStore
	ResumePointStore     store.ResumePointStore
	HttpClient           *http.Client
	// AIProvider routes AI requests to the upstream that owns each model. Nil
	// when no AI provider is configured, in which case a mock is used.
	AIProvider *AIProvider
	TokenCrypt *util.SymmetricCrypt
}

type entityLinks struct {
	CommandID         null.String
	EventListenerID   null.String
	MessageID         null.String
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

	s.createUsageRecord(appID, fCtx.CreditsUsed(), links)
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
		fCtx.CreditsUsed(),
		links,
	)
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
		CreatedAt:       time.Now().UTC(),
	})
	if err != nil {
		slog.With("error", err).With("app_id", appID).Error("Failed to create log entry from engine")
	}
}

func (s Env) createUsageRecord(appID string, creditsUsed int, links entityLinks) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
	defer cancel()

	start := time.Now()
	err := s.UsageStore.CreateUsageRecord(ctx, model.UsageRecord{
		AppID:           appID,
		Type:            model.UsageRecordTypeCommandFlowExecution,
		CommandID:       links.CommandID,
		EventListenerID: links.EventListenerID,
		MessageID:       links.MessageID,
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
