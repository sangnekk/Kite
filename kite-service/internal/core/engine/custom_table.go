package engine

import (
	"context"
	"errors"
	"fmt"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type CustomTableProvider struct {
	appID string
	store store.CustomTableStore
}

func NewCustomTableProvider(appID string, tableStore store.CustomTableStore) *CustomTableProvider {
	return &CustomTableProvider{appID: appID, store: tableStore}
}

func (p *CustomTableProvider) Insert(ctx context.Context, tableID, scopeID string, fields map[string]any) (provider.CustomTableInsertResult, error) {
	table, err := p.table(ctx, tableID)
	if err != nil {
		return provider.CustomTableInsertResult{}, err
	}
	row, err := p.store.InsertCustomTableRow(ctx, table, scopeID, fields)
	if err != nil {
		return provider.CustomTableInsertResult{}, err
	}
	return provider.CustomTableInsertResult{Row: flowCustomTableRow(table, row)}, nil
}

func (p *CustomTableProvider) FindOne(ctx context.Context, tableID string, query provider.CustomTableQueryRequest) (provider.CustomTableFindOneResult, error) {
	table, err := p.table(ctx, tableID)
	if err != nil {
		return provider.CustomTableFindOneResult{}, err
	}
	query.Limit = 1
	rows, _, err := p.store.QueryCustomTableRows(ctx, table, query)
	if err != nil {
		return provider.CustomTableFindOneResult{}, err
	}
	if len(rows) == 0 {
		return provider.CustomTableFindOneResult{Found: false}, nil
	}
	row := flowCustomTableRow(table, rows[0])
	return provider.CustomTableFindOneResult{Found: true, Row: &row}, nil
}

func (p *CustomTableProvider) Query(ctx context.Context, tableID string, query provider.CustomTableQueryRequest) (provider.CustomTableQueryResult, error) {
	table, err := p.table(ctx, tableID)
	if err != nil {
		return provider.CustomTableQueryResult{}, err
	}
	rows, total, err := p.store.QueryCustomTableRows(ctx, table, query)
	if err != nil {
		return provider.CustomTableQueryResult{}, err
	}
	result := make([]provider.CustomTableRowValue, len(rows))
	for i, row := range rows {
		result[i] = flowCustomTableRow(table, row)
	}
	return provider.CustomTableQueryResult{Rows: result, Count: int64(len(result)), TotalCount: total}, nil
}

func (p *CustomTableProvider) Update(ctx context.Context, tableID string, query provider.CustomTableQueryRequest, mutations []provider.CustomTableMutation) (provider.CustomTableMutationResult, error) {
	table, err := p.table(ctx, tableID)
	if err != nil {
		return provider.CustomTableMutationResult{}, err
	}
	count, err := p.store.UpdateCustomTableRows(ctx, table, query, mutations)
	if err != nil {
		return provider.CustomTableMutationResult{}, err
	}
	return provider.CustomTableMutationResult{AffectedRows: count}, nil
}

func (p *CustomTableProvider) Delete(ctx context.Context, tableID string, query provider.CustomTableQueryRequest) (provider.CustomTableMutationResult, error) {
	table, err := p.table(ctx, tableID)
	if err != nil {
		return provider.CustomTableMutationResult{}, err
	}
	count, err := p.store.DeleteCustomTableRows(ctx, table, query)
	if err != nil {
		return provider.CustomTableMutationResult{}, err
	}
	return provider.CustomTableMutationResult{AffectedRows: count}, nil
}

func (p *CustomTableProvider) table(ctx context.Context, id string) (*model.CustomTable, error) {
	if p.store == nil {
		return nil, fmt.Errorf("custom table service is unavailable")
	}
	table, err := p.store.CustomTable(ctx, id)
	if errors.Is(err, store.ErrNotFound) {
		return nil, fmt.Errorf("custom table no longer exists")
	}
	if err != nil {
		return nil, fmt.Errorf("resolve custom table: %w", err)
	}
	if table.AppID != p.appID {
		return nil, fmt.Errorf("custom table belongs to another app")
	}
	return table, nil
}

func flowCustomTableRow(table *model.CustomTable, row *model.CustomTableRow) provider.CustomTableRowValue {
	data := make(map[string]any, len(table.Schema.Columns)+5)
	data["id"] = row.ID.String()
	data["scope_id"] = row.ScopeID
	data["version"] = row.Version
	data["created_at"] = row.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
	data["updated_at"] = row.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z07:00")
	for _, column := range table.Schema.Columns {
		if value, ok := row.Data[column.ID]; ok {
			data[column.Name] = value
		}
	}
	return provider.CustomTableRowValue{
		ID: row.ID.String(), ScopeID: row.ScopeID, Data: data, Version: row.Version,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}
}
