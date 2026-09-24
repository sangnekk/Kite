package engine

import (
	"context"
	"errors"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"
)

type fakeMessageInstanceStore struct {
	store.MessageInstanceStore

	instance *model.MessageInstance
	err      error
}

func (s *fakeMessageInstanceStore) MessageInstance(ctx context.Context, messageID string, instanceID uint64) (*model.MessageInstance, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.instance == nil || s.instance.MessageID != messageID || s.instance.ID != instanceID {
		return nil, store.ErrNotFound
	}
	return s.instance, nil
}

// testFlowWithMessageNode returns a flow of the given entry type whose entry is
// connected to a message response node with ID "msg".
func testFlowWithMessageNode(entryType flow.FlowNodeType) flow.FlowData {
	return flow.FlowData{
		Nodes: []flow.FlowNode{
			{ID: "entry", Type: entryType},
			{ID: "msg", Type: flow.FlowNodeTypeActionResponseCreate},
		},
		Edges: []flow.FlowEdge{
			{ID: "e1", Source: "entry", Target: "msg"},
		},
	}
}

func newResumeTestApp(t *testing.T, instances *fakeMessageInstanceStore) *App {
	t.Helper()

	app := NewApp("app", Env{MessageInstanceStore: instances})

	commandFlow, err := flow.CompileCommand(testFlowWithMessageNode(flow.FlowNodeTypeEntryCommand))
	require.NoError(t, err)
	app.commands["cmd"] = &Command{cmd: &model.Command{ID: "cmd"}, flow: commandFlow}

	listenerFlow, err := flow.CompileEventListener(testFlowWithMessageNode(flow.FlowNodeTypeEntryEvent))
	require.NoError(t, err)
	app.listeners["listener"] = &EventListener{listener: &model.EventListener{ID: "listener"}, flow: listenerFlow}

	return app
}

func TestResolveResumePoint(t *testing.T) {
	instances := &fakeMessageInstanceStore{
		instance: &model.MessageInstance{
			ID:        7,
			MessageID: "message",
			FlowSources: map[string]flow.FlowData{
				"source": testFlowWithMessageNode(flow.FlowNodeTypeEntryComponentButton),
			},
		},
	}
	app := newResumeTestApp(t, instances)

	tests := []struct {
		name      string
		rp        model.ResumePoint
		wantLinks entityLinks
	}{
		{
			name:      "command",
			rp:        model.ResumePoint{CommandID: null.StringFrom("cmd"), FlowNodeID: "msg"},
			wantLinks: entityLinks{CommandID: null.StringFrom("cmd")},
		},
		{
			name:      "event listener",
			rp:        model.ResumePoint{EventListenerID: null.StringFrom("listener"), FlowNodeID: "msg"},
			wantLinks: entityLinks{EventListenerID: null.StringFrom("listener")},
		},
		{
			name: "message instance",
			rp: model.ResumePoint{
				MessageID:         null.StringFrom("message"),
				MessageInstanceID: null.IntFrom(7),
				FlowSourceID:      null.StringFrom("source"),
				FlowNodeID:        "msg",
			},
			wantLinks: entityLinks{
				MessageID:         null.StringFrom("message"),
				MessageInstanceID: null.IntFrom(7),
				FlowSourceID:      null.StringFrom("source"),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			node, links, err := app.resolveResumePoint(context.Background(), &tt.rp)
			require.NoError(t, err)
			require.NotNil(t, node)
			assert.Equal(t, "msg", node.ID)
			assert.Equal(t, tt.wantLinks, links)
		})
	}
}

func TestResolveResumePointNotFound(t *testing.T) {
	app := newResumeTestApp(t, &fakeMessageInstanceStore{})

	tests := []struct {
		name string
		rp   model.ResumePoint
	}{
		{"deleted command", model.ResumePoint{CommandID: null.StringFrom("gone"), FlowNodeID: "msg"}},
		{"deleted event listener", model.ResumePoint{EventListenerID: null.StringFrom("gone"), FlowNodeID: "msg"}},
		{"deleted message instance", model.ResumePoint{
			MessageID:         null.StringFrom("message"),
			MessageInstanceID: null.IntFrom(7),
			FlowSourceID:      null.StringFrom("source"),
			FlowNodeID:        "msg",
		}},
		{"deleted node", model.ResumePoint{CommandID: null.StringFrom("cmd"), FlowNodeID: "gone"}},
		{"no owner", model.ResumePoint{FlowNodeID: "msg"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := app.resolveResumePoint(context.Background(), &tt.rp)
			assert.ErrorIs(t, err, errResumeTargetNotFound)
		})
	}
}

func TestResolveResumePointStoreError(t *testing.T) {
	storeErr := errors.New("connection refused")
	app := newResumeTestApp(t, &fakeMessageInstanceStore{err: storeErr})

	_, _, err := app.resolveResumePoint(context.Background(), &model.ResumePoint{
		MessageID:         null.StringFrom("message"),
		MessageInstanceID: null.IntFrom(7),
		FlowSourceID:      null.StringFrom("source"),
		FlowNodeID:        "msg",
	})
	assert.ErrorIs(t, err, storeErr)
	assert.NotErrorIs(t, err, errResumeTargetNotFound, "transient errors must not be reported as unavailable")
}
