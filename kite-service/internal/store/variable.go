package store

import (
	"context"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"gopkg.in/guregu/null.v4"
)

type VariableStore interface {
	VariablesByApp(ctx context.Context, appID string) ([]*model.Variable, error)
	CountVariablesByApp(ctx context.Context, appID string) (int, error)
	Variable(ctx context.Context, id string) (*model.Variable, error)
	VariableByName(ctx context.Context, appID, name string) (*model.Variable, error)
	CreateVariable(ctx context.Context, variable *model.Variable) (*model.Variable, error)
	UpdateVariable(ctx context.Context, variable *model.Variable) (*model.Variable, error)
	DeleteVariable(ctx context.Context, id string) error
}

type VariableValueStore interface {
	VariableValues(ctx context.Context, variableID string) ([]*model.VariableValue, error)
	VariableValue(ctx context.Context, variableID string, scope null.String) (*model.VariableValue, error)
	SetVariableValue(ctx context.Context, value model.VariableValue) error
	UpdateVariableValue(ctx context.Context, operation model.VariableValueOperation, value model.VariableValue) (*model.VariableValue, error)
	DeleteVariableValue(ctx context.Context, variableID string, scope null.String) error
	DeleteAllVariableValues(ctx context.Context, variableID string) error

	// SpendVariableValue atomically decrements the value for a scope, treating a
	// missing value as zero. When allowNegative is false and the resulting value
	// would be below zero it returns ErrInsufficientFunds and makes no change.
	SpendVariableValue(ctx context.Context, variableID string, scope null.String, amount thing.Thing, allowNegative bool) (*model.VariableValue, error)
	// TransferVariableValue atomically moves amount from one scope to another within
	// a single transaction. When allowNegative is false and the sender lacks funds it
	// returns ErrInsufficientFunds and makes no change.
	TransferVariableValue(ctx context.Context, variableID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (fromValue, toValue *model.VariableValue, err error)
	// VariableValuesTop returns up to limit values for a variable ordered by their
	// numeric value, highest first. Non-numeric values are skipped.
	VariableValuesTop(ctx context.Context, variableID string, limit int) ([]*model.VariableValue, error)
}
