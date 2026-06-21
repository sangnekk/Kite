package ai

import (
	"encoding/json"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type AIHandler struct {
	modelRegistry     *provider.AIModelRegistry
	usageStore        store.UsageStore
	conversationStore store.AIConversationStore
}

func NewAIHandler(
	modelRegistry *provider.AIModelRegistry,
	usageStore store.UsageStore,
	conversationStore store.AIConversationStore,
) *AIHandler {
	return &AIHandler{
		modelRegistry:     modelRegistry,
		usageStore:        usageStore,
		conversationStore: conversationStore,
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

// isJSONNull reports whether a raw JSON message is the literal null.
func isJSONNull(raw json.RawMessage) bool {
	return strings.TrimSpace(string(raw)) == "null"
}
