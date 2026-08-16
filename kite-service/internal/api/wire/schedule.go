package wire

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type Schedule struct {
	ID              string        `json:"id"`
	AppID           string        `json:"app_id"`
	ModuleID        null.String   `json:"module_id"`
	CreatorUserID   string        `json:"creator_user_id"`
	Enabled         bool          `json:"enabled"`
	Description     string        `json:"description"`
	TriggerType     string        `json:"trigger_type"`
	IntervalSeconds int           `json:"interval_seconds"`
	CronExpression  string        `json:"cron_expression"`
	Timezone        string        `json:"timezone"`
	NextRunAt       null.Time     `json:"next_run_at"`
	LastRunAt       null.Time     `json:"last_run_at"`
	FlowSource      flow.FlowData `json:"flow_source"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}

type ScheduleGetResponse = Schedule

type ScheduleListResponse = []*Schedule

type ScheduleCreateRequest struct {
	FlowSource flow.FlowData `json:"flow_source"`
	Enabled    bool          `json:"enabled"`
}

func (req ScheduleCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.FlowSource, validation.Required),
	)
}

type ScheduleCreateResponse = Schedule

type SchedulesImportRequest struct {
	Schedules []ScheduleCreateRequest `json:"schedules"`
}

func (req SchedulesImportRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Schedules, validation.Required),
	)
}

type SchedulesImportResponse = []*Schedule

type ScheduleUpdateRequest struct {
	FlowSource flow.FlowData `json:"flow_source"`
	Enabled    bool          `json:"enabled"`
}

func (req ScheduleUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.FlowSource, validation.Required),
	)
}

type ScheduleUpdateResponse = Schedule

type ScheduleUpdateEnabledRequest struct {
	Enabled bool `json:"enabled"`
}

func (req ScheduleUpdateEnabledRequest) Validate() error {
	return nil
}

type ScheduleUpdateEnabledResponse = Schedule

type ScheduleDeleteResponse = Empty

func ScheduleToWire(schedule *model.Schedule) *Schedule {
	if schedule == nil {
		return nil
	}

	return &Schedule{
		ID:              schedule.ID,
		AppID:           schedule.AppID,
		ModuleID:        schedule.ModuleID,
		CreatorUserID:   schedule.CreatorUserID,
		Enabled:         schedule.Enabled,
		Description:     schedule.Description,
		TriggerType:     string(schedule.TriggerType),
		IntervalSeconds: schedule.IntervalSeconds,
		CronExpression:  schedule.CronExpression,
		Timezone:        schedule.Timezone,
		NextRunAt:       schedule.NextRunAt,
		LastRunAt:       schedule.LastRunAt,
		FlowSource:      schedule.FlowSource,
		CreatedAt:       schedule.CreatedAt,
		UpdatedAt:       schedule.UpdatedAt,
	}
}
