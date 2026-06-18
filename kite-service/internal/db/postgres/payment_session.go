package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"gopkg.in/guregu/null.v4"
)

const paymentSessionColumns = `id, seq, provider, payment_id, app_id, plan_id, amount, qr_image_url, qr_content, status, provider_transaction_id, raw_webhook_payload, created_at, updated_at, paid_at`

// NextPaymentSequence allocates the next monotonic payment sequence number used
// to build the "KITE<seq>" invoice id. A larger number always identifies a more
// recent checkout.
func (c *Client) NextPaymentSequence(ctx context.Context) (int64, error) {
	var seq int64
	if err := c.DB.QueryRow(ctx, `SELECT nextval('payment_sessions_seq')`).Scan(&seq); err != nil {
		return 0, fmt.Errorf("failed to allocate payment sequence: %w", err)
	}
	return seq, nil
}

func (c *Client) CreatePaymentSession(ctx context.Context, session model.PaymentSession) (*model.PaymentSession, error) {
	row := c.DB.QueryRow(ctx, `
INSERT INTO payment_sessions (
	id,
	seq,
	provider,
	payment_id,
	app_id,
	plan_id,
	amount,
	qr_image_url,
	qr_content,
	status,
	provider_transaction_id,
	raw_webhook_payload,
	created_at,
	updated_at,
	paid_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING `+paymentSessionColumns,
		session.ID,
		session.Seq,
		session.Provider,
		session.PaymentID,
		session.AppID,
		session.PlanID,
		session.Amount,
		session.QRImageURL,
		session.QRContent,
		string(session.Status),
		pgtype.Text{String: session.ProviderTransactionID.String, Valid: session.ProviderTransactionID.Valid},
		session.RawWebhookPayload,
		pgtype.Timestamp{Time: session.CreatedAt, Valid: true},
		pgtype.Timestamp{Time: session.UpdatedAt, Valid: true},
		pgtype.Timestamp{Time: session.PaidAt.Time, Valid: session.PaidAt.Valid},
	)

	return scanPaymentSession(row)
}

func (c *Client) PaymentSession(ctx context.Context, paymentID string) (*model.PaymentSession, error) {
	row := c.DB.QueryRow(ctx, `
SELECT `+paymentSessionColumns+`
FROM payment_sessions
WHERE payment_id = $1
`, paymentID)
	return scanPaymentSession(row)
}

func (c *Client) MarkPaymentSessionPaid(ctx context.Context, paymentID string, providerTransactionID string, rawWebhookPayload string, paidAt time.Time) (*model.PaymentSession, error) {
	row := c.DB.QueryRow(ctx, `
UPDATE payment_sessions
SET status = 'paid',
	provider_transaction_id = COALESCE(NULLIF($2, ''), provider_transaction_id),
	raw_webhook_payload = $3,
	updated_at = $4,
	paid_at = COALESCE(paid_at, $4)
WHERE payment_id = $1
RETURNING `+paymentSessionColumns,
		paymentID, providerTransactionID, rawWebhookPayload, pgtype.Timestamp{Time: paidAt, Valid: true})

	return scanPaymentSession(row)
}

func (c *Client) MarkPaymentSessionFailed(ctx context.Context, paymentID string, rawWebhookPayload string, failedAt time.Time) (*model.PaymentSession, error) {
	row := c.DB.QueryRow(ctx, `
UPDATE payment_sessions
SET status = 'failed',
	raw_webhook_payload = $2,
	updated_at = $3
WHERE payment_id = $1
RETURNING `+paymentSessionColumns,
		paymentID, rawWebhookPayload, pgtype.Timestamp{Time: failedAt, Valid: true})
	return scanPaymentSession(row)
}

// FailPendingPaymentSessionsForApp marks every still-pending payment session of
// an app as failed, except the one identified by exceptPaymentID. This is used
// to supersede older checkouts when a newer one is created: only the latest
// (largest seq) checkout for an app stays valid.
func (c *Client) FailPendingPaymentSessionsForApp(ctx context.Context, appID string, exceptPaymentID string, updatedAt time.Time) error {
	_, err := c.DB.Exec(ctx, `
UPDATE payment_sessions
SET status = 'failed',
	updated_at = $3
WHERE app_id = $1
	AND status = 'pending'
	AND payment_id <> $2
`, appID, exceptPaymentID, pgtype.Timestamp{Time: updatedAt, Valid: true})
	return err
}

func scanPaymentSession(row interface{ Scan(dest ...any) error }) (*model.PaymentSession, error) {
	var session model.PaymentSession
	var seq pgtype.Int8
	var providerTransactionID pgtype.Text
	var rawWebhookPayload pgtype.Text
	var paidAt pgtype.Timestamp
	if err := row.Scan(
		&session.ID,
		&seq,
		&session.Provider,
		&session.PaymentID,
		&session.AppID,
		&session.PlanID,
		&session.Amount,
		&session.QRImageURL,
		&session.QRContent,
		&session.Status,
		&providerTransactionID,
		&rawWebhookPayload,
		&session.CreatedAt,
		&session.UpdatedAt,
		&paidAt,
	); err != nil {
		return nil, err
	}

	session.Seq = seq.Int64
	session.ProviderTransactionID = null.NewString(providerTransactionID.String, providerTransactionID.Valid)
	session.RawWebhookPayload = rawWebhookPayload.String
	session.PaidAt = null.NewTime(paidAt.Time, paidAt.Valid)
	return &session, nil
}

func (c *Client) PaymentSessionByPaymentID(ctx context.Context, paymentID string) (*model.PaymentSession, error) {
	return c.PaymentSession(ctx, paymentID)
}

func (c *Client) PaymentSessionByIDOrError(ctx context.Context, paymentID string) (*model.PaymentSession, error) {
	session, err := c.PaymentSession(ctx, paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load payment session: %w", err)
	}
	return session, nil
}
