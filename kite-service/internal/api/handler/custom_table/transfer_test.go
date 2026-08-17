package custom_table

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/require"
)

func transferTestSchema() provider.CustomTableSchema {
	return provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "user-id", Name: "user_id", Type: provider.CustomTableColumnTypeText, Required: true},
		{ID: "score-id", Name: "score", Type: provider.CustomTableColumnTypeNumber},
		{ID: "active-id", Name: "active", Type: provider.CustomTableColumnTypeBoolean},
		{ID: "tags-id", Name: "tags", Type: provider.CustomTableColumnTypeJSON},
	}}
}

func TestDecodeCustomTableCSVUsesColumnNamesAndTypes(t *testing.T) {
	rows, err := decodeCustomTableImport(
		transferTestSchema(), wire.CustomTableTransferFormatCSV,
		"user_id,score,active,tags\n123,42.5,true,\"[\"\"vip\"\"]\"\n",
	)
	require.NoError(t, err)
	require.Len(t, rows, 1)
	require.Equal(t, "123", rows[0]["user-id"])
	require.Equal(t, 42.5, rows[0]["score-id"])
	require.Equal(t, true, rows[0]["active-id"])
	require.Equal(t, []any{"vip"}, rows[0]["tags-id"])
}

func TestDecodeCustomTableJSONRejectsUnknownColumn(t *testing.T) {
	_, err := decodeCustomTableImport(
		transferTestSchema(), wire.CustomTableTransferFormatJSON,
		`[{"user_id":"123","typo":true}]`,
	)
	require.ErrorContains(t, err, `không tìm thấy cột "typo"`)
}

func TestDecodeCustomTableImportProtectsDiscordIDs(t *testing.T) {
	schema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "discord-id", Name: "discord_id", Type: provider.CustomTableColumnTypeNumber},
	}}
	_, err := decodeCustomTableImport(schema, wire.CustomTableTransferFormatCSV, "discord_id\n1111475415039619144\n")
	require.ErrorContains(t, err, "ID Discord nên dùng kiểu Chuỗi")
}

func TestCustomTableExportRoundTripsCSV(t *testing.T) {
	schema := transferTestSchema()
	content, contentType, err := encodeCustomTableExport(schema, wire.CustomTableTransferFormatCSV, []*model.CustomTableRow{{
		ID: uuid.New(),
		Data: map[string]any{
			"user-id": "123", "score-id": 7.0, "active-id": false, "tags-id": []any{"vip", "beta"},
		},
	}})
	require.NoError(t, err)
	require.Equal(t, "text/csv; charset=utf-8", contentType)
	require.True(t, strings.HasPrefix(content, "\ufeffuser_id,score,active,tags"))

	rows, err := decodeCustomTableImport(schema, wire.CustomTableTransferFormatCSV, content)
	require.NoError(t, err)
	require.Equal(t, "123", rows[0]["user-id"])
	require.Equal(t, []any{"vip", "beta"}, rows[0]["tags-id"])
}

func TestCustomTableCSVProtectsSpreadsheetFormulasAndRoundTrips(t *testing.T) {
	schema := provider.CustomTableSchema{Columns: []provider.CustomTableColumn{
		{ID: "name-id", Name: "name", Type: provider.CustomTableColumnTypeText},
	}}
	content, _, err := encodeCustomTableExport(schema, wire.CustomTableTransferFormatCSV, []*model.CustomTableRow{{
		ID: uuid.New(), Data: map[string]any{"name-id": "=HYPERLINK(\"https://example.com\")"},
	}})
	require.NoError(t, err)
	require.Contains(t, content, "'=HYPERLINK")

	rows, err := decodeCustomTableImport(schema, wire.CustomTableTransferFormatCSV, content)
	require.NoError(t, err)
	require.Equal(t, "=HYPERLINK(\"https://example.com\")", rows[0]["name-id"])
}
