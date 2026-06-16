package provider

import (
	"context"

	"gopkg.in/guregu/null.v4"
)

// CooldownResult is the outcome of a cooldown check.
type CooldownResult struct {
	// Allowed is true when enough time has elapsed (or the cooldown was never used).
	Allowed bool
	// Remaining is the number of seconds left until the cooldown expires (0 when allowed).
	Remaining int64
}

// CooldownProvider checks per-scope cooldowns backed by a variable that stores
// the last-use unix timestamp.
type CooldownProvider interface {
	// Check reports whether the scope may act again after durationSeconds. When
	// consume is true and the action is allowed, the cooldown is reset to now.
	Check(ctx context.Context, cooldownID string, scope null.String, durationSeconds int64, consume bool) (CooldownResult, error)
}

type MockCooldownProvider struct{}

func (p *MockCooldownProvider) Check(ctx context.Context, cooldownID string, scope null.String, durationSeconds int64, consume bool) (CooldownResult, error) {
	return CooldownResult{Allowed: true}, nil
}
