package postgres

import (
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func customTableQueryFixture() *model.CustomTable {
	return &model.CustomTable{
		ID:    "table-id",
		Scope: provider.CustomTableScopeGuild,
		Schema: provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
			{ID: "price-id", Name: "price", Type: provider.CustomTableColumnTypeNumber},
			{ID: "name-id", Name: "name", Type: provider.CustomTableColumnTypeText},
		}},
	}
}

func TestBuildCustomTableQueryUsesStructuredParameters(t *testing.T) {
	table := customTableQueryFixture()
	built, err := buildCustomTableQuery(table, provider.CustomTableQueryRequest{
		ScopeID: "guild-id",
		Filters: []provider.CustomTableFilter{{
			ColumnID: "price-id", Operator: provider.CustomTableFilterGreaterThan, Value: float64(100),
		}},
		Sort:  []provider.CustomTableSort{{ColumnID: "name-id", Direction: "asc"}},
		Limit: 10,
	})
	require.NoError(t, err)
	assert.Contains(t, built.where, "data ->> $3")
	assert.Contains(t, built.order, "data ->> $5")
	assert.Equal(t, []any{"table-id", "guild-id", "price-id", float64(100)}, built.whereArgs)
	assert.Len(t, built.args, 5)
	assert.Equal(t, 10, built.limit)
}

func TestBuildCustomTableQueryRequiresGuildScope(t *testing.T) {
	_, err := buildCustomTableQuery(customTableQueryFixture(), provider.CustomTableQueryRequest{})
	assert.ErrorContains(t, err, "guild scope id is required")
}

func TestBuildCustomTableQueryRejectsUnknownColumn(t *testing.T) {
	_, err := buildCustomTableQuery(customTableQueryFixture(), provider.CustomTableQueryRequest{
		ScopeID: "guild-id",
		Filters: []provider.CustomTableFilter{{ColumnID: "missing", Operator: provider.CustomTableFilterEqual, Value: "x"}},
	})
	assert.ErrorContains(t, err, "unknown filter column")
}

func TestMigrateCustomTableRowCastsTextToNumberAndJSON(t *testing.T) {
	oldSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "price", Name: "price", Type: provider.CustomTableColumnTypeText},
		{ID: "metadata", Name: "metadata", Type: provider.CustomTableColumnTypeText},
	}}
	newSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "price", Name: "price", Type: provider.CustomTableColumnTypeNumber},
		{ID: "metadata", Name: "metadata", Type: provider.CustomTableColumnTypeJSON},
	}}

	migrated, issues := migrateCustomTableRow(oldSchema, newSchema, map[string]any{
		"price": "125.5", "metadata": `{"vip":true}`,
	})

	require.Empty(t, issues)
	assert.Equal(t, 125.5, migrated["price"])
	assert.Equal(t, map[string]any{"vip": true}, migrated["metadata"])
}

func TestCastTextToJSONPreservesPlainStrings(t *testing.T) {
	converted, err := castCustomTableValue(
		"not-json-syntax",
		provider.CustomTableColumnTypeText,
		provider.CustomTableColumnTypeJSON,
	)

	require.NoError(t, err)
	assert.Equal(t, "not-json-syntax", converted)
}

func TestCastDiscordIDToNumberIsBlockedBeforePrecisionLoss(t *testing.T) {
	_, err := castCustomTableValue(
		"1111475415039619144",
		provider.CustomTableColumnTypeText,
		provider.CustomTableColumnTypeNumber,
	)

	require.Error(t, err)
	assert.ErrorContains(t, err, "ID Discord nên giữ kiểu Chuỗi")
}

func TestMigrateCustomTableRowReportsFriendlyCastFailure(t *testing.T) {
	oldSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "user-id", Name: "idnguoidung", Type: provider.CustomTableColumnTypeText},
	}}
	newSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "user-id", Name: "idnguoidung", Type: provider.CustomTableColumnTypeNumber},
	}}

	_, rowIssues := migrateCustomTableRow(oldSchema, newSchema, map[string]any{"user-id": "abc"})
	require.Len(t, rowIssues, 1)
	issue := rowIssues[0]
	formatted := formatCustomTableMigrationIssues(map[string]*customTableMigrationIssue{
		"issue": {
			columnID: issue.columnID, columnName: issue.columnName, from: issue.from,
			to: issue.to, reason: issue.reason, count: 1, examples: []string{issue.example},
		},
	}, []string{"issue"})

	assert.Contains(t, formatted, `cột "idnguoidung" từ Chuỗi sang Số`)
	assert.Contains(t, formatted, `"abc"`)
	assert.Contains(t, formatted, "Không có thay đổi nào được lưu")
}

func TestMigrateCustomTableRowDropsRemovedColumnsAndAppliesDefaults(t *testing.T) {
	oldSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "removed", Name: "removed", Type: provider.CustomTableColumnTypeText},
	}}
	newSchema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "enabled", Name: "enabled", Type: provider.CustomTableColumnTypeBoolean, HasDefault: true, DefaultValue: true},
	}}

	migrated, issues := migrateCustomTableRow(oldSchema, newSchema, map[string]any{"removed": "old"})

	require.Empty(t, issues)
	assert.Equal(t, map[string]any{"enabled": true}, migrated)
}
