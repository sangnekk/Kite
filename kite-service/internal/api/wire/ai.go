package wire

import (
	"encoding/json"
	"time"
)

// AICreditsResponse reports the app's AI copilot credit budget for today.
type AICreditsResponse struct {
	Included    bool `json:"included"`
	UsedToday   int  `json:"used_today"`
	LimitPerDay int  `json:"limit_per_day"`
	Remaining   int  `json:"remaining"`
}

// AIConsumeCreditRequest asks the server to gate-and-charge one AI turn. Model
// is the registry key whose per-model credit cost is charged.
type AIConsumeCreditRequest struct {
	Model string `json:"model,omitempty"`
}

// AIConsumeCreditResponse reports what was charged and the budget left.
type AIConsumeCreditResponse struct {
	Charged   int `json:"charged"`
	Remaining int `json:"remaining"`
}

// AIConversationSummary is a row in the conversation picker.
type AIConversationSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIConversationListResponse = []*AIConversationSummary

// AIConversationResponse is a full conversation (messages = opaque UIMessage JSON).
type AIConversationResponse struct {
	ID       string          `json:"id"`
	Title    string          `json:"title"`
	Messages json.RawMessage `json:"messages"`
}

// AIConversationUpsertRequest creates/updates a conversation by id.
type AIConversationUpsertRequest struct {
	Context  string          `json:"context"`
	Title    string          `json:"title"`
	Messages json.RawMessage `json:"messages"`
}

// AIModel is one selectable AI model exposed to the flow editor. Only the
// fields a no-code user needs to pick a model are exposed; the upstream model
// spelling and provider routing stay server-side.
type AIModel struct {
	Key     string `json:"key"`
	Name    string `json:"name"`
	Credits int    `json:"credits"`
}

type AIModelListResponse = []*AIModel
