package store

import (
	"context"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type UsageStore interface {
	CreateUsageRecord(ctx context.Context, record model.UsageRecord) error
	// ChargeUsageWithinDailyLimit atomically records one usage entry of `cost`
	// credits for the app iff the app's usage of `usageType` in [start, end] plus
	// cost stays within limitPerDay. Returns true if it charged, false if charging
	// would exceed the limit (nothing is inserted). The check and insert are
	// serialized per (app, usageType) so concurrent turns can't both pass the gate
	// and overspend the budget.
	ChargeUsageWithinDailyLimit(ctx context.Context, appID string, usageType model.UsageRecordType, cost, limitPerDay int, start, end, now time.Time) (bool, error)
	UsageRecordsBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageRecord, error)
	UsageCreditsUsedBetween(ctx context.Context, appID string, start time.Time, end time.Time) (int, error)
	UsageCreditsUsedByTypeBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageCreditsUsedByType, error)
	UsageCreditsUsedByDayBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageCreditsUsedByDay, error)
	AllUsageCreditsUsedBetween(ctx context.Context, start time.Time, end time.Time) (map[string]int, error)
	DeleteUsageRecordsBefore(ctx context.Context, before time.Time) error
}
