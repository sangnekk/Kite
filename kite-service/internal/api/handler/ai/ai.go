package ai

import (
	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type AIHandler struct {
	modelRegistry      *provider.AIModelRegistry
	ai                 provider.AIProvider
	variableStore      store.VariableStore
	messageStore       store.MessageStore
	eventListenerStore store.EventListenerStore
	usageStore         store.UsageStore
}

func NewAIHandler(
	modelRegistry *provider.AIModelRegistry,
	ai provider.AIProvider,
	variableStore store.VariableStore,
	messageStore store.MessageStore,
	eventListenerStore store.EventListenerStore,
	usageStore store.UsageStore,
) *AIHandler {
	return &AIHandler{
		modelRegistry:      modelRegistry,
		ai:                 ai,
		variableStore:      variableStore,
		messageStore:       messageStore,
		eventListenerStore: eventListenerStore,
		usageStore:         usageStore,
	}
}

// HandleAIModelList returns the AI models available for selection in flows.
// Only models whose provider has a usable API key are present, so the list is
// empty when AI is not configured.
func (h *AIHandler) HandleAIModelList(c *handler.Context) (*wire.AIModelListResponse, error) {
	models := h.modelRegistry.List()

	res := make(wire.AIModelListResponse, len(models))
	for i, m := range models {
		res[i] = &wire.AIModel{
			Key:     m.Key,
			Name:    m.Name,
			Credits: m.Credits,
		}
	}

	return &res, nil
}

// aiConfigured reports whether at least one AI model is available.
func (h *AIHandler) aiConfigured() bool {
	return h.ai != nil && h.modelRegistry.Len() > 0
}
