package message

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)


func selectRow(sel ComponentData) MessageData {
	return MessageData{Components: []ComponentData{{Type: ComponentTypeActionRow, Components: []ComponentData{sel}}}}
}

func TestConvertStringSelect(t *testing.T) {
	data := selectRow(ComponentData{
		ID:           3,
		Type:         ComponentTypeStringSelect,
		Placeholder:  "Chọn sản phẩm",
		MinValues:    intPtr(0),
		MaxValues:    intPtr(2),
		FlowSourceID: "flow-1",
		Options: []ComponentSelectOptionData{
			{ID: 1, Label: "VPS", Value: "buy_vps", Description: "Máy chủ", Emoji: &ComponentEmojiData{Name: "🖥️"}, Default: true},
			{ID: 2, Label: "Hosting", Value: "hosting"},
		},
	})

	send := data.ToSendMessageData(ConvertOptions{})
	require.Len(t, send.Components, 1)
	row, ok := send.Components[0].(*discord.ActionRowComponent)
	require.True(t, ok)
	require.Len(t, *row, 1)

	sel, ok := (*row)[0].(*discord.StringSelectComponent)
	require.True(t, ok, "select must not be dropped from the action row")
	assert.Equal(t, discord.ComponentID("flow-1"), sel.CustomID)
	assert.Equal(t, "Chọn sản phẩm", sel.Placeholder)
	assert.Equal(t, [2]int{0, 2}, sel.ValueLimits)
	require.Len(t, sel.Options, 2)
	assert.Equal(t, "buy_vps", sel.Options[0].Value)
	assert.True(t, sel.Options[0].Default)
	assert.Equal(t, "🖥️", sel.Options[0].Emoji.Name)

	raw, err := json.Marshal(sel)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"min_values":0`, "min_values 0 must be sent")
	assert.Contains(t, string(raw), `"max_values":2`)
}

func TestConvertSelectCustomIDFactory(t *testing.T) {
	data := selectRow(ComponentData{
		ID:      7,
		Type:    ComponentTypeStringSelect,
		Options: []ComponentSelectOptionData{{ID: 1, Label: "A", Value: "a"}},
	})

	send := data.ToSendMessageData(ConvertOptions{
		ComponentIDFactory: func(c *ComponentData) discord.ComponentID {
			return discord.ComponentID(CustomIDMessageComponentResumePoint("rp", c.ID))
		},
	})
	sel := (*send.Components[0].(*discord.ActionRowComponent))[0].(*discord.StringSelectComponent)
	assert.Equal(t, discord.ComponentID("resume:rp_7"), sel.CustomID)

	// Without a flow a custom ID is still generated (Discord requires one).
	send = data.ToSendMessageData(ConvertOptions{})
	sel = (*send.Components[0].(*discord.ActionRowComponent))[0].(*discord.StringSelectComponent)
	assert.Equal(t, discord.ComponentID("noflow:7"), sel.CustomID)
}

func TestConvertEntitySelects(t *testing.T) {
	defaults := []ComponentDefaultValueData{
		{ID: "111", Type: DefaultValueTypeUser},
		{ID: "222", Type: DefaultValueTypeRole},
		{ID: "333", Type: DefaultValueTypeChannel},
		{ID: "", Type: DefaultValueTypeUser}, // placeholder that evaluated to nothing
	}

	tests := []struct {
		name  string
		typ   int
		check func(t *testing.T, c discord.Component)
	}{
		{"user", ComponentTypeUserSelect, func(t *testing.T, c discord.Component) {
			s := c.(*discord.UserSelectComponent)
			assert.Equal(t, []discord.UserID{111}, s.DefaultUsers)
		}},
		{"role", ComponentTypeRoleSelect, func(t *testing.T, c discord.Component) {
			s := c.(*discord.RoleSelectComponent)
			assert.Equal(t, []discord.RoleID{222}, s.DefaultRoles)
		}},
		{"mentionable", ComponentTypeMentionableSelect, func(t *testing.T, c discord.Component) {
			s := c.(*discord.MentionableSelectComponent)
			assert.Len(t, s.DefaultMentions, 2)
		}},
		{"channel", ComponentTypeChannelSelect, func(t *testing.T, c discord.Component) {
			s := c.(*discord.ChannelSelectComponent)
			assert.Equal(t, []discord.ChannelID{333}, s.DefaultChannels)
			assert.Equal(t, []discord.ChannelType{discord.GuildText, discord.GuildVoice}, s.ChannelTypes)
			raw, err := json.Marshal(s)
			require.NoError(t, err)
			assert.NotContains(t, string(raw), `"required"`, "required is modal-only")
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			comp := ComponentData{
				ID:            1,
				Type:          tt.typ,
				FlowSourceID:  "flow",
				MaxValues:     intPtr(3),
				DefaultValues: defaults,
			}
			if tt.typ == ComponentTypeChannelSelect {
				comp.ChannelTypes = []int{0, 2}
			}
			data := selectRow(comp)
			send := data.ToSendMessageData(ConvertOptions{})
			row := send.Components[0].(*discord.ActionRowComponent)
			require.Len(t, *row, 1)
			tt.check(t, (*row)[0])
		})
	}
}

func TestSelectInsideComponentsV2Container(t *testing.T) {
	data := MessageData{
		Flags: MessageFlagsComponentsV2,
		Components: []ComponentData{{
			Type: ComponentTypeContainer,
			Components: []ComponentData{
				{Type: ComponentTypeTextDisplay, Content: "Chọn"},
				{Type: ComponentTypeActionRow, Components: []ComponentData{{
					ID: 5, Type: ComponentTypeRoleSelect, FlowSourceID: "f",
				}}},
			},
		}},
	}

	send := data.ToSendMessageData(ConvertOptions{})
	container := send.Components[0].(*discord.ContainerComponent)
	row := container.Components[1].(*discord.ActionRowComponent)
	_, ok := (*row)[0].(*discord.RoleSelectComponent)
	assert.True(t, ok)
}

func validStringSelect() ComponentData {
	return ComponentData{
		ID:   1,
		Type: ComponentTypeStringSelect,
		Options: []ComponentSelectOptionData{
			{ID: 1, Label: "VPS", Value: "vps"},
			{ID: 2, Label: "Hosting", Value: "hosting"},
		},
	}
}

func TestValidateComponents(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(d *MessageData)
		wantErr string
	}{
		{"valid", func(d *MessageData) {}, ""},
		{"select with button", func(d *MessageData) {
			d.Components[0].Components = append(d.Components[0].Components, ComponentData{Type: ComponentTypeButton, Label: "x"})
		}, "must be the only component"},
		{"no options", func(d *MessageData) { d.Components[0].Components[0].Options = nil }, "between 1 and 25 options"},
		{"duplicate value", func(d *MessageData) { d.Components[0].Components[0].Options[1].Value = "vps" }, "already used"},
		{"empty value", func(d *MessageData) { d.Components[0].Components[0].Options[0].Value = "" }, "options.0.value"},
		{"templated value", func(d *MessageData) { d.Components[0].Components[0].Options[0].Value = "{{user.id}}" }, "can't contain placeholders"},
		{"min greater than max", func(d *MessageData) {
			d.Components[0].Components[0].MinValues = intPtr(2)
			d.Components[0].Components[0].MaxValues = intPtr(1)
		}, "min_values must not be greater"},
		{"max greater than options", func(d *MessageData) { d.Components[0].Components[0].MaxValues = intPtr(3) }, "greater than the number of options"},
		{"too many defaults", func(d *MessageData) {
			d.Components[0].Components[0].Options[0].Default = true
			d.Components[0].Components[0].Options[1].Default = true
		}, "selected by default"},
		{"long placeholder", func(d *MessageData) { d.Components[0].Components[0].Placeholder = strings.Repeat("a", 151) }, "placeholder"},
		{"options source", func(d *MessageData) {
			d.Components[0].Components[0].Options = nil
			d.Components[0].Components[0].OptionsSource = &ComponentOptionsSourceData{Items: "{{var('x')}}", Label: "{{item}}", Value: "{{item}}"}
		}, ""},
		{"roles access without roles", func(d *MessageData) {
			d.Components[0].Components[0].Access = &ComponentAccessData{Mode: ComponentAccessModeRoles}
		}, "at least one role"},
		{"entity select with options", func(d *MessageData) { d.Components[0].Components[0].Type = ComponentTypeUserSelect }, "only string selects"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := selectRow(validStringSelect())
			tt.mutate(&d)
			err := d.ValidateComponents()
			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestValidateEntitySelect(t *testing.T) {
	d := selectRow(ComponentData{
		Type:          ComponentTypeRoleSelect,
		DefaultValues: []ComponentDefaultValueData{{ID: "1", Type: DefaultValueTypeUser}},
		ChannelTypes:  []int{0},
	})
	err := d.ValidateComponents()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid type")
	assert.Contains(t, err.Error(), "only channel selects")

	d = selectRow(ComponentData{Type: ComponentTypeChannelSelect, ChannelTypes: []int{0, 99}})
	require.Error(t, d.ValidateComponents())
}

func TestValidateTooManyRows(t *testing.T) {
	var d MessageData
	for range 6 {
		d.Components = append(d.Components, ComponentData{Type: ComponentTypeActionRow, Components: []ComponentData{{Type: ComponentTypeButton, Label: "x"}}})
	}
	require.Error(t, d.ValidateComponents())
}

func TestCopySelect(t *testing.T) {
	orig := ComponentData{
		Type:          ComponentTypeChannelSelect,
		MinValues:     intPtr(1),
		ChannelTypes:  []int{0},
		DefaultValues: []ComponentDefaultValueData{{ID: "1", Type: DefaultValueTypeChannel}},
		Access:        &ComponentAccessData{Mode: ComponentAccessModeRoles, RoleIDs: []string{"1"}},
		Options:       []ComponentSelectOptionData{{Value: "v"}},
	}

	c := orig.Copy()
	*c.MinValues = 5
	c.ChannelTypes[0] = 2
	c.DefaultValues[0].ID = "2"
	c.Access.RoleIDs[0] = "2"

	assert.Equal(t, 1, *orig.MinValues)
	assert.Equal(t, 0, orig.ChannelTypes[0])
	assert.Equal(t, "1", orig.DefaultValues[0].ID)
	assert.Equal(t, "1", orig.Access.RoleIDs[0])
	assert.Equal(t, "v", c.Options[0].Value)
}

func TestEachStringSelect(t *testing.T) {
	d := selectRow(ComponentData{
		Type:          ComponentTypeUserSelect,
		DefaultValues: []ComponentDefaultValueData{{ID: "{{user.id}}", Type: DefaultValueTypeUser}},
		Access:        &ComponentAccessData{Mode: ComponentAccessModeInvoker, DenyMessage: "{{x}}"},
		Options:       []ComponentSelectOptionData{{Label: "{{a}}", Value: "{{b}}"}},
	})

	require.NoError(t, d.EachString(func(s *string) error {
		*s = strings.ReplaceAll(*s, "{{", "")
		return nil
	}))
	sel := d.Components[0].Components[0]
	assert.Equal(t, "user.id}}", sel.DefaultValues[0].ID)
	assert.Equal(t, "x}}", sel.Access.DenyMessage)
	assert.Equal(t, "a}}", sel.Options[0].Label)
	assert.Equal(t, "{{b}}", sel.Options[0].Value, "option values are never templated")
}

func TestMinValuesZeroRoundTrip(t *testing.T) {
	var c ComponentData
	require.NoError(t, json.Unmarshal([]byte(`{"type":3,"min_values":0,"max_values":1}`), &c))
	require.NotNil(t, c.MinValues)
	assert.Equal(t, 0, *c.MinValues)

	raw, err := json.Marshal(c)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"min_values":0`)
}
