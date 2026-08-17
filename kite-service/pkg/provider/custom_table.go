package provider

import (
	"context"
	"fmt"
	"regexp"
	"time"
)

const (
	MaxCustomTableColumns      = 50
	MaxCustomTablePageSize     = 100
	MaxCustomTableTransferRows = 10000
	MaxCustomTableImportBytes  = 5 << 20
)

var customTableKeyPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

var customTableReservedColumnNames = map[string]struct{}{
	"id": {}, "scope_id": {}, "version": {}, "created_at": {}, "updated_at": {},
}

type CustomTableScope string

const (
	CustomTableScopeApp   CustomTableScope = "app"
	CustomTableScopeGuild CustomTableScope = "guild"
)

type CustomTableColumnType string

const (
	CustomTableColumnTypeText     CustomTableColumnType = "text"
	CustomTableColumnTypeNumber   CustomTableColumnType = "number"
	CustomTableColumnTypeBoolean  CustomTableColumnType = "boolean"
	CustomTableColumnTypeDateTime CustomTableColumnType = "datetime"
	CustomTableColumnTypeJSON     CustomTableColumnType = "json"
)

type CustomTableColumn struct {
	ID           string                `json:"id"`
	Name         string                `json:"name"`
	Type         CustomTableColumnType `json:"type"`
	Required     bool                  `json:"required,omitempty"`
	Unique       bool                  `json:"unique,omitempty"`
	HasDefault   bool                  `json:"has_default,omitempty"`
	DefaultValue any                   `json:"default_value,omitempty"`
}

type CustomTableSchema struct {
	Columns []CustomTableColumn `json:"columns"`
}

func (s CustomTableSchema) Validate() error {
	if len(s.Columns) > MaxCustomTableColumns {
		return fmt.Errorf("a table can have at most %d columns", MaxCustomTableColumns)
	}

	ids := make(map[string]struct{}, len(s.Columns))
	names := make(map[string]struct{}, len(s.Columns))
	for i, column := range s.Columns {
		if column.ID == "" {
			return fmt.Errorf("column %d is missing an id", i+1)
		}
		if !customTableKeyPattern.MatchString(column.Name) {
			return fmt.Errorf("column %q must start with a lowercase letter and only contain lowercase letters, numbers, and underscores", column.Name)
		}
		if _, reserved := customTableReservedColumnNames[column.Name]; reserved {
			return fmt.Errorf("column name %q is reserved", column.Name)
		}
		if _, ok := ids[column.ID]; ok {
			return fmt.Errorf("duplicate column id %q", column.ID)
		}
		if _, ok := names[column.Name]; ok {
			return fmt.Errorf("duplicate column name %q", column.Name)
		}
		ids[column.ID] = struct{}{}
		names[column.Name] = struct{}{}

		switch column.Type {
		case CustomTableColumnTypeText, CustomTableColumnTypeNumber, CustomTableColumnTypeBoolean,
			CustomTableColumnTypeDateTime, CustomTableColumnTypeJSON:
		default:
			return fmt.Errorf("column %q has unsupported type %q", column.Name, column.Type)
		}
		if column.HasDefault {
			if err := ValidateCustomTableValue(column, column.DefaultValue); err != nil {
				return fmt.Errorf("column %q default: %w", column.Name, err)
			}
		}
	}
	return nil
}

func (s CustomTableSchema) ColumnByID(id string) (CustomTableColumn, bool) {
	for _, column := range s.Columns {
		if column.ID == id {
			return column, true
		}
	}
	return CustomTableColumn{}, false
}

func (s CustomTableSchema) ColumnByName(name string) (CustomTableColumn, bool) {
	for _, column := range s.Columns {
		if column.Name == name {
			return column, true
		}
	}
	return CustomTableColumn{}, false
}

func ValidateCustomTableValue(column CustomTableColumn, value any) error {
	if value == nil {
		if column.Required {
			return fmt.Errorf("is required")
		}
		return nil
	}

	switch column.Type {
	case CustomTableColumnTypeText:
		if _, ok := value.(string); !ok {
			return fmt.Errorf("must be text")
		}
	case CustomTableColumnTypeNumber:
		switch value.(type) {
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		default:
			return fmt.Errorf("must be a number")
		}
	case CustomTableColumnTypeBoolean:
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("must be true or false")
		}
	case CustomTableColumnTypeDateTime:
		text, ok := value.(string)
		if !ok {
			return fmt.Errorf("must be an RFC3339 datetime")
		}
		if _, err := time.Parse(time.RFC3339, text); err != nil {
			return fmt.Errorf("must be an RFC3339 datetime")
		}
	case CustomTableColumnTypeJSON:
		// Any JSON-compatible value is accepted. Encoding is checked before write.
	default:
		return fmt.Errorf("has unsupported type %q", column.Type)
	}
	return nil
}

type CustomTableFilterOperator string

const (
	CustomTableFilterEqual              CustomTableFilterOperator = "equal"
	CustomTableFilterNotEqual           CustomTableFilterOperator = "not_equal"
	CustomTableFilterGreaterThan        CustomTableFilterOperator = "greater_than"
	CustomTableFilterGreaterThanOrEqual CustomTableFilterOperator = "greater_than_or_equal"
	CustomTableFilterLessThan           CustomTableFilterOperator = "less_than"
	CustomTableFilterLessThanOrEqual    CustomTableFilterOperator = "less_than_or_equal"
	CustomTableFilterContains           CustomTableFilterOperator = "contains"
	CustomTableFilterStartsWith         CustomTableFilterOperator = "starts_with"
	CustomTableFilterEndsWith           CustomTableFilterOperator = "ends_with"
	CustomTableFilterIsNull             CustomTableFilterOperator = "is_null"
	CustomTableFilterIsNotNull          CustomTableFilterOperator = "is_not_null"
)

type CustomTableFilter struct {
	ColumnID string                    `json:"column_id"`
	Operator CustomTableFilterOperator `json:"operator"`
	Value    any                       `json:"value,omitempty"`
}

type CustomTableFilterMode string

const (
	CustomTableFilterModeAll CustomTableFilterMode = "all"
	CustomTableFilterModeAny CustomTableFilterMode = "any"
)

type CustomTableSort struct {
	ColumnID  string `json:"column_id"`
	Direction string `json:"direction"`
}

type CustomTableQueryRequest struct {
	ScopeID    string                `json:"scope_id,omitempty"`
	FilterMode CustomTableFilterMode `json:"filter_mode,omitempty"`
	Filters    []CustomTableFilter   `json:"filters,omitempty"`
	Sort       []CustomTableSort     `json:"sort,omitempty"`
	Limit      int                   `json:"limit,omitempty"`
	Offset     int                   `json:"offset,omitempty"`
}

type CustomTableMutationOperation string

const (
	CustomTableMutationSet       CustomTableMutationOperation = "set"
	CustomTableMutationIncrement CustomTableMutationOperation = "increment"
	CustomTableMutationDecrement CustomTableMutationOperation = "decrement"
)

type CustomTableMutation struct {
	ColumnID  string                       `json:"column_id"`
	Operation CustomTableMutationOperation `json:"operation"`
	Value     any                          `json:"value,omitempty"`
}

type CustomTableRowValue struct {
	ID        string         `json:"id"`
	ScopeID   string         `json:"scope_id,omitempty"`
	Data      map[string]any `json:"data"`
	Version   int64          `json:"version"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type CustomTableInsertResult struct {
	Row CustomTableRowValue `json:"row"`
}

type CustomTableFindOneResult struct {
	Found bool                 `json:"found"`
	Row   *CustomTableRowValue `json:"row,omitempty"`
}

type CustomTableQueryResult struct {
	Rows       []CustomTableRowValue `json:"rows"`
	Count      int64                 `json:"count"`
	TotalCount int64                 `json:"total_count"`
}

type CustomTableMutationResult struct {
	AffectedRows int64 `json:"affected_rows"`
}

type CustomTableProvider interface {
	Insert(ctx context.Context, tableID, scopeID string, fields map[string]any) (CustomTableInsertResult, error)
	FindOne(ctx context.Context, tableID string, query CustomTableQueryRequest) (CustomTableFindOneResult, error)
	Query(ctx context.Context, tableID string, query CustomTableQueryRequest) (CustomTableQueryResult, error)
	Update(ctx context.Context, tableID string, query CustomTableQueryRequest, mutations []CustomTableMutation) (CustomTableMutationResult, error)
	Delete(ctx context.Context, tableID string, query CustomTableQueryRequest) (CustomTableMutationResult, error)
}
