package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

func (c *Client) CustomTablesByApp(ctx context.Context, appID string) ([]*model.CustomTable, error) {
	rows, err := c.Q.GetCustomTablesByApp(ctx, appID)
	if err != nil {
		return nil, err
	}
	tables := make([]*model.CustomTable, len(rows))
	for i, row := range rows {
		tables[i], err = rowToCustomTable(row)
		if err != nil {
			return nil, err
		}
	}
	return tables, nil
}

func (c *Client) CountCustomTablesByApp(ctx context.Context, appID string) (int, error) {
	var count int
	err := c.DB.QueryRow(ctx, `SELECT COUNT(*) FROM custom_tables WHERE app_id = $1`, appID).Scan(&count)
	return count, err
}

func (c *Client) CustomTable(ctx context.Context, id string) (*model.CustomTable, error) {
	row, err := c.Q.GetCustomTable(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return rowToCustomTable(row)
}

func (c *Client) CreateCustomTable(ctx context.Context, table *model.CustomTable) (*model.CustomTable, error) {
	schema, err := json.Marshal(table.Schema)
	if err != nil {
		return nil, fmt.Errorf("encode custom table schema: %w", err)
	}
	row, err := c.Q.CreateCustomTable(ctx, pgmodel.CreateCustomTableParams{
		ID: table.ID, AppID: table.AppID, Name: table.Name, Description: table.Description,
		Scope: string(table.Scope), Schema: schema,
		CreatedAt: pgTimestamp(table.CreatedAt), UpdatedAt: pgTimestamp(table.UpdatedAt),
	})
	if isUniqueViolation(err) {
		return nil, store.ErrAlreadyExists
	}
	if err != nil {
		return nil, err
	}
	return rowToCustomTable(row)
}

func (c *Client) UpdateCustomTable(ctx context.Context, table *model.CustomTable) (*model.CustomTable, error) {
	schema, err := json.Marshal(table.Schema)
	if err != nil {
		return nil, fmt.Errorf("encode custom table schema: %w", err)
	}
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	q := c.Q.WithTx(tx)
	currentRecord, err := q.GetCustomTable(ctx, table.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	currentTable, err := rowToCustomTable(currentRecord)
	if err != nil {
		return nil, err
	}

	updatedRecord, err := q.UpdateCustomTable(ctx, pgmodel.UpdateCustomTableParams{
		ID: table.ID, Name: table.Name, Description: table.Description,
		Scope: string(table.Scope), Schema: schema, UpdatedAt: pgTimestamp(table.UpdatedAt),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if isUniqueViolation(err) {
		return nil, store.ErrAlreadyExists
	}
	if err != nil {
		return nil, err
	}

	rows, err := tx.Query(ctx, `SELECT id, scope_id, data FROM custom_table_rows WHERE table_id = $1`, table.ID)
	if err != nil {
		return nil, err
	}
	type migrationRow struct {
		id      uuid.UUID
		scopeID string
		data    map[string]any
	}
	existingRows := make([]migrationRow, 0)
	issues := make(map[string]*customTableMigrationIssue)
	issueOrder := make([]string, 0)
	for rows.Next() {
		var rowID pgtype.UUID
		var scopeID string
		var raw []byte
		if err := rows.Scan(&rowID, &scopeID, &raw); err != nil {
			rows.Close()
			return nil, err
		}
		var data map[string]any
		if err := json.Unmarshal(raw, &data); err != nil {
			rows.Close()
			return nil, err
		}
		migrated, rowIssues := migrateCustomTableRow(currentTable.Schema, table.Schema, data)
		for _, issue := range rowIssues {
			key := issue.columnID + "\x00" + issue.reason
			aggregated, ok := issues[key]
			if !ok {
				aggregated = &customTableMigrationIssue{
					columnID: issue.columnID, columnName: issue.columnName,
					from: issue.from, to: issue.to, reason: issue.reason,
				}
				issues[key] = aggregated
				issueOrder = append(issueOrder, key)
			}
			aggregated.count++
			if len(aggregated.examples) < 3 && issue.example != "" && !containsString(aggregated.examples, issue.example) {
				aggregated.examples = append(aggregated.examples, issue.example)
			}
		}
		existingRows = append(existingRows, migrationRow{id: uuid.UUID(rowID.Bytes), scopeID: scopeID, data: migrated})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	if len(issueOrder) > 0 {
		return nil, fmt.Errorf("%w: %s", store.ErrInvalidData, formatCustomTableMigrationIssues(issues, issueOrder))
	}

	// Schema and row conversion are committed together. Rebuilding the unique
	// projection in the same transaction also makes adding Unique fail safely.
	if _, err := tx.Exec(ctx, `DELETE FROM custom_table_unique_values WHERE table_id = $1`, table.ID); err != nil {
		return nil, err
	}
	for _, existing := range existingRows {
		row := &model.CustomTableRow{ID: existing.id, ScopeID: existing.scopeID}
		if err := replaceCustomTableRow(ctx, tx, table, row, existing.data); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return rowToCustomTable(updatedRecord)
}

func (c *Client) DeleteCustomTable(ctx context.Context, id string) error {
	count, err := c.Q.DeleteCustomTable(ctx, id)
	if err != nil {
		return err
	}
	if count == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (c *Client) InsertCustomTableRow(ctx context.Context, table *model.CustomTable, scopeID string, fields map[string]any) (*model.CustomTableRow, error) {
	data, err := normalizeCustomTableRow(table.Schema, fields, false)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", store.ErrInvalidData, err)
	}
	scopeID, err = normalizeCustomTableScopeID(table, scopeID)
	if err != nil {
		return nil, err
	}

	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	row, err := insertCustomTableRowTx(ctx, tx, table, scopeID, data)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return row, nil
}

func (c *Client) CustomTableRow(ctx context.Context, tableID string, rowID uuid.UUID) (*model.CustomTableRow, error) {
	row := c.DB.QueryRow(ctx, `
SELECT id, table_id, scope_id, data, version, created_at, updated_at
FROM custom_table_rows WHERE table_id = $1 AND id = $2`, tableID, rowID)
	result, err := scanCustomTableRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	return result, err
}

func (c *Client) QueryCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest) ([]*model.CustomTableRow, int64, error) {
	built, err := buildCustomTableQuery(table, query)
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %v", store.ErrInvalidQuery, err)
	}

	var total int64
	if err := c.DB.QueryRow(ctx, `SELECT COUNT(*) FROM custom_table_rows `+built.where, built.whereArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := c.DB.Query(ctx, `
SELECT id, table_id, scope_id, data, version, created_at, updated_at
FROM custom_table_rows `+built.where+built.order+fmt.Sprintf(" LIMIT %d OFFSET %d", built.limit, built.offset), built.args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := make([]*model.CustomTableRow, 0, built.limit)
	for rows.Next() {
		row, err := scanCustomTableRow(rows)
		if err != nil {
			return nil, 0, err
		}
		result = append(result, row)
	}
	return result, total, rows.Err()
}

func (c *Client) ImportCustomTableRows(ctx context.Context, table *model.CustomTable, scopeID string, rows []map[string]any, replace bool) (int, error) {
	if len(rows) > provider.MaxCustomTableTransferRows {
		return 0, fmt.Errorf("%w: mỗi lần chỉ được nhập tối đa %d dòng", store.ErrInvalidData, provider.MaxCustomTableTransferRows)
	}
	var err error
	scopeID, err = normalizeCustomTableScopeID(table, scopeID)
	if err != nil {
		return 0, err
	}
	normalized := make([]map[string]any, len(rows))
	for i, fields := range rows {
		normalized[i], err = normalizeCustomTableRow(table.Schema, fields, false)
		if err != nil {
			return 0, fmt.Errorf("%w: Dòng %d: %v", store.ErrInvalidData, i+1, err)
		}
	}

	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if replace {
		if _, err := tx.Exec(ctx, `DELETE FROM custom_table_rows WHERE table_id = $1 AND scope_id = $2`, table.ID, scopeID); err != nil {
			return 0, err
		}
	}
	for i, data := range normalized {
		if _, err := insertCustomTableRowTx(ctx, tx, table, scopeID, data); err != nil {
			switch {
			case errors.Is(err, store.ErrAlreadyExists):
				message := strings.TrimPrefix(err.Error(), store.ErrAlreadyExists.Error()+": ")
				return 0, fmt.Errorf("%w: Dòng %d: %s", store.ErrAlreadyExists, i+1, friendlyCustomTableStoreMessage(message))
			case errors.Is(err, store.ErrInvalidData):
				message := strings.TrimPrefix(err.Error(), store.ErrInvalidData.Error()+": ")
				return 0, fmt.Errorf("%w: Dòng %d: %s", store.ErrInvalidData, i+1, friendlyCustomTableStoreMessage(message))
			default:
				return 0, err
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return len(normalized), nil
}

func friendlyCustomTableStoreMessage(message string) string {
	message = strings.ReplaceAll(message, "must be unique", "phải là duy nhất và đang bị trùng")
	message = strings.ReplaceAll(message, "is required", "không được để trống")
	message = strings.ReplaceAll(message, "must be text", "phải là chuỗi")
	message = strings.ReplaceAll(message, "must be a number", "phải là số")
	message = strings.ReplaceAll(message, "must be true or false", "phải là true hoặc false")
	message = strings.ReplaceAll(message, "must be an RFC3339 datetime", "phải là thời gian RFC3339 hợp lệ")
	return message
}

func (c *Client) ExportCustomTableRows(ctx context.Context, table *model.CustomTable, scopeID string, limit int) ([]*model.CustomTableRow, error) {
	var err error
	scopeID, err = normalizeCustomTableScopeID(table, scopeID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > provider.MaxCustomTableTransferRows {
		limit = provider.MaxCustomTableTransferRows
	}
	dbRows, err := c.DB.Query(ctx, `
SELECT id, table_id, scope_id, data, version, created_at, updated_at
FROM custom_table_rows
WHERE table_id = $1 AND scope_id = $2
ORDER BY created_at ASC, id ASC
LIMIT $3`, table.ID, scopeID, limit+1)
	if err != nil {
		return nil, err
	}
	defer dbRows.Close()
	result := make([]*model.CustomTableRow, 0, limit)
	for dbRows.Next() {
		if len(result) == limit {
			return nil, fmt.Errorf("%w: Bảng có hơn %d dòng; hiện chỉ hỗ trợ xuất tối đa %d dòng mỗi lần", store.ErrInvalidData, limit, limit)
		}
		row, err := scanCustomTableRow(dbRows)
		if err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, dbRows.Err()
}

func (c *Client) PatchCustomTableRow(ctx context.Context, table *model.CustomTable, rowID uuid.UUID, fields map[string]any) (*model.CustomTableRow, error) {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	row, err := scanCustomTableRow(tx.QueryRow(ctx, `
SELECT id, table_id, scope_id, data, version, created_at, updated_at
FROM custom_table_rows WHERE table_id = $1 AND id = $2 FOR UPDATE`, table.ID, rowID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	merged := make(map[string]any, len(row.Data)+len(fields))
	for key, value := range row.Data {
		merged[key] = value
	}
	for key, value := range fields {
		merged[key] = value
	}
	data, err := normalizeCustomTableRow(table.Schema, merged, true)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", store.ErrInvalidData, err)
	}
	if err := replaceCustomTableRow(ctx, tx, table, row, data); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	row.Data = data
	row.Version++
	row.UpdatedAt = time.Now().UTC()
	return row, nil
}

func (c *Client) UpdateCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest, mutations []provider.CustomTableMutation) (int64, error) {
	if len(mutations) == 0 {
		return 0, fmt.Errorf("%w: at least one update is required", store.ErrInvalidData)
	}
	for _, mutation := range mutations {
		column, ok := table.Schema.ColumnByID(mutation.ColumnID)
		if !ok {
			return 0, fmt.Errorf("%w: unknown column %q", store.ErrInvalidData, mutation.ColumnID)
		}
		switch mutation.Operation {
		case provider.CustomTableMutationSet:
			if err := provider.ValidateCustomTableValue(column, mutation.Value); err != nil {
				return 0, fmt.Errorf("%w: column %q %v", store.ErrInvalidData, column.Name, err)
			}
		case provider.CustomTableMutationIncrement, provider.CustomTableMutationDecrement:
			if column.Type != provider.CustomTableColumnTypeNumber {
				return 0, fmt.Errorf("%w: only number columns support increment/decrement", store.ErrInvalidData)
			}
			if err := provider.ValidateCustomTableValue(column, mutation.Value); err != nil {
				return 0, fmt.Errorf("%w: column %q %v", store.ErrInvalidData, column.Name, err)
			}
		default:
			return 0, fmt.Errorf("%w: unsupported update operation %q", store.ErrInvalidData, mutation.Operation)
		}
	}

	built, err := buildCustomTableQuery(table, query)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", store.ErrInvalidQuery, err)
	}
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	sql := `SELECT id, table_id, scope_id, data, version, created_at, updated_at FROM custom_table_rows ` + built.where + built.order
	if query.Limit > 0 {
		sql += fmt.Sprintf(" LIMIT %d", built.limit)
	}
	sql += " FOR UPDATE"
	rows, err := tx.Query(ctx, sql, built.args...)
	if err != nil {
		return 0, err
	}
	selected := make([]*model.CustomTableRow, 0)
	for rows.Next() {
		row, err := scanCustomTableRow(rows)
		if err != nil {
			rows.Close()
			return 0, err
		}
		selected = append(selected, row)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	rows.Close()

	for _, row := range selected {
		data := make(map[string]any, len(row.Data))
		for key, value := range row.Data {
			data[key] = value
		}
		for _, mutation := range mutations {
			switch mutation.Operation {
			case provider.CustomTableMutationSet:
				data[mutation.ColumnID] = mutation.Value
			case provider.CustomTableMutationIncrement, provider.CustomTableMutationDecrement:
				current, _ := numberAsFloat(data[mutation.ColumnID])
				delta, _ := numberAsFloat(mutation.Value)
				if mutation.Operation == provider.CustomTableMutationDecrement {
					delta = -delta
				}
				data[mutation.ColumnID] = current + delta
			}
		}
		normalized, err := normalizeCustomTableRow(table.Schema, data, true)
		if err != nil {
			return 0, fmt.Errorf("%w: %v", store.ErrInvalidData, err)
		}
		if err := replaceCustomTableRow(ctx, tx, table, row, normalized); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return int64(len(selected)), nil
}

func (c *Client) DeleteCustomTableRow(ctx context.Context, tableID string, rowID uuid.UUID) error {
	tag, err := c.DB.Exec(ctx, `DELETE FROM custom_table_rows WHERE table_id = $1 AND id = $2`, tableID, rowID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (c *Client) DeleteCustomTableRows(ctx context.Context, table *model.CustomTable, query provider.CustomTableQueryRequest) (int64, error) {
	built, err := buildCustomTableQuery(table, query)
	if err != nil {
		return 0, fmt.Errorf("%w: %v", store.ErrInvalidQuery, err)
	}
	subquery := `SELECT id FROM custom_table_rows ` + built.where + built.order
	if query.Limit > 0 {
		subquery += fmt.Sprintf(" LIMIT %d", built.limit)
	}
	tag, err := c.DB.Exec(ctx, `DELETE FROM custom_table_rows WHERE id IN (`+subquery+`)`, built.args...)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func rowToCustomTable(row pgmodel.CustomTable) (*model.CustomTable, error) {
	var schema provider.CustomTableSchema
	if err := json.Unmarshal(row.Schema, &schema); err != nil {
		return nil, fmt.Errorf("decode custom table schema: %w", err)
	}
	return &model.CustomTable{
		ID: row.ID, AppID: row.AppID, Name: row.Name, Description: row.Description,
		Scope: provider.CustomTableScope(row.Scope), Schema: schema,
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

func pgTimestamp(value time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: value.UTC(), Valid: true}
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCustomTableRow(row rowScanner) (*model.CustomTableRow, error) {
	var id pgtype.UUID
	var tableID, scopeID string
	var raw []byte
	var version int64
	var createdAt, updatedAt time.Time
	if err := row.Scan(&id, &tableID, &scopeID, &raw, &version, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return &model.CustomTableRow{
		ID: uuid.UUID(id.Bytes), TableID: tableID, ScopeID: scopeID, Data: data,
		Version: version, CreatedAt: createdAt, UpdatedAt: updatedAt,
	}, nil
}

func normalizeCustomTableRow(schema provider.CustomTableSchema, fields map[string]any, keepUnknown bool) (map[string]any, error) {
	result := make(map[string]any, len(schema.Columns))
	for key := range fields {
		if _, ok := schema.ColumnByID(key); !ok && !keepUnknown {
			return nil, fmt.Errorf("unknown column %q", key)
		}
	}
	for _, column := range schema.Columns {
		value, exists := fields[column.ID]
		if !exists && column.HasDefault {
			value, exists = column.DefaultValue, true
		}
		if !exists {
			if column.Required {
				return nil, fmt.Errorf("column %q is required", column.Name)
			}
			continue
		}
		if err := provider.ValidateCustomTableValue(column, value); err != nil {
			return nil, fmt.Errorf("column %q %v", column.Name, err)
		}
		result[column.ID] = value
	}
	return result, nil
}

func normalizeCustomTableScopeID(table *model.CustomTable, scopeID string) (string, error) {
	scopeID = strings.TrimSpace(scopeID)
	if table.Scope == provider.CustomTableScopeGuild && scopeID == "" {
		return "", fmt.Errorf("%w: Hãy chọn server trước khi thao tác dữ liệu", store.ErrInvalidData)
	}
	if table.Scope == provider.CustomTableScopeApp {
		return "", nil
	}
	return scopeID, nil
}

func insertCustomTableRowTx(ctx context.Context, tx pgx.Tx, table *model.CustomTable, scopeID string, data map[string]any) (*model.CustomTableRow, error) {
	rowID := uuid.New()
	now := time.Now().UTC()
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("%w: Dữ liệu không phải JSON hợp lệ", store.ErrInvalidData)
	}
	_, err = tx.Exec(ctx, `
INSERT INTO custom_table_rows (id, table_id, scope_id, data, version, created_at, updated_at)
VALUES ($1, $2, $3, $4, 1, $5, $5)`, rowID, table.ID, scopeID, raw, now)
	if err != nil {
		return nil, err
	}
	if err := insertUniqueValues(ctx, tx, table, scopeID, rowID, data); err != nil {
		return nil, err
	}
	return &model.CustomTableRow{
		ID: rowID, TableID: table.ID, ScopeID: scopeID, Data: data,
		Version: 1, CreatedAt: now, UpdatedAt: now,
	}, nil
}

type customTableRowMigrationIssue struct {
	columnID   string
	columnName string
	from       provider.CustomTableColumnType
	to         provider.CustomTableColumnType
	reason     string
	example    string
}

type customTableMigrationIssue struct {
	columnID   string
	columnName string
	from       provider.CustomTableColumnType
	to         provider.CustomTableColumnType
	reason     string
	count      int
	examples   []string
}

func migrateCustomTableRow(oldSchema, newSchema provider.CustomTableSchema, fields map[string]any) (map[string]any, []customTableRowMigrationIssue) {
	result := make(map[string]any, len(newSchema.Columns))
	issues := make([]customTableRowMigrationIssue, 0)
	for _, column := range newSchema.Columns {
		value, exists := fields[column.ID]
		oldColumn, existedBefore := oldSchema.ColumnByID(column.ID)
		if !exists && column.HasDefault {
			value, exists = column.DefaultValue, true
		}
		if !exists {
			if column.Required {
				issues = append(issues, customTableRowMigrationIssue{
					columnID: column.ID, columnName: column.Name, to: column.Type,
					reason: "cột bắt buộc nhưng các dòng hiện tại chưa có giá trị",
				})
			}
			continue
		}

		if existedBefore && oldColumn.Type != column.Type && value != nil {
			converted, err := castCustomTableValue(value, oldColumn.Type, column.Type)
			if err != nil {
				issues = append(issues, customTableRowMigrationIssue{
					columnID: column.ID, columnName: column.Name, from: oldColumn.Type,
					to: column.Type, reason: err.Error(), example: formatCustomTableMigrationValue(value),
				})
				continue
			}
			value = converted
		}

		if err := provider.ValidateCustomTableValue(column, value); err != nil {
			issues = append(issues, customTableRowMigrationIssue{
				columnID: column.ID, columnName: column.Name, from: oldColumn.Type,
				to: column.Type, reason: friendlyCustomTableValidationError(err),
				example: formatCustomTableMigrationValue(value),
			})
			continue
		}
		result[column.ID] = value
	}
	return result, issues
}

func castCustomTableValue(value any, from, to provider.CustomTableColumnType) (any, error) {
	if value == nil || from == to {
		return value, nil
	}
	switch to {
	case provider.CustomTableColumnTypeText:
		if text, ok := value.(string); ok {
			return text, nil
		}
		raw, err := json.Marshal(value)
		if err != nil {
			return nil, errors.New("giá trị không thể chuyển thành chuỗi")
		}
		return string(raw), nil
	case provider.CustomTableColumnTypeNumber:
		if number, ok := numberAsFloat(value); ok {
			return number, nil
		}
		if text, ok := value.(string); ok {
			number, err := strconv.ParseFloat(strings.TrimSpace(text), 64)
			if err == nil && !math.IsNaN(number) && !math.IsInf(number, 0) {
				if math.Trunc(number) == number && math.Abs(number) > 9007199254740991 {
					return nil, errors.New("chứa số nguyên vượt giới hạn an toàn; ID Discord nên giữ kiểu Chuỗi")
				}
				return number, nil
			}
		}
		return nil, errors.New("giá trị không phải một số hợp lệ")
	case provider.CustomTableColumnTypeBoolean:
		if boolean, ok := value.(bool); ok {
			return boolean, nil
		}
		if text, ok := value.(string); ok {
			switch strings.ToLower(strings.TrimSpace(text)) {
			case "true":
				return true, nil
			case "false":
				return false, nil
			}
		}
		return nil, errors.New("giá trị phải là true hoặc false")
	case provider.CustomTableColumnTypeDateTime:
		text, ok := value.(string)
		if !ok {
			return nil, errors.New("giá trị không phải thời gian RFC3339 hợp lệ")
		}
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(text))
		if err != nil {
			return nil, errors.New("giá trị không phải thời gian RFC3339 hợp lệ")
		}
		return parsed.UTC().Format(time.RFC3339Nano), nil
	case provider.CustomTableColumnTypeJSON:
		if from == provider.CustomTableColumnTypeText {
			text, ok := value.(string)
			if !ok {
				return nil, errors.New("giá trị không phải JSON hợp lệ")
			}
			var decoded any
			if err := json.Unmarshal([]byte(text), &decoded); err != nil {
				// A plain string is still a valid JSON scalar. Structured JSON text
				// is decoded, while ordinary text is preserved losslessly.
				return text, nil
			}
			return decoded, nil
		}
		if _, err := json.Marshal(value); err != nil {
			return nil, errors.New("giá trị không phải JSON hợp lệ")
		}
		return value, nil
	default:
		return nil, fmt.Errorf("kiểu dữ liệu đích %q không được hỗ trợ", to)
	}
}

func friendlyCustomTableValidationError(err error) string {
	message := err.Error()
	replacements := map[string]string{
		"is required":                 "không được để trống",
		"must be text":                "phải là chuỗi",
		"must be a number":            "phải là số",
		"must be true or false":       "phải là true hoặc false",
		"must be an RFC3339 datetime": "phải là thời gian RFC3339 hợp lệ",
	}
	if friendly, ok := replacements[message]; ok {
		return friendly
	}
	return message
}

func formatCustomTableMigrationIssues(issues map[string]*customTableMigrationIssue, order []string) string {
	parts := make([]string, 0, len(order))
	for _, key := range order {
		issue := issues[key]
		part := fmt.Sprintf("cột %q", issue.columnName)
		if issue.from != "" && issue.from != issue.to {
			part += fmt.Sprintf(" từ %s sang %s", customTableTypeLabel(issue.from), customTableTypeLabel(issue.to))
		}
		part += fmt.Sprintf(": %d dòng %s", issue.count, issue.reason)
		if len(issue.examples) > 0 {
			part += " (ví dụ: " + strings.Join(issue.examples, ", ") + ")"
		}
		parts = append(parts, part)
	}
	return "Không thể cập nhật cấu trúc bảng vì " + strings.Join(parts, "; ") + ". Không có thay đổi nào được lưu. Hãy sửa dữ liệu hoặc đặt giá trị mặc định rồi thử lại."
}

func customTableTypeLabel(value provider.CustomTableColumnType) string {
	switch value {
	case provider.CustomTableColumnTypeText:
		return "Chuỗi"
	case provider.CustomTableColumnTypeNumber:
		return "Số"
	case provider.CustomTableColumnTypeBoolean:
		return "Đúng/Sai"
	case provider.CustomTableColumnTypeDateTime:
		return "Thời gian"
	case provider.CustomTableColumnTypeJSON:
		return "JSON"
	default:
		return string(value)
	}
}

func formatCustomTableMigrationValue(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	text := string(raw)
	if len(text) > 80 {
		text = text[:77] + "..."
	}
	return text
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func insertUniqueValues(ctx context.Context, tx pgx.Tx, table *model.CustomTable, scopeID string, rowID uuid.UUID, data map[string]any) error {
	for _, column := range table.Schema.Columns {
		if !column.Unique {
			continue
		}
		value, exists := data[column.ID]
		if !exists || value == nil {
			continue
		}
		hash, err := hashCustomTableValue(value)
		if err != nil {
			return fmt.Errorf("%w: column %q value is not valid JSON", store.ErrInvalidData, column.Name)
		}
		_, err = tx.Exec(ctx, `
INSERT INTO custom_table_unique_values (table_id, scope_id, column_id, value_hash, row_id)
VALUES ($1, $2, $3, $4, $5)`, table.ID, scopeID, column.ID, hash, rowID)
		if isUniqueViolation(err) {
			return fmt.Errorf("%w: column %q must be unique", store.ErrAlreadyExists, column.Name)
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func hashCustomTableValue(value any) (string, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func replaceCustomTableRow(ctx context.Context, tx pgx.Tx, table *model.CustomTable, row *model.CustomTableRow, data map[string]any) error {
	raw, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("%w: data is not valid JSON", store.ErrInvalidData)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM custom_table_unique_values WHERE row_id = $1`, row.ID); err != nil {
		return err
	}
	if err := insertUniqueValues(ctx, tx, table, row.ScopeID, row.ID, data); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
UPDATE custom_table_rows SET data = $2, version = version + 1, updated_at = $3
WHERE id = $1`, row.ID, raw, time.Now().UTC())
	return err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func numberAsFloat(value any) (float64, bool) {
	switch value := value.(type) {
	case int:
		return float64(value), true
	case int8:
		return float64(value), true
	case int16:
		return float64(value), true
	case int32:
		return float64(value), true
	case int64:
		return float64(value), true
	case uint:
		return float64(value), true
	case uint8:
		return float64(value), true
	case uint16:
		return float64(value), true
	case uint32:
		return float64(value), true
	case uint64:
		return float64(value), true
	case float32:
		return float64(value), true
	case float64:
		return value, true
	default:
		return 0, false
	}
}

type customTableBuiltQuery struct {
	where     string
	order     string
	args      []any
	whereArgs []any
	limit     int
	offset    int
}

func buildCustomTableQuery(table *model.CustomTable, query provider.CustomTableQueryRequest) (customTableBuiltQuery, error) {
	if table.Scope == provider.CustomTableScopeGuild && strings.TrimSpace(query.ScopeID) == "" {
		return customTableBuiltQuery{}, fmt.Errorf("guild scope id is required")
	}
	scopeID := query.ScopeID
	if table.Scope == provider.CustomTableScopeApp {
		scopeID = ""
	}
	mode := query.FilterMode
	if mode == "" {
		mode = provider.CustomTableFilterModeAll
	}
	if mode != provider.CustomTableFilterModeAll && mode != provider.CustomTableFilterModeAny {
		return customTableBuiltQuery{}, fmt.Errorf("filter mode must be all or any")
	}

	built := customTableBuiltQuery{args: []any{table.ID, scopeID}, limit: query.Limit, offset: query.Offset}
	if built.limit <= 0 {
		built.limit = 50
	}
	if built.limit > provider.MaxCustomTablePageSize {
		built.limit = provider.MaxCustomTablePageSize
	}
	if built.offset < 0 {
		return customTableBuiltQuery{}, fmt.Errorf("offset cannot be negative")
	}

	parts := make([]string, 0, len(query.Filters))
	for _, filter := range query.Filters {
		column, ok := table.Schema.ColumnByID(filter.ColumnID)
		if !ok {
			return customTableBuiltQuery{}, fmt.Errorf("unknown filter column %q", filter.ColumnID)
		}
		part, args, err := buildCustomTableFilter(column, filter, len(built.args)+1)
		if err != nil {
			return customTableBuiltQuery{}, err
		}
		parts = append(parts, part)
		built.args = append(built.args, args...)
	}
	built.where = "WHERE table_id = $1 AND scope_id = $2"
	if len(parts) > 0 {
		joiner := " AND "
		if mode == provider.CustomTableFilterModeAny {
			joiner = " OR "
		}
		built.where += " AND (" + strings.Join(parts, joiner) + ")"
	}
	built.whereArgs = append([]any(nil), built.args...)

	orders := make([]string, 0, len(query.Sort)+1)
	for _, sort := range query.Sort {
		column, ok := table.Schema.ColumnByID(sort.ColumnID)
		if !ok {
			return customTableBuiltQuery{}, fmt.Errorf("unknown sort column %q", sort.ColumnID)
		}
		direction := strings.ToUpper(sort.Direction)
		if direction != "ASC" && direction != "DESC" {
			return customTableBuiltQuery{}, fmt.Errorf("sort direction must be asc or desc")
		}
		built.args = append(built.args, column.ID)
		orders = append(orders, customTableValueSQL(column, len(built.args))+" "+direction+" NULLS LAST")
	}
	orders = append(orders, "created_at DESC", "id ASC")
	built.order = " ORDER BY " + strings.Join(orders, ", ")
	return built, nil
}

func buildCustomTableFilter(column provider.CustomTableColumn, filter provider.CustomTableFilter, firstArg int) (string, []any, error) {
	columnExpr := customTableValueSQL(column, firstArg)
	columnArg := column.ID
	if filter.Operator == provider.CustomTableFilterIsNull {
		return fmt.Sprintf("(NOT (data ? $%d) OR data -> $%d = 'null'::jsonb)", firstArg, firstArg), []any{columnArg}, nil
	}
	if filter.Operator == provider.CustomTableFilterIsNotNull {
		return fmt.Sprintf("(data ? $%d AND data -> $%d <> 'null'::jsonb)", firstArg, firstArg), []any{columnArg}, nil
	}
	if err := provider.ValidateCustomTableValue(column, filter.Value); err != nil {
		return "", nil, fmt.Errorf("filter column %q %v", column.Name, err)
	}
	valueArg := firstArg + 1
	value := filter.Value
	valueExpr := fmt.Sprintf("$%d", valueArg)
	if column.Type == provider.CustomTableColumnTypeNumber {
		valueExpr += "::numeric"
	} else if column.Type == provider.CustomTableColumnTypeBoolean {
		valueExpr += "::boolean"
	} else if column.Type == provider.CustomTableColumnTypeDateTime {
		valueExpr += "::timestamptz"
	} else if column.Type == provider.CustomTableColumnTypeJSON {
		raw, err := json.Marshal(value)
		if err != nil {
			return "", nil, err
		}
		value = string(raw)
		valueExpr += "::jsonb"
	}

	switch filter.Operator {
	case provider.CustomTableFilterEqual:
		return columnExpr + " = " + valueExpr, []any{columnArg, value}, nil
	case provider.CustomTableFilterNotEqual:
		return columnExpr + " <> " + valueExpr, []any{columnArg, value}, nil
	case provider.CustomTableFilterGreaterThan, provider.CustomTableFilterGreaterThanOrEqual,
		provider.CustomTableFilterLessThan, provider.CustomTableFilterLessThanOrEqual:
		if column.Type != provider.CustomTableColumnTypeNumber && column.Type != provider.CustomTableColumnTypeDateTime && column.Type != provider.CustomTableColumnTypeText {
			return "", nil, fmt.Errorf("operator %q is not supported by column %q", filter.Operator, column.Name)
		}
		op := map[provider.CustomTableFilterOperator]string{
			provider.CustomTableFilterGreaterThan: ">", provider.CustomTableFilterGreaterThanOrEqual: ">=",
			provider.CustomTableFilterLessThan: "<", provider.CustomTableFilterLessThanOrEqual: "<=",
		}[filter.Operator]
		return columnExpr + " " + op + " " + valueExpr, []any{columnArg, value}, nil
	case provider.CustomTableFilterContains:
		if column.Type == provider.CustomTableColumnTypeJSON {
			return columnExpr + " @> " + valueExpr, []any{columnArg, value}, nil
		}
		if column.Type != provider.CustomTableColumnTypeText {
			return "", nil, fmt.Errorf("contains is only supported by text and JSON columns")
		}
		return columnExpr + " LIKE '%' || " + valueExpr + " || '%'", []any{columnArg, value}, nil
	case provider.CustomTableFilterStartsWith:
		if column.Type != provider.CustomTableColumnTypeText {
			return "", nil, fmt.Errorf("starts_with is only supported by text columns")
		}
		return columnExpr + " LIKE " + valueExpr + " || '%'", []any{columnArg, value}, nil
	case provider.CustomTableFilterEndsWith:
		if column.Type != provider.CustomTableColumnTypeText {
			return "", nil, fmt.Errorf("ends_with is only supported by text columns")
		}
		return columnExpr + " LIKE '%' || " + valueExpr, []any{columnArg, value}, nil
	default:
		return "", nil, fmt.Errorf("unsupported filter operator %q", filter.Operator)
	}
}

func customTableValueSQL(column provider.CustomTableColumn, pathArg int) string {
	base := fmt.Sprintf("data ->> $%d", pathArg)
	switch column.Type {
	case provider.CustomTableColumnTypeNumber:
		return "(" + base + ")::numeric"
	case provider.CustomTableColumnTypeBoolean:
		return "(" + base + ")::boolean"
	case provider.CustomTableColumnTypeDateTime:
		return "(" + base + ")::timestamptz"
	case provider.CustomTableColumnTypeJSON:
		return fmt.Sprintf("data -> $%d", pathArg)
	default:
		return base
	}
}
