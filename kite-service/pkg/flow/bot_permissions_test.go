package flow

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// guildContextData is a FlowContextData that reports a valid guild and channel so
// the bot-permission gate actually runs (the default TestContextData reports
// guild 0, which is treated as "no guild" and skips the check).
type guildContextData struct {
	TestContextData
}

func (d *guildContextData) GuildID() discord.GuildID     { return 123 }
func (d *guildContextData) ChannelID() discord.ChannelID { return 456 }

func botPermsOption(perms discord.Permissions) *CompiledFlowNode {
	return &CompiledFlowNode{
		ID:   "opt",
		Type: FlowNodeTypeOptionCommandBotPermissions,
		Data: FlowNodeData{
			CommandBotPermissions: strconv.FormatUint(uint64(perms), 10),
		},
	}
}

func TestCommandBotPermissions(t *testing.T) {
	entry := &CompiledFlowNode{ID: "0", Type: FlowNodeTypeEntryCommand}

	// No option connected -> no requirement.
	assert.Equal(t, discord.Permissions(0), entry.CommandBotPermissions())

	want := discord.PermissionManageChannels | discord.PermissionBanMembers
	entry.Parents.Default = []*CompiledFlowNode{botPermsOption(want)}
	assert.Equal(t, want, entry.CommandBotPermissions())
}

func TestFormatPermissionNames(t *testing.T) {
	got := formatPermissionNames(discord.PermissionBanMembers | discord.PermissionManageChannels)
	assert.Contains(t, got, "Quản lý kênh")
	assert.Contains(t, got, "Cấm thành viên")

	// An unmapped bit still surfaces as a raw code so the notice stays actionable.
	assert.Contains(t, formatPermissionNames(discord.PermissionUseVAD), "mã quyền")
}

func newBotPermContext(t *testing.T, d *TestDiscordProvider) *FlowContext {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t.Cleanup(cancel)

	return NewContext(
		ctx,
		5*time.Second,
		&guildContextData{},
		FlowProviders{
			Discord: d,
			Log:     &provider.MockLogProvider{},
		},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 1000, MaxCredits: 1000},
		eval.NewContext(eval.Env{}),
		nil,
	)
}

func buildGatedCommand(required discord.Permissions) *CompiledFlowNode {
	entry := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeEntryCommand,
		Data: FlowNodeData{Name: "ping", Description: "Pong!"},
		Parents: ConnectedFlowNodes{
			Default: []*CompiledFlowNode{botPermsOption(required)},
		},
		Children: ConnectedFlowNodes{
			Default: []*CompiledFlowNode{
				{
					ID:   "1",
					Type: FlowNodeTypeActionResponseCreate,
					Data: FlowNodeData{MessageData: &message.MessageData{Content: "Pong!"}},
				},
			},
		},
	}
	return entry
}

func TestFlowExecuteCommandBotPermissionGateBlocks(t *testing.T) {
	d := &TestDiscordProvider{botPermissionsSet: true, botPermissions: discord.PermissionSendMessages}
	c := newBotPermContext(t, d)
	defer c.Cancel()

	entry := buildGatedCommand(discord.PermissionManageChannels)

	// The gate is not an error: it responds to the user and stops the flow.
	require.NoError(t, entry.Execute(c))
	require.NotNil(t, d.response.Data)
	require.NotNil(t, d.response.Data.Content)
	assert.Contains(t, d.response.Data.Content.Val, "Thiếu quyền")
	assert.Contains(t, d.response.Data.Content.Val, "Quản lý kênh")
	// The command body must not have run.
	assert.NotContains(t, d.response.Data.Content.Val, "Pong!")
}

func TestFlowExecuteCommandBotPermissionGateAllows(t *testing.T) {
	d := &TestDiscordProvider{botPermissionsSet: true, botPermissions: discord.PermissionManageChannels}
	c := newBotPermContext(t, d)
	defer c.Cancel()

	entry := buildGatedCommand(discord.PermissionManageChannels)

	require.NoError(t, entry.Execute(c))
	require.NotNil(t, d.response.Data)
	require.NotNil(t, d.response.Data.Content)
	// The bot has the permission, so the actual command response is sent.
	assert.Equal(t, "Pong!", d.response.Data.Content.Val)
}
