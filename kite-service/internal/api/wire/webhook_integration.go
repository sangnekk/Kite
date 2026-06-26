package wire

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

type WebhookIntegration struct {
	ID         string `json:"id"`
	AppID      string `json:"app_id"`
	Type       string `json:"type"`
	Secret     string `json:"secret"`
	Enabled    bool   `json:"enabled"`
	WebhookURL string `json:"webhook_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type WebhookIntegrationGetResponse = WebhookIntegration

type WebhookIntegrationListResponse = []*WebhookIntegration

type WebhookIntegrationCreateRequest struct {
	Type   string `json:"type"`
	Secret string `json:"secret"`
}

func (req WebhookIntegrationCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Type, validation.Required, validation.In(
			string(model.WebhookIntegrationTypeSePay),
			string(model.WebhookIntegrationTypeThueAPIBank),
			string(model.WebhookIntegrationTypeCustom),
		)),
	)
}

type WebhookIntegrationCreateResponse = WebhookIntegration

type WebhookIntegrationUpdateRequest struct {
	Secret string `json:"secret"`
}

func (req WebhookIntegrationUpdateRequest) Validate() error {
	return nil
}

type WebhookIntegrationUpdateResponse = WebhookIntegration

type WebhookIntegrationUpdateEnabledRequest struct {
	Enabled bool `json:"enabled"`
}

func (req WebhookIntegrationUpdateEnabledRequest) Validate() error {
	return nil
}

type WebhookIntegrationUpdateEnabledResponse = WebhookIntegration

type WebhookIntegrationDeleteResponse = Empty

func WebhookIntegrationToWire(integration *model.WebhookIntegration, webhookBaseURL string, discordBotID string) *WebhookIntegration {
	if integration == nil {
		return nil
	}

	webhookURL := fmt.Sprintf(
		"%s/webhook/%s/%s/%s",
		webhookBaseURL,
		discordBotID,
		string(integration.Type),
		integration.ID,
	)

	return &WebhookIntegration{
		ID:         integration.ID,
		AppID:      integration.AppID,
		Type:       string(integration.Type),
		Secret:     integration.Secret,
		Enabled:    integration.Enabled,
		WebhookURL: webhookURL,
		CreatedAt:  integration.CreatedAt,
		UpdatedAt:  integration.UpdatedAt,
	}
}
