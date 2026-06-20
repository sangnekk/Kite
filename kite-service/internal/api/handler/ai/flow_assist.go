package ai

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

const (
	// flowAssistMaxTokens bounds the generated flow JSON per step.
	flowAssistMaxTokens = 8000
	// flowAssistMaxSteps bounds the agent's tool loop per turn.
	flowAssistMaxSteps = 6
)

// agentAction is one JSON action emitted by the model: either a tool call
// (Tool + Args) or a final answer (tool == "finish", with Message + Flow).
type agentAction struct {
	Tool    string          `json:"tool"`
	Args    json.RawMessage `json:"args"`
	Message string          `json:"message"`
	Flow    json.RawMessage `json:"flow"`
}

// HandleFlowAssist runs one turn of the flow copilot as a JSON-action tool loop:
// the model may create resources (routed through the same plan-limit checks as
// manual creation) before finishing with the updated flow.
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

	cost := h.turnCreditCost(req.Model)
	if err := h.checkAIQuota(c, cost); err != nil {
		return nil, err
	}

	transcript := buildFlowAssistUserPrompt(req)
	actions := []wire.FlowAssistAction{}
	charged := false

	for range flowAssistMaxSteps {
		raw, err := h.ai.CreateResponse(c.Context(), provider.CreateResponseOpts{
			Model:           req.Model,
			SystemPrompt:    flowAssistSystemPrompt,
			Prompt:          transcript,
			MaxOutputTokens: flowAssistMaxTokens,
		})
		if err != nil {
			return nil, handler.ErrInternal(fmt.Sprintf("AI request failed: %s", err))
		}

		// Charge the model's credit cost the first time it responds this turn.
		if !charged {
			h.chargeAIUsage(c, cost)
			charged = true
		}

		action, err := parseAgentAction(raw)
		if err != nil {
			// Not the expected JSON; surface the model's text so the user still
			// gets a reply.
			return &wire.FlowAssistResponse{Message: strings.TrimSpace(raw), Actions: actions}, nil
		}

		switch action.Tool {
		case "finish", "":
			// Text-only finish (clarification / no flow change).
			if len(action.Flow) == 0 || isJSONNull(action.Flow) {
				return &wire.FlowAssistResponse{Message: action.Message, Actions: actions}, nil
			}
			// Validate the flow with the real rules; on failure, feed the error
			// back so the model self-corrects instead of returning a broken flow.
			if verr := validateFlowComplete(action.Flow); verr != nil {
				actions = append(actions, wire.FlowAssistAction{
					Tool:    "validate_flow",
					Summary: "flow chưa hợp lệ: " + verr.Error(),
					OK:      false,
				})
				transcript += fmt.Sprintf(
					"\n\nThe flow you returned is INVALID: %s\nFix the nodes/edges (check the connection rules) and call finish again with a corrected flow.\nContinue.",
					verr.Error(),
				)
				continue
			}
			return &wire.FlowAssistResponse{Message: action.Message, Flow: action.Flow, Actions: actions}, nil
		case "create_variable":
			obs, ok := h.toolCreateVariable(c, action.Args)
			actions = append(actions, wire.FlowAssistAction{Tool: action.Tool, Summary: obs, OK: ok})
			transcript += toolFeedback("create_variable", action.Args, obs)
		case "create_message":
			obs, ok := h.toolCreateMessage(c, action.Args)
			actions = append(actions, wire.FlowAssistAction{Tool: action.Tool, Summary: obs, OK: ok})
			transcript += toolFeedback("create_message", action.Args, obs)
		case "create_event_listener":
			obs, ok := h.toolCreateEventListener(c, action.Args)
			actions = append(actions, wire.FlowAssistAction{Tool: action.Tool, Summary: obs, OK: ok})
			transcript += toolFeedback("create_event_listener", action.Args, obs)
		default:
			obs := fmt.Sprintf("error: unknown tool %q", action.Tool)
			transcript += toolFeedback(action.Tool, action.Args, obs)
		}
	}

	return &wire.FlowAssistResponse{
		Message: "Mình chưa hoàn tất được trong giới hạn số bước. Bạn thử mô tả ngắn gọn hơn nhé.",
		Actions: actions,
	}, nil
}

// validateFlowComplete checks the agent's flow with the same rules the runtime
// uses: node data validation plus graph connectivity (entry node, edge targets,
// option direction, no floating nodes).
func validateFlowComplete(raw json.RawMessage) error {
	var data flow.FlowData
	if err := json.Unmarshal(raw, &data); err != nil {
		return err
	}
	if err := data.Validate(); err != nil {
		return err
	}
	return validateFlowGraph(data)
}

// validateFlowGraph catches the connection mistakes that make a flow wire up
// wrong: missing/duplicate entry, edges to unknown nodes, options connected
// backwards, and floating nodes.
func validateFlowGraph(data flow.FlowData) error {
	if len(data.Nodes) == 0 {
		return fmt.Errorf("flow has no nodes")
	}

	nodeType := make(map[string]string, len(data.Nodes))
	entryCount := 0
	for _, n := range data.Nodes {
		if _, dup := nodeType[n.ID]; dup {
			return fmt.Errorf("duplicate node id %q", n.ID)
		}
		nodeType[n.ID] = string(n.Type)
		if strings.HasPrefix(string(n.Type), "entry_") {
			entryCount++
		}
	}
	if entryCount == 0 {
		return fmt.Errorf("no entry node — add exactly one entry_* node")
	}
	if entryCount > 1 {
		return fmt.Errorf("found %d entry nodes, need exactly one", entryCount)
	}

	connected := make(map[string]bool, len(data.Nodes))
	for _, e := range data.Edges {
		srcType, ok := nodeType[e.Source]
		if !ok {
			return fmt.Errorf("an edge references unknown source node %q", e.Source)
		}
		dstType, ok := nodeType[e.Target]
		if !ok {
			return fmt.Errorf("an edge references unknown target node %q", e.Target)
		}
		connected[e.Source] = true
		connected[e.Target] = true

		if strings.HasPrefix(srcType, "option_") && !strings.HasPrefix(dstType, "entry_") {
			return fmt.Errorf("option node %q must connect to the entry node (source=option, target=entry)", e.Source)
		}
		if strings.HasPrefix(srcType, "entry_") && strings.HasPrefix(dstType, "option_") {
			return fmt.Errorf("option node %q is connected backwards; use source=option, target=entry", e.Target)
		}
	}

	if len(data.Nodes) > 1 {
		for id, t := range nodeType {
			if !connected[id] {
				return fmt.Errorf("node %q (%s) is not connected to anything", id, t)
			}
		}
	}

	return nil
}

func (h *AIHandler) toolCreateVariable(c *handler.Context, args json.RawMessage) (string, bool) {
	var a struct {
		Name   string `json:"name"`
		Scoped bool   `json:"scoped"`
	}
	_ = json.Unmarshal(args, &a)
	if strings.TrimSpace(a.Name) == "" {
		return "error: variable name is required", false
	}

	if c.Features.MaxVariables != 0 {
		count, err := h.variableStore.CountVariablesByApp(c.Context(), c.App.ID)
		if err != nil {
			return "error: failed to count variables", false
		}
		if count >= c.Features.MaxVariables {
			return fmt.Sprintf("error: variable limit (%d) reached for this plan", c.Features.MaxVariables), false
		}
	}

	now := time.Now().UTC()
	v, err := h.variableStore.CreateVariable(c.Context(), &model.Variable{
		ID:        util.UniqueID(),
		Name:      a.Name,
		Scoped:    a.Scoped,
		AppID:     c.App.ID,
		CreatedAt: now,
		UpdatedAt: now,
	})
	if err != nil {
		return "error: failed to create variable", false
	}

	return fmt.Sprintf("created variable id=%s name=%s — use this id as variable_id", v.ID, v.Name), true
}

func (h *AIHandler) toolCreateMessage(c *handler.Context, args json.RawMessage) (string, bool) {
	var a struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	_ = json.Unmarshal(args, &a)
	if strings.TrimSpace(a.Name) == "" {
		return "error: message name is required", false
	}

	if c.Features.MaxMessages != 0 {
		count, err := h.messageStore.CountMessagesByApp(c.Context(), c.App.ID)
		if err != nil {
			return "error: failed to count messages", false
		}
		if count >= c.Features.MaxMessages {
			return fmt.Sprintf("error: message limit (%d) reached for this plan", c.Features.MaxMessages), false
		}
	}

	now := time.Now().UTC()
	m, err := h.messageStore.CreateMessage(c.Context(), &model.Message{
		ID:            util.UniqueID(),
		Name:          a.Name,
		AppID:         c.App.ID,
		CreatorUserID: c.Session.UserID,
		Data:          message.MessageData{Content: a.Content},
		FlowSources:   map[string]flow.FlowData{},
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err != nil {
		return "error: failed to create message template", false
	}

	return fmt.Sprintf("created message template id=%s name=%s — use this id as message_template_id", m.ID, m.Name), true
}

func (h *AIHandler) toolCreateEventListener(c *handler.Context, args json.RawMessage) (string, bool) {
	var a struct {
		Flow json.RawMessage `json:"flow"`
	}
	_ = json.Unmarshal(args, &a)
	if len(a.Flow) == 0 || isJSONNull(a.Flow) {
		return "error: an event listener needs a flow starting with an entry_event node", false
	}

	var flowData flow.FlowData
	if err := json.Unmarshal(a.Flow, &flowData); err != nil {
		return "error: invalid flow json", false
	}
	if err := flowData.Validate(); err != nil {
		return "error: invalid flow data: " + err.Error(), false
	}
	if err := validateFlowGraph(flowData); err != nil {
		return "error: " + err.Error(), false
	}

	eventFlow, err := flow.CompileEventListener(flowData)
	if err != nil {
		return "error: the flow must start with an entry_event node (" + err.Error() + ")", false
	}

	if c.Features.MaxEventListeners != 0 {
		count, err := h.eventListenerStore.CountEventListenersByApp(c.Context(), c.App.ID)
		if err != nil {
			return "error: failed to count event listeners", false
		}
		if count >= c.Features.MaxEventListeners {
			return fmt.Sprintf("error: event listener limit (%d) reached for this plan", c.Features.MaxEventListeners), false
		}
	}

	now := time.Now().UTC()
	el, err := h.eventListenerStore.CreateEventListener(c.Context(), &model.EventListener{
		ID:            util.UniqueID(),
		AppID:         c.App.ID,
		CreatorUserID: c.Session.UserID,
		Source:        model.EventSourceDiscord,
		Type:          model.EventListenerType(eventFlow.EventListenerType()),
		Description:   eventFlow.EventDescription(),
		FlowSource:    flowData,
		Enabled:       true,
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err != nil {
		return "error: failed to create event listener", false
	}

	return fmt.Sprintf("created event listener id=%s for the %q event", el.ID, el.Type), true
}

func toolFeedback(tool string, args json.RawMessage, observation string) string {
	return fmt.Sprintf("\n\nYou called tool %q with args %s\nResult: %s\nContinue.", tool, string(args), observation)
}

func buildFlowAssistUserPrompt(req wire.FlowAssistRequest) string {
	var b strings.Builder

	if len(req.NodeCatalog) > 0 {
		b.WriteString("Full list of available blocks you may use (type — name — fields). The catalog above details the common ones; for any block here that isn't detailed, infer its data from the field names:\n")
		for _, n := range req.NodeCatalog {
			b.WriteString("- ")
			b.WriteString(n.Type)
			b.WriteString(" — ")
			b.WriteString(n.Name)
			if len(n.Fields) > 0 {
				b.WriteString(" — fields: ")
				b.WriteString(strings.Join(n.Fields, ", "))
			}
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

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

// parseAgentAction extracts the JSON action object from the model output,
// tolerating markdown code fences and surrounding prose.
func parseAgentAction(raw string) (*agentAction, error) {
	cleaned := stripCodeFences(raw)

	start := strings.Index(cleaned, "{")
	end := strings.LastIndex(cleaned, "}")
	if start == -1 || end == -1 || end < start {
		return nil, fmt.Errorf("no json object found")
	}

	var out agentAction
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
