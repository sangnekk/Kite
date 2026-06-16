package engine

import (
	"context"
	"errors"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"
)

// fakeVariableValueStore is a minimal VariableValueStore used to exercise the
// EconomyProvider's delegation and error translation without a real database.
type fakeVariableValueStore struct {
	spendErr     error
	transferErr  error
	spentValue   *model.VariableValue
	transferFrom *model.VariableValue
	transferTo   *model.VariableValue
	topValues    []*model.VariableValue
	updatedValue *model.VariableValue
	gotValue     *model.VariableValue
	gotOperation model.VariableValueOperation
	gotAllowNeg  bool
}

func (s *fakeVariableValueStore) VariableValues(ctx context.Context, variableID string) ([]*model.VariableValue, error) {
	return nil, nil
}

func (s *fakeVariableValueStore) VariableValue(ctx context.Context, variableID string, scope null.String) (*model.VariableValue, error) {
	if s.gotValue != nil {
		return s.gotValue, nil
	}
	return nil, store.ErrNotFound
}

func (s *fakeVariableValueStore) SetVariableValue(ctx context.Context, value model.VariableValue) error {
	return nil
}

func (s *fakeVariableValueStore) UpdateVariableValue(ctx context.Context, operation model.VariableValueOperation, value model.VariableValue) (*model.VariableValue, error) {
	s.gotOperation = operation
	v := value
	s.updatedValue = &v
	return &v, nil
}

func (s *fakeVariableValueStore) DeleteVariableValue(ctx context.Context, variableID string, scope null.String) error {
	return nil
}

func (s *fakeVariableValueStore) DeleteAllVariableValues(ctx context.Context, variableID string) error {
	return nil
}

func (s *fakeVariableValueStore) SpendVariableValue(ctx context.Context, variableID string, scope null.String, amount thing.Thing, allowNegative bool) (*model.VariableValue, error) {
	s.gotAllowNeg = allowNegative
	if s.spendErr != nil {
		return nil, s.spendErr
	}
	return s.spentValue, nil
}

func (s *fakeVariableValueStore) TransferVariableValue(ctx context.Context, variableID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (*model.VariableValue, *model.VariableValue, error) {
	if s.transferErr != nil {
		return nil, nil, s.transferErr
	}
	return s.transferFrom, s.transferTo, nil
}

func (s *fakeVariableValueStore) VariableValuesTop(ctx context.Context, variableID string, limit int) ([]*model.VariableValue, error) {
	return s.topValues, nil
}

func (s *fakeVariableValueStore) ConsumeCooldown(ctx context.Context, variableID string, scope null.String, nowUnix, durationSeconds int64, consume bool) (bool, int64, error) {
	return true, 0, nil
}

func TestEconomyProviderAddBalanceUsesIncrement(t *testing.T) {
	fake := &fakeVariableValueStore{}
	p := NewEconomyProvider(fake)

	_, err := p.AddBalance(context.Background(), "var_coins", null.StringFrom("123"), thing.NewInt(100))
	require.NoError(t, err)
	assert.Equal(t, provider.VariableOperationIncrement, fake.gotOperation)
}

func TestEconomyProviderGetBalanceMissingIsZero(t *testing.T) {
	fake := &fakeVariableValueStore{} // VariableValue returns ErrNotFound
	p := NewEconomyProvider(fake)

	balance, err := p.GetBalance(context.Background(), "var_coins", null.StringFrom("123"))
	require.NoError(t, err)
	assert.Equal(t, float64(0), balance.Float())
}

func TestEconomyProviderRemoveBalanceTranslatesInsufficientFunds(t *testing.T) {
	fake := &fakeVariableValueStore{spendErr: store.ErrInsufficientFunds}
	p := NewEconomyProvider(fake)

	_, err := p.RemoveBalance(context.Background(), "var_coins", null.StringFrom("123"), thing.NewInt(100), false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, provider.ErrInsufficientFunds))
}

func TestEconomyProviderTransferTranslatesInsufficientFunds(t *testing.T) {
	fake := &fakeVariableValueStore{transferErr: store.ErrInsufficientFunds}
	p := NewEconomyProvider(fake)

	_, err := p.Transfer(context.Background(), "var_coins", null.StringFrom("111"), null.StringFrom("222"), thing.NewInt(100), false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, provider.ErrInsufficientFunds))
}

func TestEconomyProviderLeaderboardMapsEntries(t *testing.T) {
	fake := &fakeVariableValueStore{topValues: []*model.VariableValue{
		{Scope: null.StringFrom("111"), Data: thing.NewInt(900)},
		{Scope: null.StringFrom("222"), Data: thing.NewInt(500)},
	}}
	p := NewEconomyProvider(fake)

	entries, err := p.Leaderboard(context.Background(), "var_coins", 10)
	require.NoError(t, err)
	require.Len(t, entries, 2)
	assert.Equal(t, "111", entries[0].Scope)
	assert.Equal(t, int64(900), entries[0].Balance.Int())
	assert.Equal(t, "222", entries[1].Scope)
}
