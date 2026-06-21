package store

import (
	"context"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

// AIConversationStore persists AI chat conversations. Multiple conversations
// exist per app, grouped by context_key (e.g. "studio" or a flow editor route),
// each with its own id + title so the UI can list and continue past chats.
type AIConversationStore interface {
	AIConversationsByContext(ctx context.Context, appID, contextKey string) ([]*model.AIConversationSummary, error)
	// AIConversation returns a full conversation, or ErrNotFound.
	AIConversation(ctx context.Context, appID, id string) (*model.AIConversation, error)
	UpsertAIConversation(ctx context.Context, conv *model.AIConversation) error
	DeleteAIConversation(ctx context.Context, appID, id string) error
}
