package provider

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCustomTableSchemaValidate(t *testing.T) {
	schema := CustomTableSchema{Columns: []CustomTableColumn{
		{ID: "price-id", Name: "price", Type: CustomTableColumnTypeNumber, Required: true},
		{ID: "sku-id", Name: "sku", Type: CustomTableColumnTypeText, Unique: true},
	}}
	require.NoError(t, schema.Validate())

	schema.Columns[1].Name = "price"
	assert.ErrorContains(t, schema.Validate(), "duplicate column name")

	schema.Columns[1].Name = "id"
	assert.ErrorContains(t, schema.Validate(), "reserved")
}

func TestCustomTableSchemaRejectsWrongDefaultType(t *testing.T) {
	schema := CustomTableSchema{Columns: []CustomTableColumn{
		{ID: "stock-id", Name: "stock", Type: CustomTableColumnTypeNumber, HasDefault: true, DefaultValue: "many"},
	}}
	assert.ErrorContains(t, schema.Validate(), "must be a number")
}
