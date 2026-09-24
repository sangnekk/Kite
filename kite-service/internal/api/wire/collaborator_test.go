package wire

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAppCollaboratorCreateRequestValidatesDiscordUserID(t *testing.T) {
	assert.NoError(t, (AppCollaboratorCreateRequest{DiscordUserID: "867040792463802389"}).Validate())
	assert.Error(t, (AppCollaboratorCreateRequest{DiscordUserID: "1"}).Validate())
	assert.Error(t, (AppCollaboratorCreateRequest{DiscordUserID: "86704079246380238a"}).Validate())
	assert.Error(t, (AppCollaboratorCreateRequest{DiscordUserID: "123456789012345678901"}).Validate())
}
