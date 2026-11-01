package plan

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// planReloadInterval is how often every cluster re-reads the plans so edits
// made from the admin console reach all instances.
const planReloadInterval = 30 * time.Second

type PlanManagerConfig struct {
	// Discord returns the bot token and guild ID used to hand out plan roles.
	// It is called on every run so changes made in the admin console apply live.
	Discord func() (botToken, guildID string)
}

type PlanManager struct {
	entitlementStore  store.EntitlementStore
	subscriptionStore store.SubscriptionStore
	userStore         store.UserStore
	planStore         store.PlanStore

	mu       sync.RWMutex
	records  []model.PlanRecord
	archived map[string]bool

	config PlanManagerConfig
}

// NewPlanManager loads the plans from the database. When the plans table is
// still empty it is seeded from seedPlans (the legacy [[billing.plans]] entries
// of kite.toml), after which the database is the only source of truth.
func NewPlanManager(
	ctx context.Context,
	entitlementStore store.EntitlementStore,
	subscriptionStore store.SubscriptionStore,
	userStore store.UserStore,
	planStore store.PlanStore,
	seedPlans []model.Plan,
	config PlanManagerConfig,
) (*PlanManager, error) {
	if config.Discord == nil {
		config.Discord = func() (string, string) { return "", "" }
	}

	m := &PlanManager{
		entitlementStore:  entitlementStore,
		subscriptionStore: subscriptionStore,
		userStore:         userStore,
		planStore:         planStore,
		config:            config,
	}

	if err := m.seedIfEmpty(ctx, seedPlans); err != nil {
		return nil, err
	}
	if err := m.Reload(ctx); err != nil {
		return nil, err
	}

	return m, nil
}

func (m *PlanManager) seedIfEmpty(ctx context.Context, seedPlans []model.Plan) error {
	existing, err := m.planStore.Plans(ctx)
	if err != nil {
		return fmt.Errorf("failed to load plans: %w", err)
	}
	if len(existing) > 0 || len(seedPlans) == 0 {
		return nil
	}

	for i, p := range seedPlans {
		if err := m.planStore.SavePlan(ctx, model.PlanRecord{Plan: p, SortOrder: i}); err != nil {
			return fmt.Errorf("failed to seed plan %q: %w", p.ID, err)
		}
	}
	slog.Info("Seeded plans from config file into the database", slog.Int("count", len(seedPlans)))
	return nil
}

// Reload replaces the in-memory plans with the ones stored in the database.
func (m *PlanManager) Reload(ctx context.Context) error {
	records, err := m.planStore.Plans(ctx)
	if err != nil {
		return fmt.Errorf("failed to load plans: %w", err)
	}

	archived := make(map[string]bool)
	for _, r := range records {
		if r.Archived {
			archived[r.ID] = true
		}
	}

	m.mu.Lock()
	m.records = records
	m.archived = archived
	m.mu.Unlock()
	return nil
}

// RunReload keeps the plans fresh. It must run on every cluster.
func (m *PlanManager) RunReload(ctx context.Context) {
	ticker := time.NewTicker(planReloadInterval)

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := m.Reload(ctx); err != nil {
					slog.With("error", err).Error("failed to reload plans")
				}
			}
		}
	}()
}

// Records returns every plan including archived ones, in display order.
func (m *PlanManager) Records() []model.PlanRecord {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]model.PlanRecord(nil), m.records...)
}

// Plans returns the plans that can currently be offered (archived ones are
// left out), in display order.
func (m *PlanManager) Plans() []model.Plan {
	m.mu.RLock()
	defer m.mu.RUnlock()

	plans := make([]model.Plan, 0, len(m.records))
	for _, r := range m.records {
		if !r.Archived {
			plans = append(plans, r.Plan)
		}
	}
	return plans
}

// PlanByID also returns archived plans so existing entitlements keep resolving.
func (m *PlanManager) PlanByID(planID string) *model.Plan {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, r := range m.records {
		if r.ID == planID {
			plan := r.Plan
			return &plan
		}
	}
	return nil
}

// IsArchived reports whether a plan exists but can no longer be purchased.
func (m *PlanManager) IsArchived(planID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.archived[planID]
}

func (m *PlanManager) AppFeatures(ctx context.Context, appID string) model.Features {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	entitlements, err := m.entitlementStore.ActiveEntitlements(ctx, appID, time.Now().UTC())
	if err != nil {
		slog.Error(
			"Failed to get active entitlements",
			slog.String("app_id", appID),
			slog.String("error", err.Error()),
		)
	}

	// Archived plans are included on purpose: they can't be bought anymore, but
	// apps that already hold an entitlement keep their features.
	m.mu.RLock()
	records := m.records
	m.mu.RUnlock()

	var features model.Features
	for _, record := range records {
		plan := record.Plan
		if plan.Default && !record.Archived {
			features = features.Merge(plan.Features())
			continue
		}

		for _, entitlement := range entitlements {
			if entitlement.PlanID == plan.ID {
				features = features.Merge(plan.Features())
				break
			}
		}
	}

	return features
}
