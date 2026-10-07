package engine

import (
	"context"
	"errors"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/pkg/message"

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

type fakeScheduleStore struct {
	store.ScheduleStore
	schedule *model.Schedule
}

func (s *fakeScheduleStore) Schedule(ctx context.Context, id string) (*model.Schedule, error) {
	if s.schedule == nil || s.schedule.ID != id {
		return nil, store.ErrNotFound
	}
	return s.schedule, nil
}

func TestResolveResumePointSchedule(t *testing.T) {
	app := newResumeTestApp(t, &fakeMessageInstanceStore{})
	app.env.ScheduleStore = &fakeScheduleStore{schedule: &model.Schedule{
		ID:         "sched",
		FlowSource: testFlowWithMessageNode(flow.FlowNodeTypeEntrySchedule),
	}}

	node, links, err := app.resolveResumePoint(context.Background(), &model.ResumePoint{
		ScheduleID: null.StringFrom("sched"),
		FlowNodeID: "msg",
	})
	require.NoError(t, err)
	assert.Equal(t, "msg", node.ID)
	assert.Equal(t, entityLinks{ScheduleID: null.StringFrom("sched")}, links)

	_, _, err = app.resolveResumePoint(context.Background(), &model.ResumePoint{
		ScheduleID: null.StringFrom("deleted"),
		FlowNodeID: "msg",
	})
	assert.ErrorIs(t, err, errResumeTargetNotFound)
}

func TestDescribeComponentInteraction(t *testing.T) {
	user := &discord.User{ID: 1, Username: "alex"}
	comp := &message.ComponentData{
		Placeholder: "Chọn sản phẩm",
		Options:     []message.ComponentSelectOptionData{{Label: "VPS", Value: "buy_vps"}},
	}

	got := describeComponentInteraction(&discord.InteractionEvent{
		User: user,
		Data: &discord.StringSelectInteraction{CustomID: "x", Values: []string{"buy_vps", "other"}},
	}, comp)
	assert.Equal(t, `alex (1) đã chọn VPS (buy_vps), other trong menu "Chọn sản phẩm"`, got)

	got = describeComponentInteraction(&discord.InteractionEvent{
		User: user,
		Data: &discord.ButtonInteraction{CustomID: "x"},
	}, &message.ComponentData{Label: "Mua"})
	assert.Equal(t, `alex (1) đã bấm nút "Mua"`, got)

	got = describeComponentInteraction(&discord.InteractionEvent{
		User: user,
		Data: &discord.RoleSelectInteraction{CustomID: "roles"},
	}, nil)
	assert.Equal(t, `alex (1) đã bỏ chọn tất cả trong menu "roles"`, got)
}

func TestUsageTypeForLinks(t *testing.T) {
	assert.Equal(t, model.UsageRecordTypeMessageFlowExecution, usageTypeForLinks(entityLinks{MessageID: null.StringFrom("m")}))
	assert.Equal(t, model.UsageRecordTypeEventListenerFlowExecution, usageTypeForLinks(entityLinks{EventListenerID: null.StringFrom("l")}))
	assert.Equal(t, model.UsageRecordTypeScheduledFlowExecution, usageTypeForLinks(entityLinks{ScheduleID: null.StringFrom("s")}))
	assert.Equal(t, model.UsageRecordTypeCommandFlowExecution, usageTypeForLinks(entityLinks{CommandID: null.StringFrom("c")}))
}

func TestMessageInstanceComponentUsesSnapshot(t *testing.T) {
	instance, err := NewMessageInstance("app", &model.MessageInstance{
		MessageID: "message",
		FlowSources: map[string]flow.FlowData{
			"sel": {
				Nodes: []flow.FlowNode{{ID: "entry", Type: flow.FlowNodeTypeEntryComponentSelect}},
			},
		},
		MessageData: &message.MessageData{Components: []message.ComponentData{{
			Type:       message.ComponentTypeActionRow,
			Components: []message.ComponentData{{ID: 4, Type: message.ComponentTypeStringSelect, FlowSourceID: "sel"}},
		}}},
	}, Env{})
	require.NoError(t, err)

	f, ok := instance.Flow("sel")
	require.True(t, ok)
	assert.True(t, f.IsComponentSelectEntry(), "select flows compile with their own entry")

	comp := instance.Component(context.Background(), "sel")
	require.NotNil(t, comp)
	assert.Equal(t, 4, comp.ID)
}
