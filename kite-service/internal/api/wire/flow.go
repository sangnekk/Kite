package wire

import "encoding/json"

// FlowValidateRequest carries a flow graph to validate (the same FlowData shape
// the editor stores).
type FlowValidateRequest struct {
	Flow json.RawMessage `json:"flow"`
}

// FlowValidateResponse reports whether the flow passes data + connectivity +
// compile validation; Error holds the first problem found (empty when valid).
type FlowValidateResponse struct {
	Valid bool   `json:"valid"`
	Error string `json:"error,omitempty"`
}
