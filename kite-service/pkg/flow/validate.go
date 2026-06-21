package flow

import (
	"fmt"
	"strings"
)

// ValidateGraph catches connection mistakes that make a flow wire up wrong:
// missing/duplicate/multiple entry, edges to unknown nodes, options connected
// backwards, and floating nodes. It complements FlowData.Validate (which only
// checks per-node data) and the compiler (which is lenient about connectivity).
func ValidateGraph(data FlowData) error {
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

// ValidateForEditor runs the full validation an editor/agent should pass before
// applying a flow: per-node data validation, graph connectivity, and a compile
// pass with the entry-appropriate compiler (the runtime's source of truth).
func ValidateForEditor(data FlowData) error {
	if err := data.Validate(); err != nil {
		return err
	}
	if err := ValidateGraph(data); err != nil {
		return err
	}
	return compileForEntry(data)
}

func compileForEntry(data FlowData) error {
	for _, n := range data.Nodes {
		switch n.Type {
		case FlowNodeTypeEntryCommand:
			_, err := CompileCommand(data)
			return err
		case FlowNodeTypeEntryEvent:
			_, err := CompileEventListener(data)
			return err
		case FlowNodeTypeEntryComponentButton:
			_, err := CompileComponentButton(data)
			return err
		}
	}
	return fmt.Errorf("no entry node — add exactly one entry_* node")
}
