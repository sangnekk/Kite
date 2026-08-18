package engine

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestScheduleLimitAllowsExecution(t *testing.T) {
	assert.False(t, scheduleLimitAllowsExecution(0), "free plans must not execute schedules")
	assert.True(t, scheduleLimitAllowsExecution(1))
	assert.True(t, scheduleLimitAllowsExecution(-1), "-1 must be unlimited")
}
