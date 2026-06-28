package flow

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/utils/ws"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"
)

var flowCommandTest = CompiledFlowNode{
	ID:   "0",
	Type: FlowNodeTypeEntryCommand,
	Data: FlowNodeData{
		Name:        "ping",
		Description: "Pong!",
	},
	Children: ConnectedFlowNodes{
		Default: []*CompiledFlowNode{
			{
				ID:   "1",
				Type: FlowNodeTypeControlConditionCompare,
				Data: FlowNodeData{
					ConditionBaseValue: "null",
				},
				Children: ConnectedFlowNodes{
					Default: []*CompiledFlowNode{
						{
							ID:   "2",
							Type: FlowNodeTypeControlConditionItemCompare,
							Data: FlowNodeData{
								ConditionItemMode:  ComparsionModeEqual,
								ConditionItemValue: "null",
							},
							Children: ConnectedFlowNodes{
								Default: []*CompiledFlowNode{
									{
										ID:   "3",
										Type: FlowNodeTypeActionResponseCreate,
										Data: FlowNodeData{
											MessageData: &message.MessageData{
												Content: "Pong!",
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
}

func init() {
	flowCommandTest.Children.Default[0].Children.Default[0].Parents.Default = []*CompiledFlowNode{
		flowCommandTest.Children.Default[0],
	}
}

func TestFlowExecuteCommand(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	discordProvider := &TestDiscordProvider{}

	c := NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{
			Discord: discordProvider,
			Log:     &provider.MockLogProvider{},
		}, FlowContextLimits{
			MaxStackDepth: 10,
			MaxOperations: 1000,
			MaxCredits:    1000,
		},
		eval.NewContext(eval.Env{}),
		nil,
	)
	defer c.Cancel()

	err := flowCommandTest.Execute(c)
	require.NoError(t, err)
	require.NotNil(t, discordProvider.response.Data)
	require.NotNil(t, discordProvider.response.Data.Content)
	assert.Equal(t, "Pong!", discordProvider.response.Data.Content.Val)
}

type TestDiscordProvider struct {
	provider.MockDiscordProvider

	response api.InteractionResponse

	pinnedChannel  discord.ChannelID
	pinnedMessage  discord.MessageID
	purgeChannel   discord.ChannelID
	purgeCount     int
	purgeReturn    int
	slowmodeEdited api.ModifyChannelData

	createdRoleGuild discord.GuildID
	createdRole      api.CreateRoleData
	editedRoleGuild  discord.GuildID
	editedRoleID     discord.RoleID
	editedRole       api.ModifyRoleData
	deletedRoleGuild discord.GuildID
	deletedRoleID    discord.RoleID

	// botPermissionsSet switches BotPermissions from the default (all permissions)
	// to the configured botPermissions value, so tests can simulate a bot that is
	// missing permissions.
	botPermissionsSet bool
	botPermissions    discord.Permissions
}

func (p *TestDiscordProvider) BotPermissions(ctx context.Context, guildID discord.GuildID, channelID discord.ChannelID) (discord.Permissions, error) {
	if p.botPermissionsSet {
		return p.botPermissions, nil
	}
	return discord.PermissionAll, nil
}

func (p *TestDiscordProvider) CreateInteractionResponse(ctx context.Context, interactionID discord.InteractionID, interactionToken string, response api.InteractionResponse) (*provider.InteractionResponseResource, error) {
	p.response = response
	return nil, nil
}

func (p *TestDiscordProvider) PinMessage(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, reason api.AuditLogReason) error {
	p.pinnedChannel = channelID
	p.pinnedMessage = messageID
	return nil
}

func (p *TestDiscordProvider) BulkDeleteMessages(ctx context.Context, channelID discord.ChannelID, count int, reason api.AuditLogReason) (int, error) {
	p.purgeChannel = channelID
	p.purgeCount = count
	return p.purgeReturn, nil
}

func (p *TestDiscordProvider) EditChannel(ctx context.Context, channelID discord.ChannelID, data api.ModifyChannelData) error {
	p.slowmodeEdited = data
	return nil
}

func (p *TestDiscordProvider) CreateRole(ctx context.Context, guildID discord.GuildID, data api.CreateRoleData) (*discord.Role, error) {
	p.createdRoleGuild = guildID
	p.createdRole = data
	return &discord.Role{ID: 999, Name: data.Name, Color: data.Color, Hoist: data.Hoist, Mentionable: data.Mentionable, Permissions: data.Permissions}, nil
}

func (p *TestDiscordProvider) EditRole(ctx context.Context, guildID discord.GuildID, roleID discord.RoleID, data api.ModifyRoleData) (*discord.Role, error) {
	p.editedRoleGuild = guildID
	p.editedRoleID = roleID
	p.editedRole = data
	return &discord.Role{ID: roleID}, nil
}

func (p *TestDiscordProvider) DeleteRole(ctx context.Context, guildID discord.GuildID, roleID discord.RoleID) error {
	p.deletedRoleGuild = guildID
	p.deletedRoleID = roleID
	return nil
}

type recordedEconomyCall struct {
	method        string
	currencyID    string
	scope         null.String
	recipient     null.String
	amount        thing.Thing
	allowNegative bool
	limit         int
}

type TestEconomyProvider struct {
	provider.MockEconomyProvider

	calls []recordedEconomyCall

	returnBalance     thing.Thing
	returnTransfer    provider.EconomyTransferResult
	returnLeaderboard []provider.EconomyLeaderboardEntry
}

func (p *TestEconomyProvider) AddBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error) {
	p.calls = append(p.calls, recordedEconomyCall{method: "add", currencyID: currencyID, scope: scope, amount: amount})
	return p.returnBalance, nil
}

func (p *TestEconomyProvider) RemoveBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing, allowNegative bool) (thing.Thing, error) {
	p.calls = append(p.calls, recordedEconomyCall{method: "remove", currencyID: currencyID, scope: scope, amount: amount, allowNegative: allowNegative})
	return p.returnBalance, nil
}

func (p *TestEconomyProvider) Transfer(ctx context.Context, currencyID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (provider.EconomyTransferResult, error) {
	p.calls = append(p.calls, recordedEconomyCall{method: "transfer", currencyID: currencyID, scope: fromScope, recipient: toScope, amount: amount, allowNegative: allowNegative})
	return p.returnTransfer, nil
}

func (p *TestEconomyProvider) Leaderboard(ctx context.Context, currencyID string, limit int) ([]provider.EconomyLeaderboardEntry, error) {
	p.calls = append(p.calls, recordedEconomyCall{method: "leaderboard", currencyID: currencyID, limit: limit})
	return p.returnLeaderboard, nil
}

func newEconomyTestContext(t *testing.T, economy provider.EconomyProvider) *FlowContext {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t.Cleanup(cancel)

	return NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{
			Economy: economy,
			Log:     &provider.MockLogProvider{},
		},
		FlowContextLimits{
			MaxStackDepth: 10,
			MaxOperations: 1000,
			MaxCredits:    1000,
		},
		eval.NewContext(eval.Env{}),
		nil,
	)
}

func TestFlowExecuteBalanceAdd(t *testing.T) {
	economy := &TestEconomyProvider{returnBalance: thing.NewInt(150)}
	c := newEconomyTestContext(t, economy)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionBalanceAdd,
		Data: FlowNodeData{
			VariableID:        "var_coins",
			EconomyUserTarget: "123",
			EconomyAmount:     "100",
		},
	}

	require.NoError(t, node.Execute(c))
	require.Len(t, economy.calls, 1)

	call := economy.calls[0]
	assert.Equal(t, "add", call.method)
	assert.Equal(t, "var_coins", call.currencyID)
	assert.Equal(t, "123", call.scope.String)
	assert.True(t, call.scope.Valid)
	assert.Equal(t, float64(100), call.amount.Float())

	assert.Equal(t, int64(150), c.GetNodeResult("0").Int())
}

func TestFlowExecuteBalanceRemoveAllowNegative(t *testing.T) {
	economy := &TestEconomyProvider{returnBalance: thing.NewInt(-50)}
	c := newEconomyTestContext(t, economy)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionBalanceRemove,
		Data: FlowNodeData{
			VariableID:           "var_coins",
			EconomyUserTarget:    "123",
			EconomyAmount:        "100",
			EconomyAllowNegative: true,
		},
	}

	require.NoError(t, node.Execute(c))
	require.Len(t, economy.calls, 1)
	assert.Equal(t, "remove", economy.calls[0].method)
	assert.True(t, economy.calls[0].allowNegative)
}

func TestFlowExecuteBalanceTransfer(t *testing.T) {
	economy := &TestEconomyProvider{returnTransfer: provider.EconomyTransferResult{
		FromBalance: thing.NewInt(0),
		ToBalance:   thing.NewInt(100),
	}}
	c := newEconomyTestContext(t, economy)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionBalanceTransfer,
		Data: FlowNodeData{
			VariableID:        "var_coins",
			EconomyUserTarget: "111",
			EconomyRecipient:  "222",
			EconomyAmount:     "100",
		},
	}

	require.NoError(t, node.Execute(c))
	require.Len(t, economy.calls, 1)

	call := economy.calls[0]
	assert.Equal(t, "transfer", call.method)
	assert.Equal(t, "111", call.scope.String)
	assert.Equal(t, "222", call.recipient.String)

	result := c.GetNodeResult("0")
	assert.Equal(t, int64(0), result.Object()["from_balance"].Int())
	assert.Equal(t, int64(100), result.Object()["to_balance"].Int())
}

func TestFlowExecuteBalanceLeaderboard(t *testing.T) {
	economy := &TestEconomyProvider{returnLeaderboard: []provider.EconomyLeaderboardEntry{
		{Scope: "111", Balance: thing.NewInt(900)},
		{Scope: "222", Balance: thing.NewInt(500)},
	}}
	c := newEconomyTestContext(t, economy)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionBalanceLeaderboard,
		Data: FlowNodeData{
			VariableID:   "var_coins",
			EconomyLimit: "5",
		},
	}

	require.NoError(t, node.Execute(c))
	require.Len(t, economy.calls, 1)
	assert.Equal(t, 5, economy.calls[0].limit)

	result := c.GetNodeResult("0")
	items := result.Array()
	require.Len(t, items, 2)
	assert.Equal(t, int64(1), items[0].Object()["rank"].Int())
	assert.Equal(t, "111", items[0].Object()["scope"].String())
	assert.Equal(t, int64(900), items[0].Object()["balance"].Int())
	assert.Equal(t, int64(2), items[1].Object()["rank"].Int())
}

func TestFlowExecuteTimeNowUnix(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTimeNow,
		Data: FlowNodeData{TimeFormat: "unix"},
	}

	require.NoError(t, node.Execute(c))
	// Sanity: a real unix timestamp is well past 1 January 2023.
	assert.Greater(t, c.GetNodeResult("0").Int(), int64(1_672_531_200))
}

func TestFlowExecuteTimeNowDate(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTimeNow,
		Data: FlowNodeData{TimeFormat: "date", TimeTimezone: "Asia/Ho_Chi_Minh"},
	}

	require.NoError(t, node.Execute(c))
	// Format "2006-01-02" is always 10 characters long.
	assert.Len(t, c.GetNodeResult("0").String(), 10)
}

func TestFlowExecuteListPick(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionListPick,
		Data: FlowNodeData{ListPickInput: `{{["a", "b", "c"]}}`},
	}

	require.NoError(t, node.Execute(c))
	assert.Contains(t, []string{"a", "b", "c"}, c.GetNodeResult("0").String())
}

func TestFlowExecuteListPickRawJSON(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	// A raw JSON array typed without the {{ }} template wrapper should still
	// be treated as a list instead of returning nothing.
	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionListPick,
		Data: FlowNodeData{ListPickInput: `["heads", "tails"]`},
	}

	require.NoError(t, node.Execute(c))
	assert.Contains(t, []string{"heads", "tails"}, c.GetNodeResult("0").String())
}

func TestFlowExecuteListPickEmpty(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionListPick,
		Data: FlowNodeData{ListPickInput: `{{[]}}`},
	}

	require.NoError(t, node.Execute(c))
	assert.True(t, c.GetNodeResult("0").IsNil())
}

func TestFlowExecuteTextTransform(t *testing.T) {
	cases := []struct {
		op   string
		in   string
		arg1 string
		arg2 string
		want string
	}{
		{op: "upper", in: "abc", want: "ABC"},
		{op: "lower", in: "ABC", want: "abc"},
		{op: "trim", in: "  hi  ", want: "hi"},
		{op: "length", in: "hello", want: "5"},
		{op: "replace", in: "a-b-c", arg1: "-", arg2: "+", want: "a+b+c"},
	}

	for _, tc := range cases {
		t.Run(tc.op, func(t *testing.T) {
			c := newEconomyTestContext(t, &TestEconomyProvider{})
			defer c.Cancel()

			node := &CompiledFlowNode{
				ID:   "0",
				Type: FlowNodeTypeActionTextTransform,
				Data: FlowNodeData{
					TextInput:     tc.in,
					TextOperation: tc.op,
					TextArg1:      tc.arg1,
					TextArg2:      tc.arg2,
				},
			}

			require.NoError(t, node.Execute(c))
			assert.Equal(t, tc.want, c.GetNodeResult("0").String())
		})
	}
}

func TestFlowExecuteTextTransformSplit(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionTextTransform,
		Data: FlowNodeData{TextInput: "a,b,c", TextOperation: "split", TextArg1: ","},
	}

	require.NoError(t, node.Execute(c))
	items := c.GetNodeResult("0").Array()
	require.Len(t, items, 3)
	assert.Equal(t, "b", items[1].String())
}

func TestFlowExecuteJSONParse(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionJSONParse,
		Data: FlowNodeData{JSONInput: `{"name": "kite", "count": 7}`},
	}

	require.NoError(t, node.Execute(c))
	obj := c.GetNodeResult("0").Object()
	require.NotNil(t, obj)
	assert.Equal(t, "kite", obj["name"].String())
	assert.Equal(t, int64(7), obj["count"].Int())
}

func TestFlowExecuteJSONBuild(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionJSONBuild,
		Data: FlowNodeData{JSONInput: `{{ {"a": 1, "b": "x"} }}`},
	}

	require.NoError(t, node.Execute(c))
	// Re-parse to avoid depending on key ordering.
	var out map[string]any
	require.NoError(t, json.Unmarshal([]byte(c.GetNodeResult("0").String()), &out))
	assert.EqualValues(t, 1, out["a"])
	assert.Equal(t, "x", out["b"])
}

type testCooldownProvider struct {
	provider.MockCooldownProvider
	gotCooldownID string
	gotDuration   int64
	gotConsume    bool
	result        provider.CooldownResult
}

func (p *testCooldownProvider) Check(ctx context.Context, cooldownID string, scope null.String, durationSeconds int64, consume bool) (provider.CooldownResult, error) {
	p.gotCooldownID = cooldownID
	p.gotDuration = durationSeconds
	p.gotConsume = consume
	return p.result, nil
}

func TestFlowExecuteCooldownCheck(t *testing.T) {
	cd := &testCooldownProvider{result: provider.CooldownResult{Allowed: false, Remaining: 42}}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c := NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{Cooldown: cd, Log: &provider.MockLogProvider{}},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 1000, MaxCredits: 1000},
		eval.NewContext(eval.Env{}),
		nil,
	)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionCooldownCheck,
		Data: FlowNodeData{
			VariableID:       "daily_cd",
			CooldownScope:    "123",
			CooldownDuration: "86400",
		},
	}

	require.NoError(t, node.Execute(c))
	assert.Equal(t, "daily_cd", cd.gotCooldownID)
	assert.Equal(t, int64(86400), cd.gotDuration)
	assert.True(t, cd.gotConsume) // peek defaults to false → consume true

	result := c.GetNodeResult("0")
	assert.False(t, result.Object()["allowed"].Bool())
	assert.Equal(t, int64(42), result.Object()["remaining"].Int())
}

func TestFlowExecuteNumberFormat(t *testing.T) {
	cases := []struct {
		style    string
		decimals string
		in       string
		want     string
	}{
		{style: "thousands", in: "1234567", want: "1,234,567"},
		{style: "thousands", in: "-1000", want: "-1,000"},
		{style: "compact", in: "1500000", want: "1.5M"},
		{style: "compact", in: "2000", want: "2K"},
		{style: "decimal", decimals: "2", in: "3.14159", want: "3.14"},
	}

	for _, tc := range cases {
		t.Run(tc.style+"_"+tc.in, func(t *testing.T) {
			c := newEconomyTestContext(t, &TestEconomyProvider{})
			defer c.Cancel()

			node := &CompiledFlowNode{
				ID:   "0",
				Type: FlowNodeTypeActionNumberFormat,
				Data: FlowNodeData{
					NumberInput:    tc.in,
					NumberStyle:    tc.style,
					NumberDecimals: tc.decimals,
				},
			}

			require.NoError(t, node.Execute(c))
			assert.Equal(t, tc.want, c.GetNodeResult("0").String())
		})
	}
}

func TestFlowExecuteListFormat(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionListFormat,
		Data: FlowNodeData{
			ListInput:        `{{["x", "y", "z"]}}`,
			ListItemTemplate: "{{index}}={{item}}",
			ListJoiner:       ",",
		},
	}

	require.NoError(t, node.Execute(c))
	assert.Equal(t, "0=x,1=y,2=z", c.GetNodeResult("0").String())
}

func TestFlowExecuteListJoinAndLength(t *testing.T) {
	c := newEconomyTestContext(t, &TestEconomyProvider{})
	defer c.Cancel()

	join := &CompiledFlowNode{
		ID:   "join",
		Type: FlowNodeTypeActionListJoin,
		Data: FlowNodeData{ListInput: `{{["a", "b", "c"]}}`, ListJoiner: " - "},
	}
	require.NoError(t, join.Execute(c))
	assert.Equal(t, "a - b - c", c.GetNodeResult("join").String())

	length := &CompiledFlowNode{
		ID:   "len",
		Type: FlowNodeTypeActionListLength,
		Data: FlowNodeData{ListInput: `{{["a", "b", "c"]}}`},
	}
	require.NoError(t, length.Execute(c))
	assert.Equal(t, int64(3), c.GetNodeResult("len").Int())
}

func newDiscordTestContext(t *testing.T, d provider.DiscordProvider) *FlowContext {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t.Cleanup(cancel)

	return NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{Discord: d, Log: &provider.MockLogProvider{}},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 1000, MaxCredits: 1000},
		eval.NewContext(eval.Env{}),
		nil,
	)
}

func TestFlowExecuteMessagePin(t *testing.T) {
	d := &TestDiscordProvider{}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionMessagePin,
		Data: FlowNodeData{ChannelTarget: "111", MessageTarget: "222"},
	}

	require.NoError(t, node.Execute(c))
	assert.Equal(t, discord.ChannelID(111), d.pinnedChannel)
	assert.Equal(t, discord.MessageID(222), d.pinnedMessage)
}

func TestFlowExecuteMessagePurge(t *testing.T) {
	d := &TestDiscordProvider{purgeReturn: 7}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionMessagePurge,
		Data: FlowNodeData{ChannelTarget: "111", MessagePurgeCount: "7"},
	}

	require.NoError(t, node.Execute(c))
	assert.Equal(t, discord.ChannelID(111), d.purgeChannel)
	assert.Equal(t, 7, d.purgeCount)
	assert.Equal(t, int64(7), c.GetNodeResult("0").Int())
}

func TestFlowExecuteChannelSlowmode(t *testing.T) {
	d := &TestDiscordProvider{}
	c := newDiscordTestContext(t, d)
	defer c.Cancel()

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionChannelSlowmode,
		Data: FlowNodeData{ChannelTarget: "111", ChannelSlowmodeSeconds: "30"},
	}

	require.NoError(t, node.Execute(c))
	require.NotNil(t, d.slowmodeEdited.UserRateLimit)
	assert.Equal(t, uint(30), d.slowmodeEdited.UserRateLimit.Val)
}

type TestContextData struct{}

func (d *TestContextData) Interaction() *discord.InteractionEvent {
	return &discord.InteractionEvent{}
}

func (d *TestContextData) UserID() discord.UserID {
	return 0
}

func (d *TestContextData) GuildID() discord.GuildID {
	return 0
}

func (d *TestContextData) ChannelID() discord.ChannelID {
	return 0
}

func (d *TestContextData) CommandData() *discord.CommandInteraction {
	return nil
}

func (d *TestContextData) MessageComponentData() discord.ComponentInteraction {
	return nil
}

func (d *TestContextData) Event() ws.Event {
	return &gateway.InteractionCreateEvent{}
}

func TestFlowExecuteRoleCreate(t *testing.T) {
	discordProvider := &TestDiscordProvider{}
	c := newDiscordTestContext(t, discordProvider)

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionRoleCreate,
		Data: FlowNodeData{
			GuildTarget: "123456789",
			RoleData: &RoleData{
				Name:        "Moderator",
				Color:       0xFF0000,
				Hoist:       true,
				Mentionable: true,
				Permissions: "8",
			},
		},
	}

	err := node.Execute(c)
	require.NoError(t, err)
	assert.Equal(t, discord.GuildID(123456789), discordProvider.createdRoleGuild)
	assert.Equal(t, "Moderator", discordProvider.createdRole.Name)
	assert.Equal(t, discord.Color(0xFF0000), discordProvider.createdRole.Color)
	assert.True(t, discordProvider.createdRole.Hoist)
	assert.True(t, discordProvider.createdRole.Mentionable)
	assert.Equal(t, discord.Permissions(8), discordProvider.createdRole.Permissions)
}

func TestFlowExecuteRoleEdit(t *testing.T) {
	discordProvider := &TestDiscordProvider{}
	c := newDiscordTestContext(t, discordProvider)

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionRoleEdit,
		Data: FlowNodeData{
			GuildTarget: "123456789",
			RoleTarget:  "555",
			RoleData: &RoleData{
				Name:        "Renamed",
				Permissions: "16",
			},
		},
	}

	err := node.Execute(c)
	require.NoError(t, err)
	assert.Equal(t, discord.GuildID(123456789), discordProvider.editedRoleGuild)
	assert.Equal(t, discord.RoleID(555), discordProvider.editedRoleID)
	require.NotNil(t, discordProvider.editedRole.Name)
	assert.Equal(t, "Renamed", discordProvider.editedRole.Name.Val)
	require.NotNil(t, discordProvider.editedRole.Permissions)
	assert.Equal(t, discord.Permissions(16), *discordProvider.editedRole.Permissions)
}

func TestFlowExecuteRoleDelete(t *testing.T) {
	discordProvider := &TestDiscordProvider{}
	c := newDiscordTestContext(t, discordProvider)

	node := &CompiledFlowNode{
		ID:   "0",
		Type: FlowNodeTypeActionRoleDelete,
		Data: FlowNodeData{
			GuildTarget: "123456789",
			RoleTarget:  "555",
		},
	}

	err := node.Execute(c)
	require.NoError(t, err)
	assert.Equal(t, discord.GuildID(123456789), discordProvider.deletedRoleGuild)
	assert.Equal(t, discord.RoleID(555), discordProvider.deletedRoleID)
}
