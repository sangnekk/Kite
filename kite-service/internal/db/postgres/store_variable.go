package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"gopkg.in/guregu/null.v4"
)

func (c *Client) VariablesByApp(ctx context.Context, appID string) ([]*model.Variable, error) {
	rows, err := c.Q.GetVariablesByApp(ctx, appID)
	if err != nil {
		return nil, err
	}

	variables := make([]*model.Variable, len(rows))
	for i, row := range rows {
		v := rowToVariable(row.Variable)
		v.TotalValues = null.NewInt(row.TotalValues, true)
		variables[i] = v
	}

	return variables, nil
}

func (c *Client) CountVariablesByApp(ctx context.Context, appID string) (int, error) {
	res, err := c.Q.CountVariablesByApp(ctx, appID)
	if err != nil {
		return 0, err
	}
	return int(res), nil
}

func (c *Client) Variable(ctx context.Context, id string) (*model.Variable, error) {
	row, err := c.Q.GetVariable(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	v := rowToVariable(row.Variable)
	v.TotalValues = null.NewInt(row.TotalValues, true)
	return v, nil
}

func (c *Client) VariableByName(ctx context.Context, appID, name string) (*model.Variable, error) {
	row, err := c.Q.GetVariableByName(ctx, pgmodel.GetVariableByNameParams{
		AppID: appID,
		Name:  name,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	v := rowToVariable(row.Variable)
	v.TotalValues = null.NewInt(row.TotalValues, true)
	return v, nil
}

func (c *Client) CreateVariable(ctx context.Context, variable *model.Variable) (*model.Variable, error) {
	row, err := c.Q.CreateVariable(ctx, pgmodel.CreateVariableParams{
		ID:     variable.ID,
		Name:   variable.Name,
		Scoped: variable.Scoped,
		AppID:  variable.AppID,
		ModuleID: pgtype.Text{
			String: variable.ModuleID.String,
			Valid:  variable.ModuleID.Valid,
		},
		CreatedAt: pgtype.Timestamp{
			Time:  variable.CreatedAt.UTC(),
			Valid: true,
		},
		UpdatedAt: pgtype.Timestamp{
			Time:  variable.UpdatedAt.UTC(),
			Valid: true,
		},
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, store.ErrAlreadyExists
		}
		return nil, err
	}

	return rowToVariable(row), nil
}

func (c *Client) UpdateVariable(ctx context.Context, variable *model.Variable) (*model.Variable, error) {
	row, err := c.Q.UpdateVariable(ctx, pgmodel.UpdateVariableParams{
		ID:     variable.ID,
		Name:   variable.Name,
		Scoped: variable.Scoped,
		UpdatedAt: pgtype.Timestamp{
			Time:  variable.UpdatedAt.UTC(),
			Valid: true,
		},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return rowToVariable(row), nil
}

func (c *Client) DeleteVariable(ctx context.Context, id string) error {
	err := c.Q.DeleteVariable(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.ErrNotFound
		}
		return err
	}

	return nil
}

func rowToVariable(row pgmodel.Variable) *model.Variable {
	return &model.Variable{
		ID:        row.ID,
		Name:      row.Name,
		Scoped:    row.Scoped,
		AppID:     row.AppID,
		ModuleID:  null.NewString(row.ModuleID.String, row.ModuleID.Valid),
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}

func (c *Client) VariableValues(ctx context.Context, variableID string) ([]*model.VariableValue, error) {
	rows, err := c.Q.GetVariableValues(ctx, variableID)
	if err != nil {
		return nil, err
	}

	var values []*model.VariableValue
	for _, row := range rows {
		v, err := rowToVariableValue(row)
		if err != nil {
			return nil, err
		}
		values = append(values, &v)
	}

	return values, nil
}

func (c *Client) VariableValue(ctx context.Context, variableID string, scope null.String) (*model.VariableValue, error) {
	row, err := c.Q.GetVariableValue(ctx, pgmodel.GetVariableValueParams{
		VariableID: variableID,
		Scope:      pgtype.Text{String: scope.String, Valid: scope.Valid},
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	v, err := rowToVariableValue(row)
	if err != nil {
		return nil, err
	}

	return &v, nil
}

func (c *Client) SetVariableValue(ctx context.Context, value model.VariableValue) error {
	_, err := c.setVariableValueWithTx(ctx, nil, value)
	return err
}

func (c *Client) UpdateVariableValue(ctx context.Context, operation model.VariableValueOperation, value model.VariableValue) (*model.VariableValue, error) {
	if operation == provider.VariableOperationOverwrite {
		return c.setVariableValueWithTx(ctx, nil, value)
	}

	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	currentValue, err := c.variableValueWithTx(ctx, tx, value.VariableID, value.Scope)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			// Current trasaction is rolled back, we set the value outside of the transaction
			return c.setVariableValueWithTx(ctx, nil, value)
		}
		return nil, fmt.Errorf("failed to get current variable value: %w", err)
	}

	switch operation {
	case provider.VariableOperationAppend:
		value.Data = currentValue.Data.Append(value.Data)
	case provider.VariableOperationPrepend:
		value.Data = value.Data.Append(currentValue.Data)
	case provider.VariableOperationIncrement:
		value.Data = currentValue.Data.Add(value.Data)
	case provider.VariableOperationDecrement:
		value.Data = currentValue.Data.Sub(value.Data)
	}

	newValue, err := c.setVariableValueWithTx(ctx, tx, value)
	if err != nil {
		return nil, fmt.Errorf("failed to set variable value: %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return newValue, nil
}

func (c *Client) DeleteVariableValue(ctx context.Context, variableID string, scope null.String) error {
	err := c.Q.DeleteVariableValue(ctx, pgmodel.DeleteVariableValueParams{
		VariableID: variableID,
		Scope:      pgtype.Text{String: scope.String, Valid: scope.Valid},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.ErrNotFound
		}
		return err
	}

	return nil
}

func (c *Client) DeleteAllVariableValues(ctx context.Context, variableID string) error {
	err := c.Q.DeleteAllVariableValues(ctx, variableID)
	if err != nil {
		return err
	}

	return nil
}

func (c *Client) SpendVariableValue(ctx context.Context, variableID string, scope null.String, amount thing.Thing, allowNegative bool) (*model.VariableValue, error) {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	current := thing.NewFloat(0.0)
	currentValue, err := c.variableValueWithTx(ctx, tx, variableID, scope)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			return nil, fmt.Errorf("failed to get current variable value: %w", err)
		}
	} else {
		current = currentValue.Data
	}

	if !allowNegative && current.Float() < amount.Float() {
		return nil, store.ErrInsufficientFunds
	}

	now := time.Now().UTC()
	newValue, err := c.setVariableValueWithTx(ctx, tx, model.VariableValue{
		VariableID: variableID,
		Scope:      scope,
		Data:       current.Sub(amount),
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to set variable value: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return newValue, nil
}

func (c *Client) TransferVariableValue(ctx context.Context, variableID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (*model.VariableValue, *model.VariableValue, error) {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the affected rows in a deterministic order (sorted by scope key) so two
	// concurrent transfers between the same scopes can't deadlock each other.
	lockOrder := []null.String{fromScope, toScope}
	if scopeKey(toScope) < scopeKey(fromScope) {
		lockOrder = []null.String{toScope, fromScope}
	}

	balances := make(map[string]thing.Thing, 2)
	for _, s := range lockOrder {
		if _, ok := balances[scopeKey(s)]; ok {
			continue
		}
		balances[scopeKey(s)] = thing.NewFloat(0.0)
		row, err := c.variableValueWithTx(ctx, tx, variableID, s)
		if err != nil {
			if !errors.Is(err, store.ErrNotFound) {
				return nil, nil, fmt.Errorf("failed to get current variable value: %w", err)
			}
		} else {
			balances[scopeKey(s)] = row.Data
		}
	}

	fromCurrent := balances[scopeKey(fromScope)]
	if !allowNegative && fromCurrent.Float() < amount.Float() {
		return nil, nil, store.ErrInsufficientFunds
	}

	// Transferring to the same scope is a no-op: just return the current balance.
	if scopeKey(fromScope) == scopeKey(toScope) {
		row, err := c.variableValueWithTx(ctx, tx, variableID, fromScope)
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			return nil, nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
		}
		if row == nil {
			return nil, nil, store.ErrNotFound
		}
		return row, row, nil
	}

	now := time.Now().UTC()
	newFrom, err := c.setVariableValueWithTx(ctx, tx, model.VariableValue{
		VariableID: variableID,
		Scope:      fromScope,
		Data:       fromCurrent.Sub(amount),
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to set sender variable value: %w", err)
	}

	newTo, err := c.setVariableValueWithTx(ctx, tx, model.VariableValue{
		VariableID: variableID,
		Scope:      toScope,
		Data:       balances[scopeKey(toScope)].Add(amount),
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to set recipient variable value: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return newFrom, newTo, nil
}

func (c *Client) VariableValuesTop(ctx context.Context, variableID string, limit int) ([]*model.VariableValue, error) {
	// thing.Thing is stored as JSONB shaped like {"t": "int", "v": 500}; we order by
	// the inner numeric value and skip any entry whose value isn't a number.
	rows, err := c.DB.Query(ctx, `
SELECT id, variable_id, scope, value, created_at, updated_at
FROM variable_values
WHERE variable_id = $1 AND jsonb_typeof(value->'v') = 'number'
ORDER BY (value->>'v')::numeric DESC
LIMIT $2
`, variableID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var values []*model.VariableValue
	for rows.Next() {
		var row pgmodel.VariableValue
		if err := rows.Scan(
			&row.ID,
			&row.VariableID,
			&row.Scope,
			&row.Value,
			&row.CreatedAt,
			&row.UpdatedAt,
		); err != nil {
			return nil, err
		}

		v, err := rowToVariableValue(row)
		if err != nil {
			return nil, err
		}
		values = append(values, &v)
	}

	return values, rows.Err()
}

func (c *Client) ConsumeCooldown(ctx context.Context, variableID string, scope null.String, nowUnix, durationSeconds int64, consume bool) (bool, int64, error) {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return false, 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var lastUsed int64
	current, err := c.variableValueWithTx(ctx, tx, variableID, scope)
	if err != nil {
		if !errors.Is(err, store.ErrNotFound) {
			return false, 0, fmt.Errorf("failed to get cooldown value: %w", err)
		}
	} else {
		lastUsed = current.Data.Int()
	}

	elapsed := nowUnix - lastUsed
	allowed := lastUsed == 0 || elapsed >= durationSeconds
	if !allowed {
		remaining := durationSeconds - elapsed
		if remaining < 0 {
			remaining = 0
		}
		return false, remaining, nil
	}

	if consume {
		now := time.Now().UTC()
		if _, err := c.setVariableValueWithTx(ctx, tx, model.VariableValue{
			VariableID: variableID,
			Scope:      scope,
			Data:       thing.NewInt(nowUnix),
			CreatedAt:  now,
			UpdatedAt:  now,
		}); err != nil {
			return false, 0, fmt.Errorf("failed to set cooldown value: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return true, 0, nil
}

// scopeKey returns a stable string key for a nullable scope so it can be used in
// maps and ordering. A NULL scope sorts before any real scope.
func scopeKey(scope null.String) string {
	if !scope.Valid {
		return "\x00"
	}
	return "\x01" + scope.String
}

func (c *Client) variableValueWithTx(ctx context.Context, tx pgx.Tx, variableID string, scope null.String) (*model.VariableValue, error) {
	q := c.Q
	if tx != nil {
		q = c.Q.WithTx(tx)
	}

	row, err := q.GetVariableValueForUpdate(ctx, pgmodel.GetVariableValueForUpdateParams{
		VariableID: variableID,
		Scope:      pgtype.Text{String: scope.String, Valid: scope.Valid},
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	v, err := rowToVariableValue(row)
	if err != nil {
		return nil, err
	}

	return &v, nil
}

func (c *Client) setVariableValueWithTx(ctx context.Context, tx pgx.Tx, value model.VariableValue) (*model.VariableValue, error) {
	q := c.Q
	if tx != nil {
		q = c.Q.WithTx(tx)
	}

	data, err := json.Marshal(value.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal variable value: %w", err)
	}

	row, err := q.SetVariableValue(ctx, pgmodel.SetVariableValueParams{
		VariableID: value.VariableID,
		Scope:      pgtype.Text{String: value.Scope.String, Valid: value.Scope.Valid},
		Value:      data,
		CreatedAt:  pgtype.Timestamp{Time: value.CreatedAt, Valid: true},
		UpdatedAt:  pgtype.Timestamp{Time: value.UpdatedAt, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	v, err := rowToVariableValue(row)
	if err != nil {
		return nil, err
	}

	return &v, nil
}

func rowToVariableValue(row pgmodel.VariableValue) (model.VariableValue, error) {
	var data thing.Thing
	err := json.Unmarshal(row.Value, &data)
	if err != nil {
		return model.VariableValue{}, fmt.Errorf("failed to unmarshal variable value: %w", err)
	}

	return model.VariableValue{
		ID:         uint64(row.ID),
		VariableID: row.VariableID,
		Scope:      null.NewString(row.Scope.String, row.Scope.Valid),
		Data:       data,
		CreatedAt:  row.CreatedAt.Time,
		UpdatedAt:  row.UpdatedAt.Time,
	}, nil
}
