package wire

import (
	"regexp"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

var customEventNameRegex = regexp.MustCompile(`^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$`)

type CustomEvent struct {
	ID          string    `json:"id"`
	AppID       string    `json:"app_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CustomEventListResponse = []*CustomEvent
type CustomEventGetResponse = CustomEvent

type CustomEventCreateRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (req CustomEventCreateRequest) Validate() error {
	return validateCustomEventFields(req.Name, req.Description)
}

type CustomEventCreateResponse = CustomEvent
type CustomEventUpdateRequest = CustomEventCreateRequest
type CustomEventUpdateResponse = CustomEvent
type CustomEventDeleteResponse = Empty

func validateCustomEventFields(name, description string) error {
	input := struct {
		Name        string
		Description string
	}{Name: name, Description: description}
	return validation.ValidateStruct(&input,
		validation.Field(&input.Name, validation.Required, validation.Length(1, 128),
			validation.Match(customEventNameRegex).Error("must be a lowercase dot-separated event name")),
		validation.Field(&input.Description, validation.Length(0, 200)),
	)
}

func CustomEventToWire(event *model.CustomEvent) *CustomEvent {
	if event == nil {
		return nil
	}
	return &CustomEvent{
		ID: event.ID, AppID: event.AppID, Name: event.Name, Description: event.Description,
		CreatedAt: event.CreatedAt, UpdatedAt: event.UpdatedAt,
	}
}
