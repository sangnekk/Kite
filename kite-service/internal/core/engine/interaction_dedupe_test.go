package engine

import (
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
)

func TestInteractionDeduper(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	d := newInteractionDeduper(time.Minute)
	d.now = func() time.Time { return now }
	d.rotatedAt = now

	assert.True(t, d.FirstSeen(1), "first delivery")
	assert.False(t, d.FirstSeen(1), "duplicate delivery")
	assert.True(t, d.FirstSeen(2), "other interaction")

	// After one rotation the ID is still remembered in the previous generation.
	now = now.Add(time.Minute)
	assert.False(t, d.FirstSeen(1), "duplicate after one rotation")

	// After two rotations it's forgotten.
	now = now.Add(time.Minute)
	assert.True(t, d.FirstSeen(discord.InteractionID(1)), "forgotten after two rotations")
}
