package ai

import (
	"testing"

	"github.com/kitecloud/kite/kite-service/pkg/flow"
)

func TestValidateFlowGraph(t *testing.T) {
	node := func(id string, t flow.FlowNodeType) flow.FlowNode {
		return flow.FlowNode{ID: id, Type: t}
	}
	edge := func(id, src, dst string) flow.FlowEdge {
		return flow.FlowEdge{ID: id, Source: src, Target: dst}
	}

	cases := []struct {
		name    string
		data    flow.FlowData
		wantErr bool
	}{
		{
			name: "valid linear",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{
					node("n1", flow.FlowNodeTypeEntryCommand),
					node("n2", flow.FlowNodeTypeActionResponseCreate),
				},
				Edges: []flow.FlowEdge{edge("e1", "n1", "n2")},
			},
		},
		{
			name: "valid option into entry",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{
					node("n1", flow.FlowNodeTypeEntryCommand),
					node("o1", flow.FlowNodeTypeOptionCommandArgument),
					node("n2", flow.FlowNodeTypeActionResponseCreate),
				},
				Edges: []flow.FlowEdge{edge("e1", "o1", "n1"), edge("e2", "n1", "n2")},
			},
		},
		{
			name: "option connected backwards",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{
					node("n1", flow.FlowNodeTypeEntryCommand),
					node("o1", flow.FlowNodeTypeOptionCommandArgument),
				},
				Edges: []flow.FlowEdge{edge("e1", "n1", "o1")},
			},
			wantErr: true,
		},
		{
			name: "floating node",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{
					node("n1", flow.FlowNodeTypeEntryCommand),
					node("n2", flow.FlowNodeTypeActionResponseCreate),
				},
				Edges: []flow.FlowEdge{},
			},
			wantErr: true,
		},
		{
			name: "no entry",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{node("n2", flow.FlowNodeTypeActionResponseCreate)},
			},
			wantErr: true,
		},
		{
			name: "duplicate id",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{
					node("n1", flow.FlowNodeTypeEntryCommand),
					node("n1", flow.FlowNodeTypeActionResponseCreate),
				},
			},
			wantErr: true,
		},
		{
			name: "edge to unknown node",
			data: flow.FlowData{
				Nodes: []flow.FlowNode{node("n1", flow.FlowNodeTypeEntryCommand)},
				Edges: []flow.FlowEdge{edge("e1", "n1", "ghost")},
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateFlowGraph(tc.data)
			if tc.wantErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestParseAgentAction(t *testing.T) {
	cases := []struct {
		name      string
		raw       string
		wantTool  string
		wantMsg   string
		wantFlow  bool
		wantError bool
	}{
		{
			name:     "finish with flow",
			raw:      `{"tool":"finish","message":"hi","flow":{"nodes":[],"edges":[]}}`,
			wantTool: "finish",
			wantMsg:  "hi",
			wantFlow: true,
		},
		{
			name:     "fenced tool call",
			raw:      "```json\n{\"tool\":\"create_variable\",\"args\":{\"name\":\"counter\"}}\n```",
			wantTool: "create_variable",
		},
		{
			name:     "prose around json",
			raw:      "Sure!\n{\"tool\":\"finish\",\"message\":\"done\"}\nHope that helps",
			wantTool: "finish",
			wantMsg:  "done",
		},
		{
			name:      "no json",
			raw:       "I can't help with that",
			wantError: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, err := parseAgentAction(tc.raw)
			if tc.wantError {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if out.Tool != tc.wantTool {
				t.Errorf("tool = %q, want %q", out.Tool, tc.wantTool)
			}
			if out.Message != tc.wantMsg {
				t.Errorf("message = %q, want %q", out.Message, tc.wantMsg)
			}
			if got := len(out.Flow) > 0; got != tc.wantFlow {
				t.Errorf("hasFlow = %v, want %v", got, tc.wantFlow)
			}
		})
	}
}

func TestValidateFlowRejectsGarbage(t *testing.T) {
	if err := validateFlow([]byte(`not json`)); err == nil {
		t.Errorf("expected error for invalid json")
	}
	if err := validateFlow([]byte(`{"nodes":[],"edges":[]}`)); err != nil {
		t.Errorf("expected empty flow to validate, got %v", err)
	}
}
