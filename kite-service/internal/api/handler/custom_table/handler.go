package custom_table

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type Handler struct{ store store.CustomTableStore }

func NewHandler(store store.CustomTableStore) *Handler { return &Handler{store: store} }

func (h *Handler) List(c *handler.Context) (*wire.CustomTableListResponse, error) {
	tables, err := h.store.CustomTablesByApp(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("list custom tables: %w", err)
	}
	result := make([]*wire.CustomTable, len(tables))
	for i, table := range tables {
		result[i] = wire.CustomTableToWire(table)
	}
	return &result, nil
}

func (h *Handler) Get(c *handler.Context) (*wire.CustomTableGetResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	return wire.CustomTableToWire(table), nil
}

func (h *Handler) Create(c *handler.Context, req wire.CustomTableCreateRequest) (*wire.CustomTableCreateResponse, error) {
	if c.Features.MaxCustomTables >= 0 {
		tableCount, err := h.store.CountCustomTablesByApp(c.Context(), c.App.ID)
		if err != nil {
			return nil, fmt.Errorf("count custom tables: %w", err)
		}
		if customTableLimitReached(tableCount, c.Features.MaxCustomTables) {
			return nil, handler.ErrBadRequest(
				"resource_limit",
				customTableLimitMessage(c.Features.MaxCustomTables),
			)
		}
	}
	schema, err := schemaForCreate(req.Schema)
	if err != nil {
		return nil, handler.ErrBadRequest("invalid_schema", err.Error())
	}
	now := time.Now().UTC()
	table, err := h.store.CreateCustomTable(c.Context(), &model.CustomTable{
		ID: util.UniqueID(), AppID: c.App.ID, Name: req.Name, Description: req.Description,
		Scope: defaultScope(req.Scope), Schema: schema, CreatedAt: now, UpdatedAt: now,
	})
	if err != nil {
		return nil, customTableError(err)
	}
	return wire.CustomTableToWire(table), nil
}

func customTableLimitReached(current, limit int) bool {
	return limit >= 0 && current >= limit
}

func customTableLimitMessage(limit int) string {
	if limit == 0 {
		return "Gói hiện tại không hỗ trợ tạo bảng dữ liệu"
	}
	return fmt.Sprintf("Gói hiện tại cho phép tối đa %d bảng dữ liệu", limit)
}

func (h *Handler) Update(c *handler.Context, req wire.CustomTableUpdateRequest) (*wire.CustomTableUpdateResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	if defaultScope(req.Scope) != table.Scope {
		return nil, handler.ErrBadRequest("scope_immutable", "Không thể đổi phạm vi sau khi bảng đã được tạo")
	}
	schema, err := schemaForUpdate(table.Schema, req.Schema)
	if err != nil {
		return nil, handler.ErrBadRequest("invalid_schema", err.Error())
	}
	table.Name = req.Name
	table.Description = req.Description
	table.Schema = schema
	table.UpdatedAt = time.Now().UTC()
	table, err = h.store.UpdateCustomTable(c.Context(), table)
	if err != nil {
		return nil, customTableError(err)
	}
	return wire.CustomTableToWire(table), nil
}

func (h *Handler) Delete(c *handler.Context) (*wire.CustomTableDeleteResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	if err := h.store.DeleteCustomTable(c.Context(), table.ID); err != nil {
		return nil, customTableError(err)
	}
	return &wire.CustomTableDeleteResponse{}, nil
}

func (h *Handler) InsertRow(c *handler.Context, req wire.CustomTableRowInsertRequest) (*wire.CustomTableRowInsertResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	row, err := h.store.InsertCustomTableRow(c.Context(), table, req.ScopeID, req.Fields)
	if err != nil {
		return nil, customTableError(err)
	}
	return wire.CustomTableRowToWire(row), nil
}

func (h *Handler) QueryRows(c *handler.Context, req wire.CustomTableRowQueryRequest) (*wire.CustomTableRowQueryResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	rows, total, err := h.store.QueryCustomTableRows(c.Context(), table, req.ToProvider())
	if err != nil {
		return nil, customTableError(err)
	}
	result := make([]*wire.CustomTableRow, len(rows))
	for i, row := range rows {
		result[i] = wire.CustomTableRowToWire(row)
	}
	return &wire.CustomTableRowQueryResponse{Rows: result, Count: len(result), TotalCount: total}, nil
}

func (h *Handler) PatchRow(c *handler.Context, req wire.CustomTableRowPatchRequest) (*wire.CustomTableRowPatchResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	rowID, err := uuid.Parse(c.Param("rowID"))
	if err != nil {
		return nil, handler.ErrNotFound("unknown_row", "Không tìm thấy dòng dữ liệu")
	}
	row, err := h.store.PatchCustomTableRow(c.Context(), table, rowID, req.Fields)
	if err != nil {
		return nil, customTableError(err)
	}
	return wire.CustomTableRowToWire(row), nil
}

func (h *Handler) DeleteRow(c *handler.Context) (*wire.CustomTableRowDeleteResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	rowID, err := uuid.Parse(c.Param("rowID"))
	if err != nil {
		return nil, handler.ErrNotFound("unknown_row", "Không tìm thấy dòng dữ liệu")
	}
	if err := h.store.DeleteCustomTableRow(c.Context(), table.ID, rowID); err != nil {
		return nil, customTableError(err)
	}
	return &wire.CustomTableRowDeleteResponse{}, nil
}

func (h *Handler) UpdateRows(c *handler.Context, req wire.CustomTableRowsUpdateRequest) (*wire.CustomTableMutationResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	updates := make([]provider.CustomTableMutation, len(req.Updates))
	for i, update := range req.Updates {
		updates[i] = provider.CustomTableMutation{ColumnID: update.ColumnID, Operation: update.Operation, Value: update.Value}
	}
	count, err := h.store.UpdateCustomTableRows(c.Context(), table, req.Query.ToProvider(), updates)
	if err != nil {
		return nil, customTableError(err)
	}
	return &wire.CustomTableMutationResponse{AffectedRows: count}, nil
}

func (h *Handler) DeleteRows(c *handler.Context, req wire.CustomTableRowsDeleteRequest) (*wire.CustomTableMutationResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	count, err := h.store.DeleteCustomTableRows(c.Context(), table, req.Query.ToProvider())
	if err != nil {
		return nil, customTableError(err)
	}
	return &wire.CustomTableMutationResponse{AffectedRows: count}, nil
}

func (h *Handler) tableForApp(c *handler.Context) (*model.CustomTable, error) {
	table, err := h.store.CustomTable(c.Context(), c.Param("tableID"))
	if errors.Is(err, store.ErrNotFound) || (err == nil && table.AppID != c.App.ID) {
		return nil, handler.ErrNotFound("unknown_table", "Không tìm thấy bảng dữ liệu")
	}
	if err != nil {
		return nil, fmt.Errorf("get custom table: %w", err)
	}
	return table, nil
}

func defaultScope(scope provider.CustomTableScope) provider.CustomTableScope {
	if scope == "" {
		return provider.CustomTableScopeApp
	}
	return scope
}

func schemaForCreate(input wire.CustomTableSchema) (provider.CustomTableSchema, error) {
	columns := make([]provider.CustomTableColumn, len(input.Columns))
	for i, column := range input.Columns {
		id := column.ID
		if id == "" {
			id = "col_" + util.UniqueID()
		}
		columns[i] = provider.CustomTableColumn{
			ID: id, Name: column.Name, Type: column.Type, Required: column.Required,
			Unique: column.Unique, HasDefault: column.HasDefault, DefaultValue: column.DefaultValue,
		}
	}
	schema := provider.CustomTableSchema{Columns: columns}
	return schema, schema.Validate()
}

func schemaForUpdate(current provider.CustomTableSchema, input wire.CustomTableSchema) (provider.CustomTableSchema, error) {
	known := make(map[string]struct{}, len(current.Columns))
	for _, column := range current.Columns {
		known[column.ID] = struct{}{}
	}
	columns := make([]provider.CustomTableColumn, len(input.Columns))
	for i, column := range input.Columns {
		id := column.ID
		if id == "" {
			id = "col_" + util.UniqueID()
		} else if _, ok := known[id]; !ok {
			return provider.CustomTableSchema{}, fmt.Errorf("unknown column id %q", id)
		}
		columns[i] = provider.CustomTableColumn{
			ID: id, Name: column.Name, Type: column.Type, Required: column.Required,
			Unique: column.Unique, HasDefault: column.HasDefault, DefaultValue: column.DefaultValue,
		}
	}
	schema := provider.CustomTableSchema{Columns: columns}
	return schema, schema.Validate()
}

func customTableError(err error) error {
	switch {
	case errors.Is(err, store.ErrNotFound):
		return handler.ErrNotFound("not_found", "Không tìm thấy dữ liệu")
	case errors.Is(err, store.ErrAlreadyExists):
		return handler.ErrBadRequest("already_exists", customTableStoreErrorMessage(err, store.ErrAlreadyExists))
	case errors.Is(err, store.ErrInvalidData):
		return handler.ErrBadRequest("invalid_data", customTableStoreErrorMessage(err, store.ErrInvalidData))
	case errors.Is(err, store.ErrInvalidQuery):
		return handler.ErrBadRequest("invalid_query", customTableStoreErrorMessage(err, store.ErrInvalidQuery))
	default:
		return fmt.Errorf("custom table operation failed: %w", err)
	}
}

func customTableStoreErrorMessage(err, sentinel error) string {
	return strings.TrimPrefix(err.Error(), sentinel.Error()+": ")
}
