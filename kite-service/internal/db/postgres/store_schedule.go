package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

func (c *Client) SchedulesByApp(ctx context.Context, appID string) ([]*model.Schedule, error) {
	rows, err := c.Q.GetSchedulesByApp(ctx, appID)
	if err != nil {
		return nil, err
	}

	schedules := make([]*model.Schedule, len(rows))
	for i, row := range rows {
		schedule, err := rowToSchedule(row)
		if err != nil {
			return nil, err
		}
		schedules[i] = schedule
	}

	return schedules, nil
}

func (c *Client) CountSchedulesByApp(ctx context.Context, appID string) (int, error) {
	res, err := c.Q.CountSchedulesByApp(ctx, appID)
	if err != nil {
		return 0, err
	}
	return int(res), nil
}

func (c *Client) Schedule(ctx context.Context, id string) (*model.Schedule, error) {
	row, err := c.Q.GetSchedule(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return rowToSchedule(row)
}

func (c *Client) CreateSchedule(ctx context.Context, schedule *model.Schedule) (*model.Schedule, error) {
	flowSource, err := json.Marshal(schedule.FlowSource)
	if err != nil {
		return nil, err
	}

	row, err := c.Q.CreateSchedule(ctx, pgmodel.CreateScheduleParams{
		ID:    schedule.ID,
		AppID: schedule.AppID,
		ModuleID: pgtype.Text{
			String: schedule.ModuleID.String,
			Valid:  schedule.ModuleID.Valid,
		},
		CreatorUserID:   schedule.CreatorUserID,
		Enabled:         schedule.Enabled,
		Description:     schedule.Description,
		TriggerType:     string(schedule.TriggerType),
		IntervalSeconds: int32(schedule.IntervalSeconds),
		CronExpression:  schedule.CronExpression,
		Timezone:        schedule.Timezone,
		NextRunAt:       pgtype.Timestamp{Time: schedule.NextRunAt.Time, Valid: schedule.NextRunAt.Valid},
		LastRunAt:       pgtype.Timestamp{Time: schedule.LastRunAt.Time, Valid: schedule.LastRunAt.Valid},
		FlowSource:      flowSource,
		CreatedAt:       pgtype.Timestamp{Time: schedule.CreatedAt.UTC(), Valid: true},
		UpdatedAt:       pgtype.Timestamp{Time: schedule.UpdatedAt.UTC(), Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return rowToSchedule(row)
}

func (c *Client) UpdateSchedule(ctx context.Context, schedule *model.Schedule) (*model.Schedule, error) {
	flowSource, err := json.Marshal(schedule.FlowSource)
	if err != nil {
		return nil, err
	}

	row, err := c.Q.UpdateSchedule(ctx, pgmodel.UpdateScheduleParams{
		ID:              schedule.ID,
		Enabled:         schedule.Enabled,
		Description:     schedule.Description,
		TriggerType:     string(schedule.TriggerType),
		IntervalSeconds: int32(schedule.IntervalSeconds),
		CronExpression:  schedule.CronExpression,
		Timezone:        schedule.Timezone,
		NextRunAt:       pgtype.Timestamp{Time: schedule.NextRunAt.Time, Valid: schedule.NextRunAt.Valid},
		FlowSource:      flowSource,
		UpdatedAt:       pgtype.Timestamp{Time: schedule.UpdatedAt.UTC(), Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return rowToSchedule(row)
}

func (c *Client) DeleteSchedule(ctx context.Context, id string) error {
	err := c.Q.DeleteSchedule(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.ErrNotFound
		}
		return err
	}
	return nil
}

func (c *Client) DueSchedules(ctx context.Context, now time.Time) ([]*model.Schedule, error) {
	rows, err := c.Q.GetDueSchedules(ctx, pgtype.Timestamp{Time: now.UTC(), Valid: true})
	if err != nil {
		return nil, err
	}

	schedules := make([]*model.Schedule, len(rows))
	for i, row := range rows {
		schedule, err := rowToSchedule(row.Schedule)
		if err != nil {
			return nil, err
		}
		schedules[i] = schedule
	}

	return schedules, nil
}

func (c *Client) ClaimSchedule(ctx context.Context, id string, nextRun time.Time, now time.Time) (bool, error) {
	affected, err := c.Q.ClaimSchedule(ctx, pgmodel.ClaimScheduleParams{
		ID:        id,
		NextRunAt: pgtype.Timestamp{Time: nextRun.UTC(), Valid: true},
		Now:       pgtype.Timestamp{Time: now.UTC(), Valid: true},
	})
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

func rowToSchedule(row pgmodel.Schedule) (*model.Schedule, error) {
	var flowSource flow.FlowData
	if err := json.Unmarshal(row.FlowSource, &flowSource); err != nil {
		return nil, fmt.Errorf("failed to unmarshal flow source: %w", err)
	}

	return &model.Schedule{
		ID:              row.ID,
		AppID:           row.AppID,
		ModuleID:        null.NewString(row.ModuleID.String, row.ModuleID.Valid),
		CreatorUserID:   row.CreatorUserID,
		Enabled:         row.Enabled,
		Description:     row.Description,
		TriggerType:     model.ScheduleTriggerType(row.TriggerType),
		IntervalSeconds: int(row.IntervalSeconds),
		CronExpression:  row.CronExpression,
		Timezone:        row.Timezone,
		NextRunAt:       null.NewTime(row.NextRunAt.Time, row.NextRunAt.Valid),
		LastRunAt:       null.NewTime(row.LastRunAt.Time, row.LastRunAt.Valid),
		FlowSource:      flowSource,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
	}, nil
}
