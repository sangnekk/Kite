package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

// flowAssistMaxTokens bounds the generated flow JSON. Whole-flow generation can
// be large, so this is well above the per-node chat cap.
const flowAssistMaxTokens = 8000

// HandleFlowAssist runs one turn of the flow copilot: it asks the model to
// produce an updated flow from the user's instruction and the current flow, and
// returns the assistant's message together with the flow to apply.
func (h *AIHandler) HandleFlowAssist(c *handler.Context, req wire.FlowAssistRequest) (*wire.FlowAssistResponse, error) {
	if !h.aiConfigured() {
		return nil, handler.ErrBadRequest(
			"ai_not_configured",
			"No AI provider is configured on this server.",
		)
	}

	if strings.TrimSpace(req.Message) == "" {
		return nil, handler.ErrBadRequest("invalid_message", "Message must not be empty.")
	}

	prompt := buildFlowAssistUserPrompt(req)

	raw, err := h.ai.CreateResponse(c.Context(), provider.CreateResponseOpts{
		Model:           req.Model,
		SystemPrompt:    flowAssistSystemPrompt,
		Prompt:          prompt,
		MaxOutputTokens: flowAssistMaxTokens,
	})
	if err != nil {
		return nil, handler.ErrInternal(fmt.Sprintf("AI request failed: %s", err))
	}

	parsed, err := parseFlowAssistOutput(raw)
	if err != nil {
		// The model didn't return the expected JSON; surface its text instead
		// of failing, so the user still sees a reply.
		return &wire.FlowAssistResponse{Message: strings.TrimSpace(raw)}, nil
	}

	res := &wire.FlowAssistResponse{Message: parsed.Message}

	if len(parsed.Flow) > 0 && !isJSONNull(parsed.Flow) {
		if err := validateFlow(parsed.Flow); err != nil {
			// Keep the explanation but don't apply a flow that would break the
			// editor; tell the user it couldn't be applied.
			res.Message = strings.TrimSpace(parsed.Message + "\n\n(Không thể áp dụng: flow tạo ra không hợp lệ.)")
			return res, nil
		}
		res.Flow = parsed.Flow
	}

	return res, nil
}

func buildFlowAssistUserPrompt(req wire.FlowAssistRequest) string {
	var b strings.Builder

	b.WriteString(flowAssistExample)
	b.WriteString("\n\n")

	if len(req.History) > 0 {
		b.WriteString("Conversation so far:\n")
		for _, m := range req.History {
			role := m.Role
			if role == "" {
				role = "user"
			}
			b.WriteString(role)
			b.WriteString(": ")
			b.WriteString(m.Content)
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	b.WriteString("Current flow (edit this; empty means start fresh):\n")
	if len(req.Flow) > 0 && !isJSONNull(req.Flow) {
		b.Write(req.Flow)
	} else {
		b.WriteString(`{"nodes":[],"edges":[]}`)
	}
	b.WriteString("\n\n")

	b.WriteString("User request: ")
	b.WriteString(req.Message)

	return b.String()
}

type flowAssistOutput struct {
	Message string          `json:"message"`
	Flow    json.RawMessage `json:"flow"`
}

// parseFlowAssistOutput extracts the {message, flow} object from the model
// output, tolerating markdown code fences and surrounding prose.
func parseFlowAssistOutput(raw string) (*flowAssistOutput, error) {
	cleaned := stripCodeFences(raw)

	start := strings.Index(cleaned, "{")
	end := strings.LastIndex(cleaned, "}")
	if start == -1 || end == -1 || end < start {
		return nil, fmt.Errorf("no json object found")
	}

	var out flowAssistOutput
	if err := json.Unmarshal([]byte(cleaned[start:end+1]), &out); err != nil {
		return nil, err
	}

	return &out, nil
}

func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	// Drop the opening fence line (``` or ```json) and the trailing fence.
	if i := strings.IndexByte(s, '\n'); i != -1 {
		s = s[i+1:]
	}
	s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	return strings.TrimSpace(s)
}

func validateFlow(raw json.RawMessage) error {
	var data flow.FlowData
	if err := json.Unmarshal(raw, &data); err != nil {
		return err
	}
	return data.Validate()
}

func isJSONNull(raw json.RawMessage) bool {
	return strings.TrimSpace(string(raw)) == "null"
}
