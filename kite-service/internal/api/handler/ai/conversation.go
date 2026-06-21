package ai

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// HandleAIConversationGet returns the saved copilot conversation for a context
// key (?key=...), or an empty array when none exists.
func (h *AIHandler) HandleAIConversationGet(c *handler.Context) (*wire.AIConversationResponse, error) {
	key := strings.TrimSpace(c.Query("key"))
	if key == "" {
		return nil, handler.ErrBadRequest("invalid_key", "key is required")
	}

	messages, err := h.conversationStore.AIConversationMessages(c.Context(), c.App.ID, key)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return &wire.AIConversationResponse{Messages: json.RawMessage("[]")}, nil
		}
		return nil, err
	}

	return &wire.AIConversationResponse{Messages: messages}, nil
}

// HandleAIConversationSave upserts the copilot conversation for a context key.
func (h *AIHandler) HandleAIConversationSave(c *handler.Context, req wire.AIConversationSaveRequest) (*wire.AIConversationResponse, error) {
	key := strings.TrimSpace(req.Key)
	if key == "" {
		return nil, handler.ErrBadRequest("invalid_key", "key is required")
	}

	messages := req.Messages
	if len(messages) == 0 || isJSONNull(messages) {
		messages = json.RawMessage("[]")
	}

	if err := h.conversationStore.UpsertAIConversation(c.Context(), c.App.ID, key, messages); err != nil {
		return nil, err
	}

	return &wire.AIConversationResponse{Messages: messages}, nil
}

// HandleAIConversationDelete clears the saved conversation for a context key.
func (h *AIHandler) HandleAIConversationDelete(c *handler.Context) (*wire.Empty, error) {
	key := strings.TrimSpace(c.Query("key"))
	if key == "" {
		return nil, handler.ErrBadRequest("invalid_key", "key is required")
	}

	if err := h.conversationStore.DeleteAIConversation(c.Context(), c.App.ID, key); err != nil {
		return nil, err
	}

	return &wire.Empty{}, nil
}
