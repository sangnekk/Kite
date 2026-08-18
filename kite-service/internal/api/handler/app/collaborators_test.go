package app

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCollaboratorLimitExcludesOwner(t *testing.T) {
	assert.False(t, collaboratorLimitReached(1, 2), "one invited collaborator must leave one slot")
	assert.True(t, collaboratorLimitReached(2, 2))
	assert.True(t, collaboratorLimitReached(0, 0), "zero must disable invitations")
	assert.False(t, collaboratorLimitReached(100, -1), "-1 must be unlimited")
}
