package access

import (
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type AccessManager struct {
	appStore                store.AppStore
	commandStore            store.CommandStore
	variableStore           store.VariableStore
	messageStore            store.MessageStore
	eventListenerStore      store.EventListenerStore
	pluginInstanceStore     store.PluginInstanceStore
	webhookIntegrationStore store.WebhookIntegrationStore
	planManager             *plan.PlanManager
}

func NewAccessManager(
	appStore store.AppStore,
	commandStore store.CommandStore,
	variableStore store.VariableStore,
	messageStore store.MessageStore,
	eventListenerStore store.EventListenerStore,
	pluginInstanceStore store.PluginInstanceStore,
	webhookIntegrationStore store.WebhookIntegrationStore,
	planManager *plan.PlanManager,
) *AccessManager {
	return &AccessManager{
		appStore:                appStore,
		commandStore:            commandStore,
		variableStore:           variableStore,
		messageStore:            messageStore,
		eventListenerStore:      eventListenerStore,
		pluginInstanceStore:     pluginInstanceStore,
		webhookIntegrationStore: webhookIntegrationStore,
		planManager:             planManager,
	}
}
