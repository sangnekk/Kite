package wire

import "encoding/json"

// FlowAssistRequest is a single turn of the flow copilot: the user's
// instruction, the flow currently open in the editor, and prior turns.
type FlowAssistRequest struct {
	Message string              `json:"message"`
	Flow    json.RawMessage     `json:"flow"`
	History []FlowAssistMessage `json:"history,omitempty"`
	// Model optionally overrides the model key; empty uses the server default.
	Model string `json:"model,omitempty"`
	// NodeCatalog is the full set of available blocks, sent by the editor so the
	// assistant knows every node type it can use (kept in sync with the UI).
	NodeCatalog []NodeCatalogEntry `json:"node_catalog,omitempty"`
}

type NodeCatalogEntry struct {
	Type        string   `json:"type"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Fields      []string `json:"fields"`
}

type FlowAssistMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// FlowAssistResponse carries the assistant's reply and the updated flow the
// editor should apply. Flow is nil when the assistant only replied with text.
type FlowAssistResponse struct {
	Message string             `json:"message"`
	Flow    json.RawMessage    `json:"flow,omitempty"`
	Actions []FlowAssistAction `json:"actions,omitempty"`
}

// FlowAssistAction records one resource the agent created (or tried to) during
// the turn, so the UI can show what happened.
type FlowAssistAction struct {
	Tool    string `json:"tool"`
	Summary string `json:"summary"`
	OK      bool   `json:"ok"`
}

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

// AIConversationResponse returns the stored copilot messages (opaque UIMessage
// JSON), or an empty array when there is no saved conversation.
type AIConversationResponse struct {
	Messages json.RawMessage `json:"messages"`
}

// AIConversationSaveRequest persists the copilot messages for a context key.
type AIConversationSaveRequest struct {
	Key      string          `json:"key"`
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
