package model

import "time"

type WebhookIntegrationType string

const (
	WebhookIntegrationTypeSePay       WebhookIntegrationType = "sepay"
	WebhookIntegrationTypeThueAPIBank WebhookIntegrationType = "thueapibank"
	WebhookIntegrationTypeCustom      WebhookIntegrationType = "custom"
)

func (t WebhookIntegrationType) EventSource() EventSource {
	if t == WebhookIntegrationTypeCustom {
		return EventSourceCustom
	}
	return EventSource(t)
}

type WebhookIntegration struct {
	ID        string
	AppID     string
	Type      WebhookIntegrationType
	Secret    string
	Enabled   bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
