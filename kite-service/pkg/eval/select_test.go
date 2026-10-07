package eval

import (
	"context"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSelectEnvStringSelect(t *testing.T) {
	i := &discord.InteractionEvent{
		Data: &discord.StringSelectInteraction{CustomID: "menu", Values: []string{"vps", "dyn", "unknown"}},
		Message: &discord.Message{Components: discord.TopLevelComponents{
			&discord.ActionRowComponent{&discord.StringSelectComponent{
				CustomID: "menu",
				Options: []discord.SelectOption{
					{Label: "VPS (rendered)", Value: "vps"},
					{Label: "Dynamic", Value: "dyn", Description: "from a list"},
				},
			}},
		}},
	}

	env := NewSelectEnv(i, []SelectOptionInfo{{Value: "vps", Label: "VPS", Index: 0}})
	require.NotNil(t, env)
	assert.Equal(t, "menu", env.CustomID)
	assert.Equal(t, []string{"vps", "dyn", "unknown"}, env.Values)
	assert.Equal(t, "vps", env.Value)
	assert.Equal(t, 3, env.Count)
	// Configured labels win, generated options fall back to the sent message.
	assert.Equal(t, []string{"VPS", "Dynamic", "unknown"}, env.Labels)
	assert.Equal(t, "from a list", env.Options[1].Description)
}

func TestNewSelectEnvEmpty(t *testing.T) {
	env := NewSelectEnv(&discord.InteractionEvent{Data: &discord.StringSelectInteraction{CustomID: "m"}}, nil)
	require.NotNil(t, env)
	assert.Equal(t, "", env.Value)
	assert.Equal(t, 0, env.Count)
	assert.NotNil(t, env.Values)
}

func TestNewSelectEnvEntities(t *testing.T) {
	resolved := discord.SelectResolved{
		Users:   map[discord.UserID]discord.User{1: {ID: 1, Username: "alex"}},
		Members: map[discord.UserID]discord.Member{1: {Nick: "Alex"}},
		Roles:   map[discord.RoleID]discord.Role{2: {ID: 2, Name: "Gamer"}},
	}

	env := NewSelectEnv(&discord.InteractionEvent{Data: &discord.MentionableSelectInteraction{
		CustomID: "m",
		Values:   []discord.Snowflake{1, 2},
		Resolved: resolved,
	}}, nil)
	require.NotNil(t, env)
	assert.Equal(t, []string{"1", "2"}, env.Values)
	require.Len(t, env.Users, 1)
	assert.Equal(t, "Alex", env.Users[0].(*MemberEnv).Nick)
	require.Len(t, env.Roles, 1)
	assert.Equal(t, "Gamer", env.Roles[0].Name)
	assert.Len(t, env.Mentionables, 2)

	env = NewSelectEnv(&discord.InteractionEvent{Data: &discord.ChannelSelectInteraction{
		CustomID: "c",
		Values:   []discord.ChannelID{9},
	}}, nil)
	require.Len(t, env.Channels, 1)
	assert.Equal(t, "<#9>", env.Channels[0].Mention, "unresolved channels fall back to the ID")
}

func TestSelectEnvInTemplates(t *testing.T) {
	i := &discord.InteractionEvent{
		Data: &discord.StringSelectInteraction{CustomID: "menu", Values: []string{"a", "b"}},
		User: &discord.User{ID: 1, Username: "alex"},
	}
	// NewContextFromInteraction needs a session for {{app}}; build the relevant
	// part of its env directly.
	ctx := NewContext(Env{
		"interaction": NewInteractionEnv(i),
		"select":      NewSelectEnv(i, nil),
	})

	res, err := EvalTemplate(context.Background(), "{{select.value}} {{select.count}} {{interaction.component.custom_id}}", ctx)
	require.NoError(t, err)
	assert.Equal(t, "a 2 menu", res.String())

	res, err = EvalTemplate(context.Background(), "{{select.values}}", ctx)
	require.NoError(t, err)
	require.Len(t, res.AsList(), 2, "select.values is a list")

	res, err = EvalTemplate(context.Background(), `{{"b" in select.values}}`, ctx)
	require.NoError(t, err)
	assert.True(t, res.Bool())
}
