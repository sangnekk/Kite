package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type CustomTableStore interface {
	CustomTablesByApp(ctx context.Context, appID string) ([]*model.CustomTable, error)
	CountCustomTablesByApp(ctx context.Context, appID string) (int, error)
	CustomTable(ctx context.Context, id string) (*model.CustomTable, error)
	CreateCustomTable(ctx context.Context, table *model.CustomTable) (*model.CustomTable, error)
	UpdateCustomTable(ctx context.Context, table *model.CustomTable) (*model.CustomTable, error)
	DeleteCustomTable(ctx context.Context, id string) error

	InsertCustomTableRow(ctx context.Context, table *model.CustomTable, scopeID string, data map[string]any) (*model.CustomTableRow, error)
	CustomTableRow(ctx context.Context, tableID string, rowID uuid.UUID) (*model.CustomTableRow, error)
	QueryCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest) ([]*model.CustomTableRow, int64, error)
	PatchCustomTableRow(ctx context.Context, table *model.CustomTable, rowID uuid.UUID, fields map[string]any) (*model.CustomTableRow, error)
	UpdateCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest, mutations []provider.CustomTableMutation) (int64, error)
	DeleteCustomTableRow(ctx context.Context, tableID string, rowID uuid.UUID) error
	DeleteCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest) (int64, error)
	ImportCustomTableRows(ctx context.Context, table *model.CustomTable, scopeID string, rows []map[string]any, replace bool) (int, error)
	ExportCustomTableRows(ctx context.Context, table *model.CustomTable, scopeID string, limit int) ([]*model.CustomTableRow, error)
}
