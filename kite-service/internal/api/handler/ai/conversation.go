package ai

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// HandleAIConversationList lists saved conversations for a context (?context=).
func (h *AIHandler) HandleAIConversationList(c *handler.Context) (*wire.AIConversationListResponse, error) {
	contextKey := strings.TrimSpace(c.Query("context"))
	if contextKey == "" {
		return nil, handler.ErrBadRequest("invalid_context", "context is required")
	}

	convs, err := h.conversationStore.AIConversationsByContext(c.Context(), c.App.ID, contextKey)
	if err != nil {
		return nil, err
	}

	res := make(wire.AIConversationListResponse, len(convs))
	for i, conv := range convs {
		res[i] = &wire.AIConversationSummary{
			ID:        conv.ID,
			Title:     conv.Title,
			UpdatedAt: conv.UpdatedAt,
		}
	}
	return &res, nil
}

// HandleAIConversationGet returns one conversation with its messages.
func (h *AIHandler) HandleAIConversationGet(c *handler.Context) (*wire.AIConversationResponse, error) {
	id := c.Param("conversationID")

	conv, err := h.conversationStore.AIConversation(c.Context(), c.App.ID, id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_conversation", "Conversation not found")
		}
		return nil, err
	}

	messages := conv.Messages
	if len(messages) == 0 {
		messages = json.RawMessage("[]")
	}
	return &wire.AIConversationResponse{
		ID:       conv.ID,
		Title:    conv.Title,
		Messages: messages,
	}, nil
}

// HandleAIConversationUpsert creates/updates a conversation by id.
func (h *AIHandler) HandleAIConversationUpsert(c *handler.Context, req wire.AIConversationUpsertRequest) (*wire.AIConversationResponse, error) {
	id := c.Param("conversationID")
	contextKey := strings.TrimSpace(req.Context)
	if contextKey == "" {
		return nil, handler.ErrBadRequest("invalid_context", "context is required")
	}

	messages := req.Messages
	if len(messages) == 0 || isJSONNull(messages) {
		messages = json.RawMessage("[]")
	}

	now := time.Now().UTC()
	if err := h.conversationStore.UpsertAIConversation(c.Context(), &model.AIConversation{
		ID:         id,
		AppID:      c.App.ID,
		ContextKey: contextKey,
		Title:      req.Title,
		Messages:   messages,
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		return nil, err
	}

	return &wire.AIConversationResponse{ID: id, Title: req.Title, Messages: messages}, nil
}

// HandleAIConversationDelete removes a conversation.
func (h *AIHandler) HandleAIConversationDelete(c *handler.Context) (*wire.Empty, error) {
	id := c.Param("conversationID")
	if err := h.conversationStore.DeleteAIConversation(c.Context(), c.App.ID, id); err != nil {
		return nil, err
	}
	return &wire.Empty{}, nil
}
