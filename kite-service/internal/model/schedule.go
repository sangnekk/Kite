package model

import (
	"time"

	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type ScheduleTriggerType string

const (
	// ScheduleTriggerTypeInterval fires every IntervalSeconds seconds.
	ScheduleTriggerTypeInterval ScheduleTriggerType = "interval"
	// ScheduleTriggerTypeCron fires according to a standard 5-field cron
	// expression evaluated in Timezone.
	ScheduleTriggerTypeCron ScheduleTriggerType = "cron"
)

// Schedule is a time-based trigger for a flow. It is the "event listener" of the
// clock: instead of a Discord event, a timer fires the flow. The scheduler polls
// enabled schedules whose NextRunAt has passed and executes their flow.
type Schedule struct {
	ID            string
	AppID         string
	ModuleID      null.String
	CreatorUserID string

	Enabled     bool
	Description string

	TriggerType     ScheduleTriggerType
	IntervalSeconds int
	CronExpression  string
	Timezone        string

	NextRunAt null.Time
	LastRunAt null.Time

	FlowSource flow.FlowData

	CreatedAt time.Time
	UpdatedAt time.Time
}
