package wire

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

var customTableNameRegex = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

type CustomTableColumn struct {
	ID           string                         `json:"id"`
	Name         string                         `json:"name"`
	Type         provider.CustomTableColumnType `json:"type"`
	Required     bool                           `json:"required,omitempty"`
	Unique       bool                           `json:"unique,omitempty"`
	HasDefault   bool                           `json:"has_default,omitempty"`
	DefaultValue any                            `json:"default_value,omitempty"`
}

type CustomTableSchema struct {
	Columns []CustomTableColumn `json:"columns"`
}

type CustomTable struct {
	ID          string                    `json:"id"`
	AppID       string                    `json:"app_id"`
	Name        string                    `json:"name"`
	Description string                    `json:"description"`
	Scope       provider.CustomTableScope `json:"scope"`
	Schema      CustomTableSchema         `json:"schema"`
	CreatedAt   time.Time                 `json:"created_at"`
	UpdatedAt   time.Time                 `json:"updated_at"`
}

type CustomTableListResponse = []*CustomTable
type CustomTableGetResponse = CustomTable

type CustomTableCreateRequest struct {
	Name        string                    `json:"name"`
	Description string                    `json:"description"`
	Scope       provider.CustomTableScope `json:"scope"`
	Schema      CustomTableSchema         `json:"schema"`
}

func (r *CustomTableCreateRequest) Sanitize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Description = strings.TrimSpace(r.Description)
	for i := range r.Schema.Columns {
		r.Schema.Columns[i].Name = strings.TrimSpace(r.Schema.Columns[i].Name)
	}
}

func (r CustomTableCreateRequest) Validate() error {
	if r.Scope == "" {
		r.Scope = provider.CustomTableScopeApp
	}
	return validation.ValidateStruct(&r,
		validation.Field(&r.Name, validation.Required, validation.Match(customTableNameRegex)),
		validation.Field(&r.Description, validation.Length(0, 500)),
		validation.Field(&r.Scope, validation.In(provider.CustomTableScopeApp, provider.CustomTableScopeGuild)),
		validation.Field(&r.Schema, validation.By(func(value any) error {
			return r.Schema.toProvider().Validate()
		})),
	)
}

type CustomTableCreateResponse = CustomTable
type CustomTableUpdateRequest = CustomTableCreateRequest
type CustomTableUpdateResponse = CustomTable
type CustomTableDeleteResponse = Empty

type CustomTableFilter struct {
	ColumnID string                             `json:"column_id"`
	Operator provider.CustomTableFilterOperator `json:"operator"`
	Value    any                                `json:"value,omitempty"`
}

type CustomTableSort struct {
	ColumnID  string `json:"column_id"`
	Direction string `json:"direction"`
}

type CustomTableQueryRequest struct {
	ScopeID    string                         `json:"scope_id,omitempty"`
	FilterMode provider.CustomTableFilterMode `json:"filter_mode,omitempty"`
	Filters    []CustomTableFilter            `json:"filters,omitempty"`
	Sort       []CustomTableSort              `json:"sort,omitempty"`
	Limit      int                            `json:"limit,omitempty"`
	Offset     int                            `json:"offset,omitempty"`
}

func (r CustomTableQueryRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Limit, validation.Min(0), validation.Max(provider.MaxCustomTablePageSize)),
		validation.Field(&r.Offset, validation.Min(0)),
	)
}

type CustomTableRow struct {
	ID        string         `json:"id"`
	TableID   string         `json:"table_id"`
	ScopeID   string         `json:"scope_id,omitempty"`
	Data      map[string]any `json:"data"`
	Version   int64          `json:"version"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type CustomTableRowInsertRequest struct {
	ScopeID string         `json:"scope_id,omitempty"`
	Fields  map[string]any `json:"fields"`
}

func (r CustomTableRowInsertRequest) Validate() error {
	return validation.ValidateStruct(&r, validation.Field(&r.Fields, validation.NotNil))
}

type CustomTableRowInsertResponse = CustomTableRow

type CustomTableRowQueryRequest = CustomTableQueryRequest

type CustomTableRowQueryResponse struct {
	Rows       []*CustomTableRow `json:"rows"`
	Count      int               `json:"count"`
	TotalCount int64             `json:"total_count"`
}

type CustomTableRowPatchRequest struct {
	Fields map[string]any `json:"fields"`
}

func (r CustomTableRowPatchRequest) Validate() error {
	return validation.ValidateStruct(&r, validation.Field(&r.Fields, validation.Required))
}

type CustomTableRowPatchResponse = CustomTableRow
type CustomTableRowDeleteResponse = Empty

type CustomTableMutation struct {
	ColumnID  string                                `json:"column_id"`
	Operation provider.CustomTableMutationOperation `json:"operation"`
	Value     any                                   `json:"value,omitempty"`
}

type CustomTableRowsUpdateRequest struct {
	Query   CustomTableQueryRequest `json:"query"`
	Updates []CustomTableMutation   `json:"updates"`
}

func (r CustomTableRowsUpdateRequest) Validate() error {
	if err := r.Query.Validate(); err != nil {
		return err
	}
	return validation.ValidateStruct(&r, validation.Field(&r.Updates, validation.Required))
}

type CustomTableRowsDeleteRequest struct {
	Query CustomTableQueryRequest `json:"query"`
}

func (r CustomTableRowsDeleteRequest) Validate() error { return r.Query.Validate() }

type CustomTableMutationResponse struct {
	AffectedRows int64 `json:"affected_rows"`
}

type CustomTableTransferFormat string

const (
	CustomTableTransferFormatCSV  CustomTableTransferFormat = "csv"
	CustomTableTransferFormatJSON CustomTableTransferFormat = "json"
)

type CustomTableImportMode string

const (
	CustomTableImportModeAppend  CustomTableImportMode = "append"
	CustomTableImportModeReplace CustomTableImportMode = "replace"
)

type CustomTableImportRequest struct {
	ScopeID string                    `json:"scope_id,omitempty"`
	Format  CustomTableTransferFormat `json:"format"`
	Mode    CustomTableImportMode     `json:"mode"`
	Content string                    `json:"content"`
}

func (r *CustomTableImportRequest) Sanitize() {
	r.ScopeID = strings.TrimSpace(r.ScopeID)
	r.Format = CustomTableTransferFormat(strings.ToLower(strings.TrimSpace(string(r.Format))))
	r.Mode = CustomTableImportMode(strings.ToLower(strings.TrimSpace(string(r.Mode))))
	if r.Mode == "" {
		r.Mode = CustomTableImportModeAppend
	}
}

func (r CustomTableImportRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Format, validation.Required, validation.In(CustomTableTransferFormatCSV, CustomTableTransferFormatJSON)),
		validation.Field(&r.Mode, validation.Required, validation.In(CustomTableImportModeAppend, CustomTableImportModeReplace)),
		validation.Field(&r.Content, validation.Required, validation.RuneLength(1, provider.MaxCustomTableImportBytes)),
	)
}

type CustomTableImportResponse struct {
	InsertedRows int `json:"inserted_rows"`
}

type CustomTableExportRequest struct {
	ScopeID string                    `json:"scope_id,omitempty"`
	Format  CustomTableTransferFormat `json:"format"`
}

func (r *CustomTableExportRequest) Sanitize() {
	r.ScopeID = strings.TrimSpace(r.ScopeID)
	r.Format = CustomTableTransferFormat(strings.ToLower(strings.TrimSpace(string(r.Format))))
}

func (r CustomTableExportRequest) Validate() error {
	return validation.ValidateStruct(&r,
		validation.Field(&r.Format, validation.Required, validation.In(CustomTableTransferFormatCSV, CustomTableTransferFormatJSON)),
	)
}

type CustomTableExportResponse struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Content     string `json:"content"`
	RowCount    int    `json:"row_count"`
}

func (s CustomTableSchema) toProvider() provider.CustomTableSchema {
	columns := make([]provider.CustomTableColumn, len(s.Columns))
	for i, column := range s.Columns {
		id := column.ID
		if id == "" {
			id = fmt.Sprintf("pending_%d", i)
		}
		columns[i] = provider.CustomTableColumn{
			ID: id, Name: column.Name, Type: column.Type, Required: column.Required,
			Unique: column.Unique, HasDefault: column.HasDefault, DefaultValue: column.DefaultValue,
		}
	}
	return provider.CustomTableSchema{Columns: columns}
}

func CustomTableSchemaFromProvider(schema provider.CustomTableSchema) CustomTableSchema {
	columns := make([]CustomTableColumn, len(schema.Columns))
	for i, column := range schema.Columns {
		columns[i] = CustomTableColumn{
			ID: column.ID, Name: column.Name, Type: column.Type, Required: column.Required,
			Unique: column.Unique, HasDefault: column.HasDefault, DefaultValue: column.DefaultValue,
		}
	}
	return CustomTableSchema{Columns: columns}
}

func CustomTableToWire(table *model.CustomTable) *CustomTable {
	if table == nil {
		return nil
	}
	return &CustomTable{
		ID: table.ID, AppID: table.AppID, Name: table.Name, Description: table.Description,
		Scope: table.Scope, Schema: CustomTableSchemaFromProvider(table.Schema),
		CreatedAt: table.CreatedAt, UpdatedAt: table.UpdatedAt,
	}
}

func CustomTableRowToWire(row *model.CustomTableRow) *CustomTableRow {
	if row == nil {
		return nil
	}
	return &CustomTableRow{
		ID: row.ID.String(), TableID: row.TableID, ScopeID: row.ScopeID, Data: row.Data,
		Version: row.Version, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}
}

func (r CustomTableQueryRequest) ToProvider() provider.CustomTableQueryRequest {
	filters := make([]provider.CustomTableFilter, len(r.Filters))
	for i, filter := range r.Filters {
		filters[i] = provider.CustomTableFilter{ColumnID: filter.ColumnID, Operator: filter.Operator, Value: filter.Value}
	}
	sort := make([]provider.CustomTableSort, len(r.Sort))
	for i, item := range r.Sort {
		sort[i] = provider.CustomTableSort{ColumnID: item.ColumnID, Direction: item.Direction}
	}
	return provider.CustomTableQueryRequest{
		ScopeID: r.ScopeID, FilterMode: r.FilterMode, Filters: filters, Sort: sort,
		Limit: r.Limit, Offset: r.Offset,
	}
}
