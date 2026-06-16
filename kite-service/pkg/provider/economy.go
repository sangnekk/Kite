package provider

import (
	"context"

	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"gopkg.in/guregu/null.v4"
)

// EconomyLeaderboardEntry is a single row of an economy leaderboard,
// pairing a scope (usually a user id) with its balance.
type EconomyLeaderboardEntry struct {
	Scope   string
	Balance thing.Thing
}

// EconomyTransferResult holds the resulting balances after a transfer.
type EconomyTransferResult struct {
	FromBalance thing.Thing
	ToBalance   thing.Thing
}

// EconomyProvider provides high-level economy operations on top of a currency.
// A "currency" is just a scoped variable: each scope (e.g. a user id) holds a
// numeric balance. These methods wrap the underlying variable value operations
// with numeric and balance-check semantics so flows don't have to wire them up
// by hand.
type EconomyProvider interface {
	// GetBalance returns the balance for the given scope. A missing balance is
	// treated as zero (no error).
	GetBalance(ctx context.Context, currencyID string, scope null.String) (thing.Thing, error)
	// AddBalance increments the balance for the given scope and returns the new balance.
	AddBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error)
	// RemoveBalance decrements the balance for the given scope. When allowNegative
	// is false and the balance would drop below zero it returns ErrInsufficientFunds.
	RemoveBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing, allowNegative bool) (thing.Thing, error)
	// SetBalance overwrites the balance for the given scope and returns the new balance.
	SetBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error)
	// Transfer atomically moves amount from one scope to another. When allowNegative
	// is false and the sender lacks funds it returns ErrInsufficientFunds.
	Transfer(ctx context.Context, currencyID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (EconomyTransferResult, error)
	// Leaderboard returns up to limit scopes ordered by balance, highest first.
	Leaderboard(ctx context.Context, currencyID string, limit int) ([]EconomyLeaderboardEntry, error)
}

type MockEconomyProvider struct{}

func (p *MockEconomyProvider) GetBalance(ctx context.Context, currencyID string, scope null.String) (thing.Thing, error) {
	return thing.NewFloat(0.0), nil
}

func (p *MockEconomyProvider) AddBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error) {
	return amount, nil
}

func (p *MockEconomyProvider) RemoveBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing, allowNegative bool) (thing.Thing, error) {
	return thing.NewFloat(0.0), nil
}

func (p *MockEconomyProvider) SetBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error) {
	return amount, nil
}

func (p *MockEconomyProvider) Transfer(ctx context.Context, currencyID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (EconomyTransferResult, error) {
	return EconomyTransferResult{FromBalance: thing.NewFloat(0.0), ToBalance: amount}, nil
}

func (p *MockEconomyProvider) Leaderboard(ctx context.Context, currencyID string, limit int) ([]EconomyLeaderboardEntry, error) {
	return nil, nil
}
