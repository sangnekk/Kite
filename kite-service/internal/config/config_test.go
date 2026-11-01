package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// An existing kite.toml still lists the billing keys that were removed (SePay
// order API, LemonSqueezy ids...). They must be ignored, not rejected.
func TestOldBillingKeysInKiteTomlAreIgnored(t *testing.T) {
	dir := t.TempDir()
	toml := `system_owner = "867040792463802389"

[discord]
client_id = "id"
client_secret = "secret"

[encryption]
token_encryption_key = "C223777002779B00BCA3884500B7811329A512DE4916D9575A3847889243A19A"

[billing]
transfer_code_prefix = "KITE"
merchant_bank_name = "Mbbank"
merchant_account_no = "0000000001"
webhook_hmac_secret = "old"
checkout_ttl_minutes = 30
sepay_merchant_id = "SP-LIVE-1"
sepay_secret_key = "secret-key"
sepay_checkout_base_url = "https://pay.sepay.vn"
sepay_bearer_token = "token"
sepay_with_qrcode = true

[[billing.plans]]
id = "basic"
title = "Basic"
description = "Free"
price = 1
lemonsqueezy_product_id = "123"
lemonsqueezy_variant_id = "456"
default = true
`
	require.NoError(t, os.WriteFile(filepath.Join(dir, ConfigFile), []byte(toml), 0o600))

	cfg, err := LoadConfig(dir)
	require.NoError(t, err)

	assert.Equal(t, "867040792463802389", cfg.SystemOwner)
	assert.Equal(t, "Mbbank", cfg.Billing.MerchantBankName)
	assert.Equal(t, "secret-key", cfg.Billing.SePaySecretKey)
	require.Len(t, cfg.Billing.Plans, 1)
	assert.Equal(t, "basic", cfg.Billing.Plans[0].ID)
}
