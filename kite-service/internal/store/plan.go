package store

import (
	"context"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type PlanStore interface {
	// Plans returns every plan, including archived ones, ordered by sort order.
	Plans(ctx context.Context) ([]model.PlanRecord, error)
	// SavePlan creates or updates a plan. Saving a plan as default demotes the
	// previous default atomically.
	SavePlan(ctx context.Context, plan model.PlanRecord) error
}
