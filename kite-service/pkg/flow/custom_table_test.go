package flow

import (
	"context"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type recordingCustomTableProvider struct {
	tableID string
	scopeID string
	fields  map[string]any
	query   provider.CustomTableQueryRequest
}

func (p *recordingCustomTableProvider) Insert(_ context.Context, tableID, scopeID string, fields map[string]any) (provider.CustomTableInsertResult, error) {
	p.tableID, p.scopeID, p.fields = tableID, scopeID, fields
	return provider.CustomTableInsertResult{Row: provider.CustomTableRowValue{
		ID: "row-id", Data: map[string]any{"id": "row-id", "price": fields["price-id"]},
	}}, nil
}

func (p *recordingCustomTableProvider) FindOne(_ context.Context, tableID string, query provider.CustomTableQueryRequest) (provider.CustomTableFindOneResult, error) {
	p.tableID, p.query = tableID, query
	return provider.CustomTableFindOneResult{Found: true, Row: &provider.CustomTableRowValue{
		ID: "row-id", Data: map[string]any{"id": "row-id", "name": "Sword"},
	}}, nil
}

func (p *recordingCustomTableProvider) Query(_ context.Context, _ string, _ provider.CustomTableQueryRequest) (provider.CustomTableQueryResult, error) {
	return provider.CustomTableQueryResult{}, nil
}

func (p *recordingCustomTableProvider) Update(_ context.Context, _ string, _ provider.CustomTableQueryRequest, _ []provider.CustomTableMutation) (provider.CustomTableMutationResult, error) {
	return provider.CustomTableMutationResult{}, nil
}

func (p *recordingCustomTableProvider) Delete(_ context.Context, _ string, _ provider.CustomTableQueryRequest) (provider.CustomTableMutationResult, error) {
	return provider.CustomTableMutationResult{}, nil
}

func TestFlowExecuteCustomTableInsertEvaluatesTemplates(t *testing.T) {
	tables := &recordingCustomTableProvider{}
	ctx := NewContext(
		context.Background(), 5*time.Second, &TestContextData{},
		FlowProviders{CustomTable: tables},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 10, MaxCredits: 10},
		eval.NewContext(eval.Env{"price": 500}), nil,
	)
	defer ctx.Cancel()

	node := &CompiledFlowNode{ID: "insert", Type: FlowNodeTypeActionTableInsert, Data: FlowNodeData{
		CustomTableID: "table-id", TableScopeID: "guild-1",
		TableFields: map[string]any{"price-id": "{{ price }}"},
	}}
	require.NoError(t, node.Execute(ctx))
	assert.Equal(t, "table-id", tables.tableID)
	assert.Equal(t, "guild-1", tables.scopeID)
	assert.EqualValues(t, 500, tables.fields["price-id"])
	assert.Equal(t, "row-id", ctx.GetNodeResult("insert").ToAny().(map[string]any)["id"])
}

func TestFlowExecuteCustomTableFindOneReturnsFlattenedRow(t *testing.T) {
	tables := &recordingCustomTableProvider{}
	ctx := NewContext(
		context.Background(), 5*time.Second, &TestContextData{},
		FlowProviders{CustomTable: tables}, FlowContextLimits{MaxOperations: 10, MaxCredits: 10},
		eval.NewContext(eval.Env{"item": "sword"}), nil,
	)
	defer ctx.Cancel()

	node := &CompiledFlowNode{ID: "find", Type: FlowNodeTypeActionTableFindOne, Data: FlowNodeData{
		CustomTableID: "table-id",
		TableFilters:  []FlowTableFilter{{ColumnID: "sku-id", Operator: "equal", Value: "{{ item }}"}},
	}}
	require.NoError(t, node.Execute(ctx))
	assert.Equal(t, "sword", tables.query.Filters[0].Value)
	result := ctx.GetNodeResult("find").ToAny().(map[string]any)
	assert.True(t, result["found"].(bool))
	assert.Equal(t, "Sword", result["row"].(map[string]any)["name"])
}
