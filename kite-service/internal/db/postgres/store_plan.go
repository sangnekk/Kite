package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

func (c *Client) Plans(ctx context.Context) ([]model.PlanRecord, error) {
	rows, err := c.Q.ListPlans(ctx)
	if err != nil {
		return nil, err
	}

	plans := make([]model.PlanRecord, len(rows))
	for i, row := range rows {
		plans[i] = rowToPlan(row)
	}
	return plans, nil
}

func (c *Client) SavePlan(ctx context.Context, plan model.PlanRecord) error {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck -- safe after Commit

	queries := c.Q.WithTx(tx)
	// The partial unique index allows a single default plan, so the previous one
	// has to be demoted before the new one is written.
	if plan.Default {
		if err := queries.ClearDefaultPlan(ctx, plan.ID); err != nil {
			return err
		}
	}

	if err := queries.UpsertPlan(ctx, planToUpsertParams(plan)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func planToUpsertParams(p model.PlanRecord) pgmodel.UpsertPlanParams {
	return pgmodel.UpsertPlanParams{
		ID:                          p.ID,
		Title:                       p.Title,
		Description:                 p.Description,
		Price:                       p.Price,
		PaymentAmount:               int32(p.PaymentAmount),
		PremiumDurationDays:         int32(p.PremiumDurationDays),
		IsDefault:                   p.Default,
		Popular:                     p.Popular,
		Hidden:                      p.Hidden,
		Archived:                    p.Archived,
		SortOrder:                   int32(p.SortOrder),
		LemonsqueezyProductID:       p.LemonSqueezyProductID,
		LemonsqueezyVariantID:       p.LemonSqueezyVariantID,
		DiscordRoleID:               p.DiscordRoleID,
		FeatureMaxCollaborators:     int32(p.FeatureMaxCollaborators),
		FeatureUsageCreditsPerMonth: int32(p.FeatureUsageCreditsPerMonth),
		FeatureMaxGuilds:            int32(p.FeatureMaxGuilds),
		FeatureMaxCommands:          int32(p.FeatureMaxCommands),
		FeatureMaxVariables:         int32(p.FeatureMaxVariables),
		FeatureMaxCustomTables:      int32(p.FeatureMaxCustomTables),
		FeatureMaxCustomEvents:      int32(p.FeatureMaxCustomEvents),
		FeatureMaxMessages:          int32(p.FeatureMaxMessages),
		FeatureMaxEventListeners:    int32(p.FeatureMaxEventListeners),
		FeatureMaxSchedules:         int32(p.FeatureMaxSchedules),
		FeaturePrioritySupport:      p.FeaturePrioritySupport,
		FeatureCustomBotStatus:      p.FeatureCustomBotStatus,
		FeatureAiIncluded:           p.FeatureAIIncluded,
		FeatureAiCreditPerDay:       int32(p.FeatureAICreditPerDay),
		UpdatedAt:                   pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
	}
}

func rowToPlan(row pgmodel.Plan) model.PlanRecord {
	return model.PlanRecord{
		Plan: model.Plan{
			ID:                          row.ID,
			Title:                       row.Title,
			Description:                 row.Description,
			Price:                       row.Price,
			PaymentAmount:               int(row.PaymentAmount),
			PremiumDurationDays:         int(row.PremiumDurationDays),
			Default:                     row.IsDefault,
			Popular:                     row.Popular,
			Hidden:                      row.Hidden,
			LemonSqueezyProductID:       row.LemonsqueezyProductID,
			LemonSqueezyVariantID:       row.LemonsqueezyVariantID,
			DiscordRoleID:               row.DiscordRoleID,
			FeatureMaxCollaborators:     int(row.FeatureMaxCollaborators),
			FeatureUsageCreditsPerMonth: int(row.FeatureUsageCreditsPerMonth),
			FeatureMaxGuilds:            int(row.FeatureMaxGuilds),
			FeatureMaxCommands:          int(row.FeatureMaxCommands),
			FeatureMaxVariables:         int(row.FeatureMaxVariables),
			FeatureMaxCustomTables:      int(row.FeatureMaxCustomTables),
			FeatureMaxCustomEvents:      int(row.FeatureMaxCustomEvents),
			FeatureMaxMessages:          int(row.FeatureMaxMessages),
			FeatureMaxEventListeners:    int(row.FeatureMaxEventListeners),
			FeatureMaxSchedules:         int(row.FeatureMaxSchedules),
			FeaturePrioritySupport:      row.FeaturePrioritySupport,
			FeatureCustomBotStatus:      row.FeatureCustomBotStatus,
			FeatureAIIncluded:           row.FeatureAiIncluded,
			FeatureAICreditPerDay:       int(row.FeatureAiCreditPerDay),
		},
		Archived:  row.Archived,
		SortOrder: int(row.SortOrder),
	}
}
