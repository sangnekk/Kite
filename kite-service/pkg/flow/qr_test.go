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

func TestFlowExecuteQRCreate(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	node := CompiledFlowNode{
		ID:   "qr",
		Type: FlowNodeTypeActionQRCreate,
		Data: FlowNodeData{
			QRBank:        "VCB",
			QRAccount:     "0123456789",
			QRAmount:      "50000",
			QRDescription: "thanh toan",
			QRTemplate:    "compact",
			QRHideInfo:    true,
			QRFullAccount: true,
		},
	}

	c := NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{
			Discord: &TestDiscordProvider{},
			Log:     &provider.MockLogProvider{},
		},
		FlowContextLimits{
			MaxStackDepth: 10,
			MaxOperations: 1000,
			MaxCredits:    1000,
		},
		eval.NewContext(eval.Env{}),
		nil,
	)
	defer c.Cancel()

	require.NoError(t, node.Execute(c))

	// url.Values.Encode() sorts keys alphabetically.
	want := "https://vietqr.app/img?acc=0123456789&amount=50000&bank=VCB&des=thanh+toan&fullacc=true&showinfo=false&template=compact"
	assert.Equal(t, want, c.GetNodeResult("qr").String())

	// Building a URL costs nothing.
	assert.Equal(t, 0, node.CreditsCost())
}

func TestFlowExecuteQRCreateRequiresBankAndAccount(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	node := CompiledFlowNode{
		ID:   "qr",
		Type: FlowNodeTypeActionQRCreate,
		Data: FlowNodeData{QRBank: "VCB"}, // account missing
	}

	c := NewContext(
		ctx,
		5*time.Second,
		&TestContextData{},
		FlowProviders{
			Discord: &TestDiscordProvider{},
			Log:     &provider.MockLogProvider{},
		},
		FlowContextLimits{
			MaxStackDepth: 10,
			MaxOperations: 1000,
			MaxCredits:    1000,
		},
		eval.NewContext(eval.Env{}),
		nil,
	)
	defer c.Cancel()

	require.Error(t, node.Execute(c))
}
