package ai

import (
	"fmt"
	"log/slog"
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

// HandleAIConsumeCredit gates one AI turn by plan + daily budget and charges
// the selected model's credit cost atomically. Used by the external AI service
// (which can't write usage records itself) to enforce access before streaming.
func (h *AIHandler) HandleAIConsumeCredit(c *handler.Context, req wire.AIConsumeCreditRequest) (*wire.AIConsumeCreditResponse, error) {
	cost := h.turnCreditCost(req.Model)

	if err := h.checkAIQuota(c, cost); err != nil {
		return nil, err
	}

	h.chargeAIUsage(c, cost)

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

func (h *AIHandler) aiCreditsUsedToday(c *handler.Context) (int, error) {
	now := time.Now().UTC()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 1).Add(-time.Nanosecond)

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

// chargeAIUsage records one copilot turn against the app's AI credit budget.
func (h *AIHandler) chargeAIUsage(c *handler.Context, cost int) {
	err := h.usageStore.CreateUsageRecord(c.Context(), model.UsageRecord{
		AppID:       c.App.ID,
		Type:        model.UsageRecordTypeAIFlowAssist,
		CreditsUsed: cost,
		CreatedAt:   time.Now().UTC(),
	})
	if err != nil {
		slog.With("error", err).With("app_id", c.App.ID).
			Error("Failed to record AI usage")
	}
}
