package plan

import (
	"context"
	"sync"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakePlanStore struct {
	mu    sync.Mutex
	plans []model.PlanRecord
}

func (f *fakePlanStore) Plans(context.Context) ([]model.PlanRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]model.PlanRecord(nil), f.plans...), nil
}

func (f *fakePlanStore) SavePlan(_ context.Context, p model.PlanRecord) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if p.Default {
		for i := range f.plans {
			f.plans[i].Default = false
		}
	}
	for i := range f.plans {
		if f.plans[i].ID == p.ID {
			f.plans[i] = p
			return nil
		}
	}
	f.plans = append(f.plans, p)
	return nil
}

func newTestManager(t *testing.T, store *fakePlanStore, seed []model.Plan) *PlanManager {
	t.Helper()
	m, err := NewPlanManager(context.Background(), nil, nil, nil, store, seed, PlanManagerConfig{})
	require.NoError(t, err)
	return m
}

func TestNewPlanManagerSeedsEmptyStoreOnce(t *testing.T) {
	store := &fakePlanStore{}
	seed := []model.Plan{{ID: "basic", Default: true}, {ID: "pro"}}

	newTestManager(t, store, seed)
	require.Len(t, store.plans, 2)
	assert.Equal(t, 1, store.plans[1].SortOrder)

	// A non-empty store must win over the config file.
	store.plans[1].Title = "edited in console"
	m := newTestManager(t, store, []model.Plan{{ID: "other"}})
	assert.Len(t, store.plans, 2)
	assert.Equal(t, "edited in console", m.PlanByID("pro").Title)
	assert.Nil(t, m.PlanByID("other"))
}

func TestArchivedPlansAreHiddenButStillResolvable(t *testing.T) {
	store := &fakePlanStore{}
	m := newTestManager(t, store, []model.Plan{{ID: "basic", Default: true}, {ID: "old"}})

	require.NoError(t, store.SavePlan(context.Background(), model.PlanRecord{
		Plan: model.Plan{ID: "old"}, Archived: true, SortOrder: 1,
	}))
	require.NoError(t, m.Reload(context.Background()))

	assert.Len(t, m.Plans(), 1)
	assert.NotNil(t, m.PlanByID("old"), "existing entitlements must still resolve archived plans")
	assert.True(t, m.IsArchived("old"))
	assert.False(t, m.IsArchived("basic"))
}

func TestReloadPicksUpEditedPlan(t *testing.T) {
	store := &fakePlanStore{}
	m := newTestManager(t, store, []model.Plan{{ID: "basic", Default: true, FeatureMaxCommands: 7}})
	assert.Equal(t, 7, m.PlanByID("basic").FeatureMaxCommands)

	require.NoError(t, store.SavePlan(context.Background(), model.PlanRecord{
		Plan: model.Plan{ID: "basic", Default: true, FeatureMaxCommands: 99},
	}))
	require.NoError(t, m.Reload(context.Background()))
	assert.Equal(t, 99, m.PlanByID("basic").FeatureMaxCommands)
}
