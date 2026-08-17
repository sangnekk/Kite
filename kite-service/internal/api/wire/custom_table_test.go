package wire

import (
	"testing"

	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

func TestCustomTableCreateRequestAllowsColumnsWithoutIDs(t *testing.T) {
	req := CustomTableCreateRequest{
		Name:  "shop_items",
		Scope: provider.CustomTableScopeApp,
		Schema: CustomTableSchema{Columns: []CustomTableColumn{
			{Name: "name", Type: provider.CustomTableColumnTypeText, Required: true},
			{Name: "price", Type: provider.CustomTableColumnTypeNumber},
		}},
	}

	if err := req.Validate(); err != nil {
		t.Fatalf("expected a new client-side schema to validate before IDs are assigned, got %v", err)
	}
}
