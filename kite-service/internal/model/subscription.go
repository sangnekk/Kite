package model

import (
	"time"

	"gopkg.in/guregu/null.v4"
)

type Subscription struct {
	ID                         string
	DisplayName                string
	Source                     SubscriptionSource
	Status                     string
	StatusFormatted            string
	CreatedAt                  time.Time
	UpdatedAt                  time.Time
	RenewsAt                   time.Time
	TrialEndsAt                null.Time
	EndsAt                     null.Time
	UserID                     string
	// PaymentID is the transfer code of the payment session (for example
	// KITE123); it identifies the subscription a payment created.
	PaymentID null.String
	// PaymentReference is the reference of the bank transaction, or the admin
	// who confirmed the payment by hand.
	PaymentReference null.String
	// PlanID is the plan that was bought.
	PlanID null.String
}

type SubscriptionSource string

const (
	SubscriptionSourceSePay        SubscriptionSource = "sepay"
	SubscriptionSourceManual       SubscriptionSource = "manual"
)

func (s SubscriptionSource) String() string {
	return string(s)
}
