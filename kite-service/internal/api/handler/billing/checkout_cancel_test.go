package billing

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeSessions is the part of the payment store the cancel route uses. A
// payment can be made to turn paid in the middle of the cancel, which is how a
// transfer confirmed a moment earlier looks.
type fakeSessions struct {
	sessions map[string]*model.PaymentSession
	// paidDuringCancel turns the payment paid right before the cancel is applied.
	paidDuringCancel bool
	cancelCalls      int
}

func (f *fakeSessions) NextPaymentSequence(ctx context.Context) (int64, error) { return 1, nil }
func (f *fakeSessions) CreatePaymentSession(ctx context.Context, s model.PaymentSession) (*model.PaymentSession, error) {
	return &s, nil
}
func (f *fakeSessions) PaymentSession(ctx context.Context, id string) (*model.PaymentSession, error) {
	s, ok := f.sessions[id]
	if !ok {
		return nil, assert.AnError
	}
	copy := *s
	return &copy, nil
}
func (f *fakeSessions) MarkPaymentSessionPaid(ctx context.Context, id, txn, raw string, at time.Time) (*model.PaymentSession, error) {
	return nil, nil
}
func (f *fakeSessions) FailPendingPaymentSessionsForApp(ctx context.Context, appID, except string, at time.Time) error {
	return nil
}
func (f *fakeSessions) CancelPendingPaymentSession(ctx context.Context, appID, id string, at time.Time) (bool, error) {
	f.cancelCalls++
	s := f.sessions[id]
	if f.paidDuringCancel {
		s.Status = model.PaymentSessionStatusPaid
	}
	if s.AppID != appID || s.Status != model.PaymentSessionStatusPending {
		return false, nil
	}
	s.Status = model.PaymentSessionStatusFailed
	return true, nil
}

type cancelResponse struct {
	Success bool `json:"success"`
	Data    struct {
		PaymentID string `json:"payment_id"`
		Status    string `json:"status"`
		Paid      bool   `json:"paid"`
	} `json:"data"`
	Error struct {
		Code string `json:"code"`
	} `json:"error"`
}

func cancel(t *testing.T, sessions *fakeSessions, appID, paymentID string) (int, cancelResponse) {
	t.Helper()

	h := NewBillingHandler(func() BillingHandlerConfig { return BillingHandlerConfig{} }, sessions, nil, nil, nil, nil, nil)

	mux := http.NewServeMux()
	group := handler.Group(mux, "/v1", func(next handler.HandlerFunc) handler.HandlerFunc {
		return func(c *handler.Context) error {
			c.App = &model.App{ID: appID}
			return next(c)
		}
	})
	group.Post("/checkouts/{paymentID}/cancel", handler.Typed(h.HandleAppCheckoutCancel))

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/checkouts/"+paymentID+"/cancel", nil))

	var res cancelResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &res), rec.Body.String())
	return rec.Code, res
}

func pending(appID string) *model.PaymentSession {
	return &model.PaymentSession{PaymentID: "KITE7", AppID: appID, PlanID: "pro", Amount: 99000, Status: model.PaymentSessionStatusPending}
}

func TestCancelEndsAPendingPayment(t *testing.T) {
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{"KITE7": pending("app1")}}

	code, res := cancel(t, s, "app1", "KITE7")

	assert.Equal(t, http.StatusOK, code)
	assert.True(t, res.Success)
	assert.Equal(t, "failed", res.Data.Status, "what is stored: the code can no longer be paid")
	assert.False(t, res.Data.Paid)
	assert.Equal(t, 1, s.cancelCalls)
}

func TestCancelTwiceIsHarmless(t *testing.T) {
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{"KITE7": pending("app1")}}

	cancel(t, s, "app1", "KITE7")
	code, res := cancel(t, s, "app1", "KITE7")

	assert.Equal(t, http.StatusOK, code)
	assert.Equal(t, "failed", res.Data.Status)
	assert.Equal(t, 1, s.cancelCalls, "a payment that is already over is not touched again")
}

func TestCancelNeverUndoesAPaidPayment(t *testing.T) {
	paid := pending("app1")
	paid.Status = model.PaymentSessionStatusPaid
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{"KITE7": paid}}

	code, res := cancel(t, s, "app1", "KITE7")

	assert.Equal(t, http.StatusOK, code)
	assert.True(t, res.Data.Paid)
	assert.Equal(t, "paid", res.Data.Status)
	assert.Zero(t, s.cancelCalls)
}

func TestCancelLosesTheRaceToTheBank(t *testing.T) {
	// the transfer is confirmed between the check and the cancel: the answer says
	// paid, so the user is not told that the order was cancelled
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{"KITE7": pending("app1")}, paidDuringCancel: true}

	code, res := cancel(t, s, "app1", "KITE7")

	assert.Equal(t, http.StatusOK, code)
	assert.True(t, res.Data.Paid)
	assert.Equal(t, "paid", res.Data.Status)
}

func TestCancelOfAnotherAppsPaymentIsRefused(t *testing.T) {
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{"KITE7": pending("app1")}}

	code, res := cancel(t, s, "app2", "KITE7")

	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "app_mismatch", res.Error.Code)
	assert.Zero(t, s.cancelCalls)
	assert.Equal(t, model.PaymentSessionStatusPending, s.sessions["KITE7"].Status)
}

func TestCancelRefusesAnInvalidPaymentID(t *testing.T) {
	s := &fakeSessions{sessions: map[string]*model.PaymentSession{}}

	code, res := cancel(t, s, "app1", "not-an-invoice")

	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "invalid_invoice", res.Error.Code)
}
