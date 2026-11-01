package flow

import (
	"context"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFlowExecuteTranscriptBothFormats(t *testing.T) {
	d := &TestDiscordProvider{transcriptMessages: []discord.Message{transcriptMsg(1, "an", "xin chào", false)}}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTranscript,
		Data: FlowNodeData{
			ChannelTarget:           "111",
			TranscriptFormat:        "both",
			TranscriptName:          "Ticket 42",
			TranscriptOutputChannel: "222",
		},
	}

	require.NoError(t, node.Execute(c))

	res := c.GetNodeResult("0").Object()
	assert.Equal(t, "Ticket-42.html", res["file_name"].String())
	assert.Contains(t, res["content"].String(), "<!doctype html>")
	assert.Equal(t, "Ticket-42.txt", res["text_file_name"].String())
	assert.Contains(t, res["text_content"].String(), "an: xin chào")

	require.Len(t, d.sentData.Files, 2)
	assert.Equal(t, "Ticket-42.html", d.sentData.Files[0].Name)
	assert.Equal(t, "Ticket-42.txt", d.sentData.Files[1].Name)
}

func TestFlowExecuteTranscriptSingleFormatLeavesTextFieldsEmpty(t *testing.T) {
	d := &TestDiscordProvider{transcriptMessages: []discord.Message{transcriptMsg(1, "an", "xin chào", false)}}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTranscript,
		Data: FlowNodeData{ChannelTarget: "111", TranscriptName: "{{ 'a' }}-log"},
	}

	require.NoError(t, node.Execute(c))

	res := c.GetNodeResult("0").Object()
	assert.Equal(t, "a-log.html", res["file_name"].String())
	assert.Empty(t, res["text_file_name"].String())
	assert.Empty(t, res["text_content"].String())
}

type fakeFeatures struct{ noWatermark bool }

func (f fakeFeatures) TranscriptNoWatermark(ctx context.Context) bool { return f.noWatermark }

func runTranscriptWithFeatures(t *testing.T, features FeatureProvider, hide bool) string {
	d := &TestDiscordProvider{transcriptMessages: []discord.Message{transcriptMsg(1, "an", "xin chào", false)}}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()
	c.Features = features

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTranscript,
		Data: FlowNodeData{ChannelTarget: "111", TranscriptHideWatermark: hide},
	}
	require.NoError(t, node.Execute(c))

	return c.GetNodeResult("0").Object()["content"].String()
}

func TestFlowExecuteTranscriptWatermarkFollowsThePlan(t *testing.T) {
	const badge = "Tạo bởi Vibe Bot"

	assert.Contains(t, runTranscriptWithFeatures(t, nil, true), badge, "no feature lookup means no plan may hide it")
	assert.Contains(t, runTranscriptWithFeatures(t, fakeFeatures{noWatermark: false}, true), badge, "the block asks but the plan does not allow")
	assert.Contains(t, runTranscriptWithFeatures(t, fakeFeatures{noWatermark: true}, false), badge, "the plan allows but the block does not ask")
	assert.NotContains(t, runTranscriptWithFeatures(t, fakeFeatures{noWatermark: true}, true), badge)
}
