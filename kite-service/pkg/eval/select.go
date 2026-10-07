package eval

import (
	"strings"

	"github.com/diamondburned/arikawa/v3/discord"
)

// ComponentEnv describes the component (button or select menu) of a component
// interaction, exposed as {{interaction.component}}.
type ComponentInteractionEnv struct {
	CustomID string `expr:"custom_id" json:"custom_id"`
	Type     int    `expr:"type" json:"type"`
}

func (c ComponentInteractionEnv) String() string {
	return c.CustomID
}

// SelectOptionEnv is an option of a String Select, exposed in select.options and
// as {{option}} inside the branch of an option.
type SelectOptionEnv struct {
	Value       string `expr:"value" json:"value"`
	Label       string `expr:"label" json:"label"`
	Description string `expr:"description" json:"description"`
	// Index is the position of the option in the menu (0-based).
	Index int `expr:"index" json:"index"`
}

func (o SelectOptionEnv) String() string {
	return o.Value
}

// SelectOptionInfo is a configured option used to describe selected values.
type SelectOptionInfo struct {
	Value       string
	Label       string
	Description string
	Index       int
}

// SelectEnv exposes the values chosen in a select menu as {{select}}.
type SelectEnv struct {
	CustomID string `expr:"custom_id" json:"custom_id"`
	// Values are the selected option values (String Select) or the IDs of the
	// selected entities (User/Role/Mentionable/Channel Select).
	Values []string `expr:"values" json:"values"`
	// Value is the first selected value, or "" when nothing was selected.
	Value string `expr:"value" json:"value"`
	Count int    `expr:"count" json:"count"`

	// String Select
	Options []*SelectOptionEnv `expr:"options" json:"options"`
	Labels  []string           `expr:"labels" json:"labels"`

	// Entity selects
	Users        []any         `expr:"users" json:"users"`
	Roles        []*RoleEnv    `expr:"roles" json:"roles"`
	Channels     []*ChannelEnv `expr:"channels" json:"channels"`
	Mentionables []any         `expr:"mentionables" json:"mentionables"`
}

func (s SelectEnv) String() string {
	return strings.Join(s.Values, ", ")
}

// NewComponentInteractionEnv returns the env of the interacted component, or
// nil if the interaction isn't a component interaction.
func NewComponentInteractionEnv(i *discord.InteractionEvent) *ComponentInteractionEnv {
	data, ok := i.Data.(discord.ComponentInteraction)
	if !ok {
		return nil
	}

	return &ComponentInteractionEnv{
		CustomID: string(data.ID()),
		Type:     int(data.Type()),
	}
}

// NewSelectEnv returns the env of a select menu interaction, or nil if the
// interaction isn't one. options are the configured options of a String Select;
// values that aren't among them (e.g. options generated from a list) are
// described using the options of the message the select is attached to.
func NewSelectEnv(i *discord.InteractionEvent, options []SelectOptionInfo) *SelectEnv {
	switch d := i.Data.(type) {
	case *discord.StringSelectInteraction:
		env := newSelectEnv(string(d.CustomID), d.Values)

		rendered := renderedSelectOptions(i.Message, d.CustomID)
		for _, value := range d.Values {
			opt, ok := findSelectOption(options, value)
			if !ok {
				opt, ok = findSelectOption(rendered, value)
			}
			if !ok {
				opt = SelectOptionInfo{Value: value, Label: value, Index: -1}
			}

			env.Options = append(env.Options, &SelectOptionEnv{
				Value:       opt.Value,
				Label:       opt.Label,
				Description: opt.Description,
				Index:       opt.Index,
			})
			env.Labels = append(env.Labels, opt.Label)
		}
		return env
	case *discord.UserSelectInteraction:
		env := newSelectEnv(string(d.CustomID), snowflakeStrings(d.Values))
		for _, id := range d.Values {
			env.Users = append(env.Users, resolvedUserEnv(d.Resolved, id))
		}
		return env
	case *discord.RoleSelectInteraction:
		env := newSelectEnv(string(d.CustomID), snowflakeStrings(d.Values))
		for _, id := range d.Values {
			env.Roles = append(env.Roles, resolvedRoleEnv(d.Resolved, id))
		}
		return env
	case *discord.ChannelSelectInteraction:
		env := newSelectEnv(string(d.CustomID), snowflakeStrings(d.Values))
		for _, id := range d.Values {
			env.Channels = append(env.Channels, resolvedChannelEnv(d.Resolved, id))
		}
		return env
	case *discord.MentionableSelectInteraction:
		env := newSelectEnv(string(d.CustomID), snowflakeStrings(d.Values))
		for _, id := range d.Values {
			// A mentionable is either a user or a role.
			if _, ok := d.Resolved.Roles[discord.RoleID(id)]; ok {
				role := resolvedRoleEnv(d.Resolved, discord.RoleID(id))
				env.Roles = append(env.Roles, role)
				env.Mentionables = append(env.Mentionables, role)
				continue
			}
			user := resolvedUserEnv(d.Resolved, discord.UserID(id))
			env.Users = append(env.Users, user)
			env.Mentionables = append(env.Mentionables, user)
		}
		return env
	}

	return nil
}

func newSelectEnv(customID string, values []string) *SelectEnv {
	if values == nil {
		values = []string{}
	}

	env := &SelectEnv{
		CustomID:     customID,
		Values:       values,
		Count:        len(values),
		Options:      []*SelectOptionEnv{},
		Labels:       []string{},
		Users:        []any{},
		Roles:        []*RoleEnv{},
		Channels:     []*ChannelEnv{},
		Mentionables: []any{},
	}
	if len(values) > 0 {
		env.Value = values[0]
	}
	return env
}

func findSelectOption(options []SelectOptionInfo, value string) (SelectOptionInfo, bool) {
	for _, o := range options {
		if o.Value == value {
			return o, true
		}
	}
	return SelectOptionInfo{}, false
}

// renderedSelectOptions returns the options of the string select with the given
// custom ID as they were sent to Discord (after placeholders were evaluated).
func renderedSelectOptions(msg *discord.Message, customID discord.ComponentID) []SelectOptionInfo {
	if msg == nil {
		return nil
	}

	var sel *discord.StringSelectComponent
	for _, c := range msg.Components {
		if sel = findStringSelect(c, customID); sel != nil {
			break
		}
	}
	if sel == nil {
		return nil
	}

	options := make([]SelectOptionInfo, len(sel.Options))
	for i, o := range sel.Options {
		options[i] = SelectOptionInfo{
			Value:       o.Value,
			Label:       o.Label,
			Description: o.Description,
			Index:       i,
		}
	}
	return options
}

// findStringSelect searches action rows, including those nested in Components
// V2 containers, for the string select with the given custom ID.
func findStringSelect(c discord.Component, customID discord.ComponentID) *discord.StringSelectComponent {
	switch c := c.(type) {
	case *discord.StringSelectComponent:
		if c.CustomID == customID {
			return c
		}
	case *discord.ActionRowComponent:
		for _, child := range *c {
			if sel := findStringSelect(child, customID); sel != nil {
				return sel
			}
		}
	case *discord.ContainerComponent:
		for _, child := range c.Components {
			if sel := findStringSelect(child, customID); sel != nil {
				return sel
			}
		}
	}
	return nil
}

func snowflakeStrings[T interface{ String() string }](ids []T) []string {
	res := make([]string, len(ids))
	for i, id := range ids {
		res[i] = id.String()
	}
	return res
}

func resolvedUserEnv(resolved discord.SelectResolved, id discord.UserID) any {
	user, ok := resolved.Users[id]
	if !ok {
		return NewUserEnvFromID(id)
	}

	if member, ok := resolved.Members[id]; ok {
		member.User = user
		return NewMemberEnv(member)
	}
	return NewUserEnv(user)
}

func resolvedRoleEnv(resolved discord.SelectResolved, id discord.RoleID) *RoleEnv {
	role, ok := resolved.Roles[id]
	if !ok {
		role = discord.Role{ID: id}
	}
	return NewRoleEnv(role)
}

func resolvedChannelEnv(resolved discord.SelectResolved, id discord.ChannelID) *ChannelEnv {
	if channel, ok := resolved.Channels[id]; ok {
		return NewChannelEnv(channel)
	}
	return NewChannelEnvFromID(id)
}
