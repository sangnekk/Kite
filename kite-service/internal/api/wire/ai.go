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
}

type FlowAssistMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// FlowAssistResponse carries the assistant's reply and the updated flow the
// editor should apply. Flow is nil when the assistant only replied with text.
type FlowAssistResponse struct {
	Message string          `json:"message"`
	Flow    json.RawMessage `json:"flow,omitempty"`
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
