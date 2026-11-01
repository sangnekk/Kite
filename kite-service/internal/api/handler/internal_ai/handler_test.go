package internalai

import (
	"encoding/json"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/core/settings"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestHandler(secret string) *Handler {
	return NewHandler(secret, func() settings.AI {
		return settings.AI{DefaultModel: "m1", Providers: []settings.AIProvider{{
			ID: "p", APIKey: "must-not-leak",
			Models: []settings.AIModel{{Key: "m1", Model: "vendor/m1"}},
		}}}
	})
}

func TestAuthorizedRequiresMatchingSecret(t *testing.T) {
	h := newTestHandler("s3cret")
	assert.True(t, h.authorized("s3cret"))
	assert.True(t, h.authorized("  s3cret "))
	assert.False(t, h.authorized("wrong"))
	assert.False(t, h.authorized(""))
}

func TestAuthorizedFailsClosedWithoutConfiguredSecret(t *testing.T) {
	assert.False(t, newTestHandler("").authorized(""))
}

func TestModelsListKeysAndNeverLeakAPIKeys(t *testing.T) {
	res := newTestHandler("s").models()
	assert.Equal(t, "m1", res.DefaultModel)
	assert.Equal(t, []Model{{Key: "m1", Model: "vendor/m1"}}, res.Models)

	raw, err := json.Marshal(res)
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "must-not-leak")
}
