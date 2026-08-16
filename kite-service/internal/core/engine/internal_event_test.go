package engine

import (
	"context"
	"testing"

	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/require"
)

func TestInternalEventProviderRejectsExcessiveDepthBeforeDispatch(t *testing.T) {
	p := NewInternalEventProvider("app", nil, nil)
	_, err := p.EmitInternalEvent(context.Background(), provider.InternalEventEmitRequest{
		CustomEventID: "event",
		Depth:         maxInternalEventDepth + 1,
	})
	require.ErrorContains(t, err, "maximum depth")
}
