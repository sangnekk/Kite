package engine

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/scheduling"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

// schedulePollInterval is how often the scheduler looks for due schedules. It is
// the worst-case lateness of a scheduled run; schedules have a 60s minimum
// interval so a 30s poll comfortably covers them.
const schedulePollInterval = 30 * time.Second

// RunScheduler starts the background loop that fires due schedules. Unlike the
// per-cluster primary jobs, this must run on every cluster: a schedule can only
// execute on the cluster that owns its app's gateway session, which is where the
// app is sharded to.
func (e *Engine) RunScheduler(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(schedulePollInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := e.dispatchDueSchedules(ctx); err != nil {
					slog.Error(
						"Failed to dispatch due schedules",
						slog.String("error", err.Error()),
					)
				}
			}
		}
	}()
}

func (e *Engine) dispatchDueSchedules(ctx context.Context) error {
	now := time.Now().UTC()

	due, err := e.env.ScheduleStore.DueSchedules(ctx, now)
	if err != nil {
		return fmt.Errorf("failed to get due schedules: %w", err)
	}

	for _, schedule := range due {
		if util.CluserForKey(schedule.AppID, e.env.Config.ClusterCount) != e.env.Config.ClusterIndex {
			continue
		}

		e.fireSchedule(ctx, schedule, now)
	}

	return nil
}

func (e *Engine) fireSchedule(ctx context.Context, schedule *model.Schedule, now time.Time) {
	nextRun, err := scheduling.NextRun(
		schedule.TriggerType,
		schedule.IntervalSeconds,
		schedule.CronExpression,
		schedule.Timezone,
		now,
	)
	if err != nil {
		// A broken trigger (e.g. an invalid cron) can't advance; log and skip so we
		// don't spin on it every tick.
		slog.Error(
			"Failed to compute next run for schedule",
			slog.String("schedule_id", schedule.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	// Atomically advance next_run_at. Only the caller that wins the claim executes
	// the flow, so concurrent pollers can't double-fire.
	claimed, err := e.env.ScheduleStore.ClaimSchedule(ctx, schedule.ID, nextRun, now)
	if err != nil {
		slog.Error(
			"Failed to claim schedule",
			slog.String("schedule_id", schedule.ID),
			slog.String("error", err.Error()),
		)
		return
	}
	if !claimed {
		return
	}

	compiled, err := flow.CompileSchedule(schedule.FlowSource)
	if err != nil {
		e.env.createLogEntry(
			schedule.AppID,
			model.LogLevelError,
			fmt.Sprintf("Failed to compile scheduled flow: %v", err),
			entityLinks{ScheduleID: null.StringFrom(schedule.ID)},
		)
		return
	}

	go e.env.executeScheduledFlow(ctx, schedule.AppID, compiled, entityLinks{
		ScheduleID: null.StringFrom(schedule.ID),
	})
}
