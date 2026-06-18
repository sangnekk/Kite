package model

import (
	"time"

	"gopkg.in/guregu/null.v4"
)

type PaymentSessionStatus string

const (
	PaymentSessionStatusPending PaymentSessionStatus = "pending"
	PaymentSessionStatusPaid    PaymentSessionStatus = "paid"
	PaymentSessionStatusFailed  PaymentSessionStatus = "failed"
	PaymentSessionStatusExpired PaymentSessionStatus = "expired"
)

type PaymentSession struct {
	ID                    string
	Seq                   int64
	Provider              string
	PaymentID             string
	AppID                 string
	PlanID                string
	Amount                int
	QRImageURL            string
	QRContent             string
	Status                PaymentSessionStatus
	ProviderTransactionID null.String
	RawWebhookPayload     string
	CreatedAt             time.Time
	UpdatedAt             time.Time
	PaidAt                null.Time
}
