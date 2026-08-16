package store

import (
	"context"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type ScheduleStore interface {
	SchedulesByApp(ctx context.Context, appID string) ([]*model.Schedule, error)
	CountSchedulesByApp(ctx context.Context, appID string) (int, error)
	Schedule(ctx context.Context, id string) (*model.Schedule, error)
	CreateSchedule(ctx context.Context, schedule *model.Schedule) (*model.Schedule, error)
	UpdateSchedule(ctx context.Context, schedule *model.Schedule) (*model.Schedule, error)
	DeleteSchedule(ctx context.Context, id string) error

	// DueSchedules returns enabled schedules of enabled apps whose next_run_at has
	// passed. Disabled apps are excluded so schedules stop firing once an app runs
	// out of credit (see the billing rationale in the plan).
	DueSchedules(ctx context.Context, now time.Time) ([]*model.Schedule, error)
	// ClaimSchedule atomically advances a due schedule's next_run_at, returning
	// true only if this caller won the claim (guards against double execution).
	ClaimSchedule(ctx context.Context, id string, nextRun time.Time, now time.Time) (bool, error)
}
