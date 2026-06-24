package ai

import (
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

// flowAssistDefaultCreditCost is the per-turn cost used when the selected model
// has no explicit credit cost configured.
const flowAssistDefaultCreditCost = 1

// turnCreditCost resolves the AI-credit cost of one copilot turn for the given
// model key, using the model's configured credits (so pricier models cost more)
// and falling back to the default when unset.
func (h *AIHandler) turnCreditCost(modelKey string) int {
	if m, ok := h.modelRegistry.Lookup(modelKey); ok && m.Credits > 0 {
		return m.Credits
	}
	return flowAssistDefaultCreditCost
}

// HandleAICredits reports the app's AI copilot budget for today.
func (h *AIHandler) HandleAICredits(c *handler.Context) (*wire.AICreditsResponse, error) {
	used, err := h.aiCreditsUsedToday(c)
	if err != nil {
		return nil, handler.ErrInternal("failed to check AI usage")
	}

	limit := c.Features.AICreditPerDay
	remaining := max(0, limit-used)

	return &wire.AICreditsResponse{
		Included:    c.Features.AIIncluded,
		UsedToday:   used,
		LimitPerDay: limit,
		Remaining:   remaining,
	}, nil
}

// HandleAICheckCredit gates one AI turn by plan + daily budget WITHOUT charging.
// The AI service calls this before streaming so a turn that later errors out
// (e.g. gateway rate limit) is never charged; the charge happens via
// HandleAIConsumeCredit only once the turn completes successfully.
func (h *AIHandler) HandleAICheckCredit(c *handler.Context, req wire.AIConsumeCreditRequest) (*wire.AIConsumeCreditResponse, error) {
	cost := h.turnCreditCost(req.Model)

	if err := h.checkAIQuota(c, cost); err != nil {
		return nil, err
	}

	used, err := h.aiCreditsUsedToday(c)
	if err != nil {
		return nil, handler.ErrInternal("failed to check AI usage")
	}

	return &wire.AIConsumeCreditResponse{
		Charged:   0,
		Remaining: max(0, c.Features.AICreditPerDay-used),
	}, nil
}

// HandleAIConsumeCredit charges one AI turn's credit cost, gated by plan + daily
// budget. The gate-and-charge is serialized per app+type, so concurrent turns
// can't both pass at the limit and overspend, and a DB write failure is never
// reported as a successful charge. Called by the AI service after a turn completes.
func (h *AIHandler) HandleAIConsumeCredit(c *handler.Context, req wire.AIConsumeCreditRequest) (*wire.AIConsumeCreditResponse, error) {
	if !c.Features.AIIncluded {
		return nil, handler.ErrForbidden(
			"ai_not_included",
			"Gói của bạn không bao gồm trợ lý AI.",
		)
	}

	cost := h.turnCreditCost(req.Model)
	start, end, now := aiDayWindow()

	charged, err := h.usageStore.ChargeUsageWithinDailyLimit(
		c.Context(), c.App.ID, model.UsageRecordTypeAIFlowAssist,
		cost, c.Features.AICreditPerDay, start, end, now,
	)
	if err != nil {
		return nil, handler.ErrInternal("failed to charge AI usage")
	}
	if !charged {
		// Boundary trade-off: this is called after the turn already streamed to the
		// user. At the daily-budget edge, concurrent turns that all passed the
		// read-only pre-stream check can land here once the budget is spent, so a
		// few turns are delivered un-charged. That overspend is bounded by the AI
		// service's per-app concurrency cap (maxConcurrentChatsPerApp), not unbounded.
		return nil, handler.ErrForbidden(
			"ai_daily_limit",
			fmt.Sprintf("Đã hết credit AI hôm nay (giới hạn %d/ngày).", c.Features.AICreditPerDay),
		)
	}

	used, err := h.aiCreditsUsedToday(c)
	if err != nil {
		return nil, handler.ErrInternal("failed to check AI usage")
	}

	return &wire.AIConsumeCreditResponse{
		Charged:   cost,
		Remaining: max(0, c.Features.AICreditPerDay-used),
	}, nil
}

// checkAIQuota gates the copilot by plan: the plan must include AI, and the
// app's AI credit usage for today must leave room for one more turn at the
// given cost.
func (h *AIHandler) checkAIQuota(c *handler.Context, cost int) error {
	if !c.Features.AIIncluded {
		return handler.ErrForbidden(
			"ai_not_included",
			"Gói của bạn không bao gồm trợ lý AI.",
		)
	}

	used, err := h.aiCreditsUsedToday(c)
	if err != nil {
		return handler.ErrInternal("failed to check AI usage")
	}

	if used+cost > c.Features.AICreditPerDay {
		return handler.ErrForbidden(
			"ai_daily_limit",
			fmt.Sprintf("Đã hết credit AI hôm nay (giới hạn %d/ngày).", c.Features.AICreditPerDay),
		)
	}

	return nil
}

// aiDayWindow returns today's UTC day boundaries plus the current time, used for
// both reading and atomically charging the per-day AI budget.
func aiDayWindow() (start, end, now time.Time) {
	now = time.Now().UTC()
	start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end = start.AddDate(0, 0, 1).Add(-time.Nanosecond)
	return start, end, now
}

func (h *AIHandler) aiCreditsUsedToday(c *handler.Context) (int, error) {
	start, end, _ := aiDayWindow()

	byType, err := h.usageStore.UsageCreditsUsedByTypeBetween(c.Context(), c.App.ID, start, end)
	if err != nil {
		return 0, err
	}

	for _, t := range byType {
		if t.Type == model.UsageRecordTypeAIFlowAssist {
			return t.CreditsUsed, nil
		}
	}

	return 0, nil
}
