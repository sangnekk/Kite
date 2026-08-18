package schedule

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScheduleLimitSemantics(t *testing.T) {
	assert.True(t, scheduleLimitReached(0, 1, 0), "0 must disable schedules")
	assert.True(t, scheduleLimitReached(3, 1, 3))
	assert.True(t, scheduleLimitReached(2, 2, 3), "imports must include the full batch")
	assert.False(t, scheduleLimitReached(100, 1, -1), "-1 must be unlimited")
	assert.False(t, scheduleLimitReached(2, 1, 3))
}
