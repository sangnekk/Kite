package flowhandler

import (
	"encoding/json"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
)

type FlowHandler struct{}

func NewFlowHandler() *FlowHandler {
	return &FlowHandler{}
}

// HandleFlowValidate validates a flow graph (data + connectivity + compile) and
// returns the first problem found. Validation failures are returned as a 200
// with valid=false so callers (e.g. the AI service) get a structured result to
// act on, rather than an HTTP error.
func (h *FlowHandler) HandleFlowValidate(c *handler.Context, req wire.FlowValidateRequest) (*wire.FlowValidateResponse, error) {
	var data flow.FlowData
	if err := json.Unmarshal(req.Flow, &data); err != nil {
		return &wire.FlowValidateResponse{Valid: false, Error: "invalid flow json: " + err.Error()}, nil
	}

	if err := flow.ValidateForEditor(data); err != nil {
		return &wire.FlowValidateResponse{Valid: false, Error: err.Error()}, nil
	}

	return &wire.FlowValidateResponse{Valid: true}, nil
}
