package wire

import (
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
)

func TestChannelToWireKeepsTheCategoryAndPosition(t *testing.T) {
	res := ChannelToWire(&discord.Channel{
		ID:       10,
		Type:     discord.GuildText,
		Name:     "chung",
		ParentID: 5,
		Position: 3,
	})

	assert.Equal(t, "10", res.ID)
	assert.Equal(t, "5", res.ParentID)
	assert.Equal(t, 3, res.Position)
	assert.Equal(t, int(discord.GuildText), res.Type)

	noParent := ChannelToWire(&discord.Channel{ID: 11, Name: "x"})
	assert.Empty(t, noParent.ParentID, "a channel outside a category has no parent")

	assert.Nil(t, ChannelToWire(nil))
}

func TestRolesToWireSortsHighestFirstAndKeepsFlags(t *testing.T) {
	res := RolesToWire([]discord.Role{
		{ID: 1, Name: "@everyone", Position: 0},
		{ID: 3, Name: "Admin", Position: 5, Color: 0xff0000},
		{ID: 2, Name: "Bot", Position: 2, Managed: true},
	})

	assert.Len(t, res, 3)
	assert.Equal(t, []string{"3", "2", "1"}, []string{res[0].ID, res[1].ID, res[2].ID})
	assert.Equal(t, 0xff0000, res[0].Color)
	assert.True(t, res[1].Managed)
	assert.False(t, res[0].Managed)
}

func TestRolesToWireOfNothingIsAnEmptyList(t *testing.T) {
	res := RolesToWire(nil)
	assert.NotNil(t, res, "the JSON must be [] and not null")
	assert.Empty(t, res)
}
