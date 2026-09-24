package wire

import (
	"regexp"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

var discordUserIDPattern = regexp.MustCompile(`^[0-9]{17,20}$`)

type AppCollaborator struct {
	User      User      `json:"user"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AppCollaboratorListResponse = []*AppCollaborator

type AppCollaboratorCreateRequest struct {
	DiscordUserID string `json:"discord_user_id"`
	Role          string `json:"role"`
}

func (req AppCollaboratorCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(
			&req.DiscordUserID,
			validation.Required.Error("Vui lòng nhập ID người dùng Discord"),
			validation.Match(discordUserIDPattern).Error("ID Discord phải gồm từ 17 đến 20 chữ số"),
		),
	)
}

type AppCollaboratorCreateResponse = AppCollaborator

type AppCollaboratorDeleteResponse = Empty

func CollaboratorToWire(collaborator *model.AppCollaborator) *AppCollaborator {
	if collaborator == nil {
		return nil
	}

	var user User
	if collaborator.User != nil {
		user = *UserToWire(collaborator.User, true)
	} else {
		user.ID = collaborator.UserID
	}

	return &AppCollaborator{
		User:      user,
		Role:      string(collaborator.Role),
		CreatedAt: collaborator.CreatedAt,
		UpdatedAt: collaborator.UpdatedAt,
	}
}
