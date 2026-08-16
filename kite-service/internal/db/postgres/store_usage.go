package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"gopkg.in/guregu/null.v4"
)

func (c *Client) CreateUsageRecord(ctx context.Context, record model.UsageRecord) error {
	return c.Q.CreateUsageRecord(ctx, pgmodel.CreateUsageRecordParams{
		Type:            string(record.Type),
		AppID:           record.AppID,
		CommandID:       pgtype.Text{String: record.CommandID.String, Valid: record.CommandID.Valid},
		EventListenerID: pgtype.Text{String: record.EventListenerID.String, Valid: record.EventListenerID.Valid},
		MessageID:       pgtype.Text{String: record.MessageID.String, Valid: record.MessageID.Valid},
		ScheduleID:      pgtype.Text{String: record.ScheduleID.String, Valid: record.ScheduleID.Valid},
		CreditsUsed:     int32(record.CreditsUsed),
		CreatedAt:       pgtype.Timestamp{Time: record.CreatedAt, Valid: true},
	})
}

// ChargeUsageWithinDailyLimit inserts one usage record only if the app's usage of
// usageType in [start, end] plus cost stays within limitPerDay, so two concurrent
// charges can't both pass the gate and overspend the budget. Returns true when a
// row was inserted (charged).
//
// The gate-and-charge can't be made atomic by a single INSERT ... SELECT: under
// Postgres' default READ COMMITTED isolation, INSERT ... SELECT ... WHERE (SELECT
// SUM(...)) takes no lock on the summed rows, so two concurrent transactions each
// read a snapshot without the other's uncommitted insert, both pass the limit
// check, and both insert. We instead serialize per (app, usageType) with a
// transaction-scoped advisory lock: the second charger blocks until the first
// commits and releases the lock, after which its INSERT statement takes a fresh
// READ COMMITTED snapshot that includes the committed row, so its SUM reflects the
// prior charge.
func (c *Client) ChargeUsageWithinDailyLimit(
	ctx context.Context,
	appID string,
	usageType model.UsageRecordType,
	cost, limitPerDay int,
	start, end, now time.Time,
) (bool, error) {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to begin usage charge transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// hashtext returns int4, which resolves to the single-arg bigint overload of
	// pg_advisory_xact_lock. A hash collision only serializes two unrelated keys
	// (a safe slowdown), never a correctness problem.
	if _, err := tx.Exec(ctx,
		`SELECT pg_advisory_xact_lock(hashtext($1))`,
		string(usageType)+":"+appID,
	); err != nil {
		return false, fmt.Errorf("failed to acquire usage charge lock: %w", err)
	}

	// $3 (cost) is cast to bigint at every use on purpose. Without the casts it is
	// deduced as integer from the credits_used insert column AND as bigint from
	// `SUM(...) + $3` (SUM of an int column is bigint). Under the extended query
	// protocol pgx uses, Postgres rejects that with "inconsistent types deduced for
	// parameter $3 (bigint versus integer)" at Parse time, so the charge errored and
	// nothing was ever recorded. The casts pin $3 (and $7) to bigint everywhere;
	// the bigint value assigns cleanly into the int4 credits_used column.
	tag, err := tx.Exec(ctx, `
INSERT INTO usage_records (type, app_id, credits_used, created_at)
SELECT $1, $2, $3::bigint, $4
WHERE (
    SELECT COALESCE(SUM(credits_used), 0)
    FROM usage_records
    WHERE app_id = $2 AND type = $1 AND created_at BETWEEN $5 AND $6
) + $3::bigint <= $7::bigint
`, string(usageType), appID, cost, now, start, end, limitPerDay)
	if err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("failed to commit usage charge: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (c *Client) UsageRecordsBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageRecord, error) {
	rows, err := c.Q.GetUsageRecordsByAppBetween(ctx, pgmodel.GetUsageRecordsByAppBetweenParams{
		AppID:   appID,
		StartAt: pgtype.Timestamp{Time: start, Valid: true},
		EndAt:   pgtype.Timestamp{Time: end, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	records := make([]model.UsageRecord, 0, len(rows))
	for _, row := range rows {
		records = append(records, rowToUsageRecord(row))
	}

	return records, nil
}

func (c *Client) UsageCreditsUsedBetween(ctx context.Context, appID string, start time.Time, end time.Time) (int, error) {
	res, err := c.Q.GetUsageCreditsUsedByAppBetween(ctx, pgmodel.GetUsageCreditsUsedByAppBetweenParams{
		AppID:   appID,
		StartAt: pgtype.Timestamp{Time: start, Valid: true},
		EndAt:   pgtype.Timestamp{Time: end, Valid: true},
	})
	if err != nil {
		return 0, err
	}

	return int(res), nil
}

func (c *Client) UsageCreditsUsedByTypeBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageCreditsUsedByType, error) {
	rows, err := c.Q.GetUsageCreditsUsedByTypeBetween(ctx, pgmodel.GetUsageCreditsUsedByTypeBetweenParams{
		AppID:   appID,
		StartAt: pgtype.Timestamp{Time: start, Valid: true},
		EndAt:   pgtype.Timestamp{Time: end, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	records := make([]model.UsageCreditsUsedByType, 0, len(rows))
	for _, row := range rows {
		records = append(records, model.UsageCreditsUsedByType{
			Type:        model.UsageRecordType(row.Type),
			CreditsUsed: int(row.Sum),
		})
	}

	return records, nil
}

func (c *Client) UsageCreditsUsedByDayBetween(ctx context.Context, appID string, start time.Time, end time.Time) ([]model.UsageCreditsUsedByDay, error) {
	rows, err := c.Q.GetUsageCreditsUsedByDayBetween(ctx, pgmodel.GetUsageCreditsUsedByDayBetweenParams{
		AppID:   appID,
		StartAt: pgtype.Timestamp{Time: start, Valid: true},
		EndAt:   pgtype.Timestamp{Time: end, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	records := make([]model.UsageCreditsUsedByDay, 0, len(rows))
	for _, row := range rows {
		records = append(records, model.UsageCreditsUsedByDay{
			Date:        row.Date.Time,
			CreditsUsed: int(row.CreditsUsed),
		})
	}

	return records, nil
}

func (c *Client) AllUsageCreditsUsedBetween(ctx context.Context, start time.Time, end time.Time) (map[string]int, error) {
	rows, err := c.Q.GetAllUsageCreditsUsedBetween(ctx, pgmodel.GetAllUsageCreditsUsedBetweenParams{
		StartAt: pgtype.Timestamp{Time: start, Valid: true},
		EndAt:   pgtype.Timestamp{Time: end, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	res := make(map[string]int, len(rows))
	for _, row := range rows {
		res[row.AppID] = int(row.Sum)
	}

	return res, nil
}

func (c *Client) DeleteUsageRecordsBefore(ctx context.Context, before time.Time) error {
	return c.Q.DeleteUsageRecordsBefore(ctx, pgtype.Timestamp{Time: before, Valid: true})
}

func rowToUsageRecord(row pgmodel.UsageRecord) model.UsageRecord {
	return model.UsageRecord{
		ID:              row.ID,
		Type:            model.UsageRecordType(row.Type),
		AppID:           row.AppID,
		CommandID:       null.NewString(row.CommandID.String, row.CommandID.Valid),
		EventListenerID: null.NewString(row.EventListenerID.String, row.EventListenerID.Valid),
		MessageID:       null.NewString(row.MessageID.String, row.MessageID.Valid),
		ScheduleID:      null.NewString(row.ScheduleID.String, row.ScheduleID.Valid),
		CreditsUsed:     int(row.CreditsUsed),
		CreatedAt:       row.CreatedAt.Time,
	}
}
