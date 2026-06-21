package flow

import "testing"

func TestValidateGraph(t *testing.T) {
	node := func(id string, t FlowNodeType) FlowNode {
		return FlowNode{ID: id, Type: t}
	}
	edge := func(id, src, dst string) FlowEdge {
		return FlowEdge{ID: id, Source: src, Target: dst}
	}

	cases := []struct {
		name    string
		data    FlowData
		wantErr bool
	}{
		{
			name: "valid linear",
			data: FlowData{
				Nodes: []FlowNode{
					node("n1", FlowNodeTypeEntryCommand),
					node("n2", FlowNodeTypeActionResponseCreate),
				},
				Edges: []FlowEdge{edge("e1", "n1", "n2")},
			},
		},
		{
			name: "valid option into entry",
			data: FlowData{
				Nodes: []FlowNode{
					node("n1", FlowNodeTypeEntryCommand),
					node("o1", FlowNodeTypeOptionCommandArgument),
					node("n2", FlowNodeTypeActionResponseCreate),
				},
				Edges: []FlowEdge{edge("e1", "o1", "n1"), edge("e2", "n1", "n2")},
			},
		},
		{
			name: "option connected backwards",
			data: FlowData{
				Nodes: []FlowNode{
					node("n1", FlowNodeTypeEntryCommand),
					node("o1", FlowNodeTypeOptionCommandArgument),
				},
				Edges: []FlowEdge{edge("e1", "n1", "o1")},
			},
			wantErr: true,
		},
		{
			name: "floating node",
			data: FlowData{
				Nodes: []FlowNode{
					node("n1", FlowNodeTypeEntryCommand),
					node("n2", FlowNodeTypeActionResponseCreate),
				},
				Edges: []FlowEdge{},
			},
			wantErr: true,
		},
		{
			name: "no entry",
			data: FlowData{
				Nodes: []FlowNode{node("n2", FlowNodeTypeActionResponseCreate)},
			},
			wantErr: true,
		},
		{
			name: "duplicate id",
			data: FlowData{
				Nodes: []FlowNode{
					node("n1", FlowNodeTypeEntryCommand),
					node("n1", FlowNodeTypeActionResponseCreate),
				},
			},
			wantErr: true,
		},
		{
			name: "edge to unknown node",
			data: FlowData{
				Nodes: []FlowNode{node("n1", FlowNodeTypeEntryCommand)},
				Edges: []FlowEdge{edge("e1", "n1", "ghost")},
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateGraph(tc.data)
			if tc.wantErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}
