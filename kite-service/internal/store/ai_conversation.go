package store

import "context"

// AIConversationStore persists the AI copilot chat history per app + context
// (e.g. the command/event/message being edited). Messages are stored as an
// opaque JSON blob (the editor's UIMessage[]).
type AIConversationStore interface {
	// AIConversationMessages returns the stored messages blob, or ErrNotFound
	// when no conversation exists yet.
	AIConversationMessages(ctx context.Context, appID, contextKey string) ([]byte, error)
	UpsertAIConversation(ctx context.Context, appID, contextKey string, messages []byte) error
	DeleteAIConversation(ctx context.Context, appID, contextKey string) error
}
