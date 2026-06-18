package store

import (
	"context"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type PaymentSessionStore interface {
	NextPaymentSequence(ctx context.Context) (int64, error)
	CreatePaymentSession(ctx context.Context, session model.PaymentSession) (*model.PaymentSession, error)
	PaymentSession(ctx context.Context, paymentID string) (*model.PaymentSession, error)
	MarkPaymentSessionPaid(ctx context.Context, paymentID string, providerTransactionID string, rawWebhookPayload string, paidAt time.Time) (*model.PaymentSession, error)
	FailPendingPaymentSessionsForApp(ctx context.Context, appID string, exceptPaymentID string, updatedAt time.Time) error
}
