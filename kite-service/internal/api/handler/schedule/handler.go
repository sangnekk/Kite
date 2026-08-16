package schedule

import (
	"errors"
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/scheduling"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type ScheduleHandler struct {
	scheduleStore store.ScheduleStore
}

func NewScheduleHandler(scheduleStore store.ScheduleStore) *ScheduleHandler {
	return &ScheduleHandler{
		scheduleStore: scheduleStore,
	}
}

func (h *ScheduleHandler) HandleScheduleList(c *handler.Context) (*wire.ScheduleListResponse, error) {
	schedules, err := h.scheduleStore.SchedulesByApp(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedules: %w", err)
	}

	res := make([]*wire.Schedule, len(schedules))
	for i, schedule := range schedules {
		res[i] = wire.ScheduleToWire(schedule)
	}

	return &res, nil
}

func (h *ScheduleHandler) HandleScheduleGet(c *handler.Context) (*wire.ScheduleGetResponse, error) {
	return wire.ScheduleToWire(c.Schedule), nil
}

func (h *ScheduleHandler) HandleScheduleCreate(c *handler.Context, req wire.ScheduleCreateRequest) (*wire.ScheduleCreateResponse, error) {
	if c.Features.MaxSchedules != 0 {
		scheduleCount, err := h.scheduleStore.CountSchedulesByApp(c.Context(), c.App.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to count schedules: %w", err)
		}

		if scheduleCount >= c.Features.MaxSchedules {
			return nil, handler.ErrBadRequest("resource_limit", fmt.Sprintf("maximum number of schedules (%d) reached", c.Features.MaxSchedules))
		}
	}

	schedule, err := buildScheduleFromFlow(req.FlowSource)
	if err != nil {
		return nil, err
	}

	schedule.ID = util.UniqueID()
	schedule.AppID = c.App.ID
	schedule.CreatorUserID = c.Session.UserID
	schedule.Enabled = req.Enabled
	schedule.CreatedAt = time.Now().UTC()
	schedule.UpdatedAt = time.Now().UTC()

	created, err := h.scheduleStore.CreateSchedule(c.Context(), schedule)
	if err != nil {
		return nil, fmt.Errorf("failed to create schedule: %w", err)
	}

	return wire.ScheduleToWire(created), nil
}

func (h *ScheduleHandler) HandleSchedulesImport(c *handler.Context, req wire.SchedulesImportRequest) (*wire.SchedulesImportResponse, error) {
	if c.Features.MaxSchedules != 0 {
		scheduleCount, err := h.scheduleStore.CountSchedulesByApp(c.Context(), c.App.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to count schedules: %w", err)
		}

		if scheduleCount+len(req.Schedules) > c.Features.MaxSchedules {
			return nil, handler.ErrBadRequest("resource_limit", fmt.Sprintf("maximum number of schedules (%d) reached", c.Features.MaxSchedules))
		}
	}

	res := make([]*wire.Schedule, len(req.Schedules))
	for i, s := range req.Schedules {
		schedule, err := buildScheduleFromFlow(s.FlowSource)
		if err != nil {
			return nil, err
		}

		schedule.ID = util.UniqueID()
		schedule.AppID = c.App.ID
		schedule.CreatorUserID = c.Session.UserID
		schedule.Enabled = s.Enabled
		schedule.CreatedAt = time.Now().UTC()
		schedule.UpdatedAt = time.Now().UTC()

		created, err := h.scheduleStore.CreateSchedule(c.Context(), schedule)
		if err != nil {
			return nil, fmt.Errorf("failed to create schedule: %w", err)
		}

		res[i] = wire.ScheduleToWire(created)
	}

	return &res, nil
}

func (h *ScheduleHandler) HandleScheduleUpdate(c *handler.Context, req wire.ScheduleUpdateRequest) (*wire.ScheduleUpdateResponse, error) {
	schedule, err := buildScheduleFromFlow(req.FlowSource)
	if err != nil {
		return nil, err
	}

	schedule.ID = c.Schedule.ID
	schedule.Enabled = req.Enabled
	schedule.UpdatedAt = time.Now().UTC()

	updated, err := h.scheduleStore.UpdateSchedule(c.Context(), schedule)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_schedule", "Schedule not found")
		}
		return nil, fmt.Errorf("failed to update schedule: %w", err)
	}

	return wire.ScheduleToWire(updated), nil
}

func (h *ScheduleHandler) HandleScheduleUpdateEnabled(c *handler.Context, req wire.ScheduleUpdateEnabledRequest) (*wire.ScheduleUpdateEnabledResponse, error) {
	schedule := &model.Schedule{
		ID:              c.Schedule.ID,
		Enabled:         req.Enabled,
		Description:     c.Schedule.Description,
		TriggerType:     c.Schedule.TriggerType,
		IntervalSeconds: c.Schedule.IntervalSeconds,
		CronExpression:  c.Schedule.CronExpression,
		Timezone:        c.Schedule.Timezone,
		NextRunAt:       c.Schedule.NextRunAt,
		FlowSource:      c.Schedule.FlowSource,
		UpdatedAt:       time.Now().UTC(),
	}

	// Recompute the next run when (re-)enabling so a schedule that was disabled
	// for a while doesn't fire immediately against a stale next_run_at.
	if req.Enabled {
		nextRun, err := scheduling.NextRun(
			schedule.TriggerType,
			schedule.IntervalSeconds,
			schedule.CronExpression,
			schedule.Timezone,
			time.Now().UTC(),
		)
		if err != nil {
			return nil, handler.ErrBadRequest("invalid_schedule", err.Error())
		}
		schedule.NextRunAt = null.TimeFrom(nextRun)
	}

	updated, err := h.scheduleStore.UpdateSchedule(c.Context(), schedule)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_schedule", "Schedule not found")
		}
		return nil, fmt.Errorf("failed to update schedule: %w", err)
	}

	return wire.ScheduleToWire(updated), nil
}

func (h *ScheduleHandler) HandleScheduleDelete(c *handler.Context) (*wire.ScheduleDeleteResponse, error) {
	err := h.scheduleStore.DeleteSchedule(c.Context(), c.Schedule.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_schedule", "Schedule not found")
		}
		return nil, fmt.Errorf("failed to delete schedule: %w", err)
	}

	return &wire.ScheduleDeleteResponse{}, nil
}

// buildScheduleFromFlow compiles the flow, extracts the schedule trigger from its
// entry_schedule node and computes the first run. It returns a partially filled
// model.Schedule (ID/App/Creator/Enabled/timestamps are set by the caller).
func buildScheduleFromFlow(flowSource flow.FlowData) (*model.Schedule, error) {
	scheduleFlow, err := flow.CompileSchedule(flowSource)
	if err != nil {
		return nil, handler.ErrBadRequest("invalid_flow", fmt.Sprintf("failed to compile schedule: %v", err))
	}

	spec := scheduleFlow.ScheduleSpec()
	triggerType := model.ScheduleTriggerType(spec.TriggerType)

	nextRun, err := scheduling.NextRun(triggerType, spec.IntervalSeconds, spec.CronExpression, spec.Timezone, time.Now().UTC())
	if err != nil {
		return nil, handler.ErrBadRequest("invalid_schedule", err.Error())
	}

	return &model.Schedule{
		Description:     scheduleFlow.ScheduleDescription(),
		TriggerType:     triggerType,
		IntervalSeconds: spec.IntervalSeconds,
		CronExpression:  spec.CronExpression,
		Timezone:        spec.Timezone,
		NextRunAt:       null.TimeFrom(nextRun),
		FlowSource:      flowSource,
	}, nil
}
