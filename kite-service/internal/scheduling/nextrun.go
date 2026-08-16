// Package scheduling contains the pure time math shared by the schedule API
// handler (computing the first run) and the engine scheduler (computing the next
// run after each fire).
package scheduling

import (
	"fmt"
	"time"

	// Embed the IANA timezone database so cron schedules resolve timezones like
	// "Asia/Ho_Chi_Minh" even on systems without a system zoneinfo (e.g. Windows,
	// minimal containers).
	_ "time/tzdata"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/robfig/cron/v3"
)

// NextRun returns the next time a schedule should fire strictly after `from`.
// Interval schedules add a fixed duration; cron schedules parse a standard
// 5-field expression evaluated in the schedule's timezone. The returned time is
// in UTC, ready to be persisted.
func NextRun(
	triggerType model.ScheduleTriggerType,
	intervalSeconds int,
	cronExpression string,
	timezone string,
	from time.Time,
) (time.Time, error) {
	switch triggerType {
	case model.ScheduleTriggerTypeInterval:
		if intervalSeconds < flow.ScheduleMinIntervalSeconds {
			intervalSeconds = flow.ScheduleMinIntervalSeconds
		}
		return from.Add(time.Duration(intervalSeconds) * time.Second).UTC(), nil
	case model.ScheduleTriggerTypeCron:
		loc, err := time.LoadLocation(timezone)
		if err != nil {
			loc = time.UTC
		}

		schedule, err := cron.ParseStandard(cronExpression)
		if err != nil {
			return time.Time{}, fmt.Errorf("invalid cron expression: %w", err)
		}

		return schedule.Next(from.In(loc)).UTC(), nil
	}

	return time.Time{}, fmt.Errorf("unknown schedule trigger type %q", triggerType)
}
