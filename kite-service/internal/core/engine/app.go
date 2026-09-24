package engine

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

type App struct {
	sync.RWMutex

	id string

	env Env

	pluginInstances map[string]*pluginInstance
	commands        map[string]*Command
	listeners       map[string]*EventListener
	interactions    *interactionDeduper
	// TODO?: Cache messages (LRUCache<*MessageInstance>)

	settingsCache   *model.AppSettings
	settingsCacheAt time.Time
}

func NewApp(
	id string,
	stores Env,
) *App {
	return &App{
		id:              id,
		env:             stores,
		commands:        make(map[string]*Command),
		listeners:       make(map[string]*EventListener),
		interactions:    newInteractionDeduper(interactionDedupeTTL),
		pluginInstances: make(map[string]*pluginInstance),
	}
}

func (a *App) AddPluginInstance(pluginInstance *model.PluginInstance) {
	plugin := a.env.PluginRegistry.Plugin(pluginInstance.PluginID)
	if plugin == nil {
		slog.Warn(
			"Unknown plugin",
			slog.String("plugin_id", pluginInstance.PluginID),
		)
		return
	}

	a.Lock()
	existing := a.pluginInstances[pluginInstance.ID]
	a.Unlock()

	if existing != nil {
		err := existing.Update(context.TODO(), pluginInstance)
		if err != nil {
			slog.With("error", err).Error("failed to update plugin instance")
			return
		}
	} else {
		instance, err := plugin.Instance(context.TODO(), a.id, pluginInstance.Config)
		if err != nil {
			slog.With("error", err).Error("failed to create module instance")
			return
		}

		a.Lock()
		a.pluginInstances[pluginInstance.ID] = newPluginInstance(
			pluginInstance,
			plugin,
			instance,
			a.env,
		)
		a.Unlock()
	}

	a.Lock()
	defer a.Unlock()
}

func (a *App) RemoveDanglingPluginInstances(pluginInstanceIDs []string) {
	pluginInstanceIDMap := make(map[string]struct{}, len(pluginInstanceIDs))
	for _, pluginInstanceID := range pluginInstanceIDs {
		pluginInstanceIDMap[pluginInstanceID] = struct{}{}
	}

	a.Lock()
	defer a.Unlock()

	for pluginInstanceID, pluginInstance := range a.pluginInstances {
		if _, ok := pluginInstanceIDMap[pluginInstanceID]; !ok {
			err := pluginInstance.Close()
			if err != nil {
				slog.With("error", err).Error("failed to close plugin instance")
			}

			delete(a.pluginInstances, pluginInstanceID)
		}
	}
}

func (a *App) AddCommand(cmd *model.Command) {
	command, err := NewCommand(
		cmd,
		a.env,
	)
	if err != nil {
		slog.With("error", err).Error("failed to create command")
		return
	}

	lockStart := time.Now()
	a.Lock()
	defer a.Unlock()
	lockDiff := time.Since(lockStart)
	if lockDiff > 500*time.Millisecond {
		slog.Warn(
			"Locking app for adding command took too long",
			slog.String("app_id", a.id),
			slog.String("lock_duration", lockDiff.String()),
		)
	}

	a.commands[cmd.ID] = command
}

func (a *App) RemoveDanglingCommands(commandIDs []string) {
	commandIDMap := make(map[string]struct{}, len(commandIDs))
	for _, commandID := range commandIDs {
		commandIDMap[commandID] = struct{}{}
	}

	a.Lock()
	defer a.Unlock()

	for cmdID := range a.commands {
		if _, ok := commandIDMap[cmdID]; !ok {
			delete(a.commands, cmdID)
		}
	}
}

func (a *App) AddEventListener(listener *model.EventListener) {
	eventListener, err := NewEventListener(
		listener,
		a.env,
	)
	if err != nil {
		slog.With("error", err).Error("failed to create event listener")
		return
	}

	a.Lock()
	defer a.Unlock()

	a.listeners[listener.ID] = eventListener
}

func (a *App) RemoveDanglingEventListeners(listenerIDs []string) {
	listenerIDMap := make(map[string]struct{}, len(listenerIDs))
	for _, listenerID := range listenerIDs {
		listenerIDMap[listenerID] = struct{}{}
	}

	a.Lock()
	defer a.Unlock()

	for listenerID := range a.listeners {
		if _, ok := listenerIDMap[listenerID]; !ok {
			delete(a.listeners, listenerID)
		}
	}
}

func (a *App) HandleEvent(appID string, session *state.State, event gateway.Event) {
	a.dispatchEventToPlugins(session, event)

	switch e := event.(type) {
	case *gateway.InteractionCreateEvent:
		timeDiff := time.Since(e.ID.Time())
		if timeDiff > 500*time.Millisecond {
			slog.Warn(
				"Received interaction event late",
				slog.String("app_id", appID),
				slog.String("interaction_id", e.ID.String()),
				slog.String("time_diff", timeDiff.String()),
			)
		}

		if !a.interactions.FirstSeen(e.ID) {
			slog.Debug(
				"Ignoring duplicate interaction",
				slog.String("app_id", appID),
				slog.String("interaction_id", e.ID.String()),
			)
			return
		}

		switch d := e.Data.(type) {
		case *discord.CommandInteraction:
			fullName := getFullCommandName(d)

			lockStart := time.Now()
			a.RLock()
			defer a.RUnlock()
			lockDiff := time.Since(lockStart)
			if lockDiff > 100*time.Millisecond {
				slog.Warn(
					"Locking app took too long",
					slog.String("app_id", appID),
					slog.String("lock_duration", lockDiff.String()),
				)
			}

			for _, command := range a.commands {
				if command.cmd.Name == fullName {
					go command.HandleEvent(appID, session, event)
					break
				}
			}
		case *discord.ModalInteraction:
			a.handleModalInteraction(session, e, d)
		case discord.ComponentInteraction:
			// Buttons and all select menu types.
			a.handleComponentInteraction(session, e, d)
		}
	default:
		// Prefix/mention text commands are triggered by message create events,
		// in addition to any matching event listeners.
		if msgEvent, ok := event.(*gateway.MessageCreateEvent); ok {
			a.handlePrefixCommand(appID, session, msgEvent)
		}

		eventType := model.EventTypeFromDiscordEventType(e.EventType())

		a.RLock()
		defer a.RUnlock()

		for _, listener := range a.listeners {
			if listener.listener.Source != model.EventSourceDiscord {
				continue
			}

			if listener.listener.Type != eventType {
				continue
			}

			go listener.HandleEvent(appID, session, event)
		}
	}
}

func (a *App) HandleWebhookEvent(appID string, source model.WebhookIntegrationType, payload json.RawMessage) {
	eventSource := source.EventSource()

	a.RLock()
	defer a.RUnlock()

	for _, listener := range a.listeners {
		if listener.listener.Source != eventSource {
			continue
		}
		go listener.HandleWebhookEvent(appID, payload)
	}
}

func getFullCommandName(d *discord.CommandInteraction) string {
	fullName := d.Name
	for _, option := range d.Options {
		if option.Type == discord.SubcommandOptionType {
			fullName += " " + option.Name
			break
		} else if option.Type == discord.SubcommandGroupOptionType {
			fullName += " " + option.Name
			for _, subOption := range option.Options {
				fullName += " " + subOption.Name
			}
			break
		}
	}

	return fullName
}
