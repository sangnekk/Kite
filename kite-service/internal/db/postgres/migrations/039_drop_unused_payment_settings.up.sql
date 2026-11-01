-- LemonSqueezy is gone and SePay is only used as a bank transfer notification
-- (IPN), so these plan columns and billing settings are never read anymore.
ALTER TABLE plans DROP COLUMN IF EXISTS lemonsqueezy_product_id;
ALTER TABLE plans DROP COLUMN IF EXISTS lemonsqueezy_variant_id;

-- Includes the encrypted bearer token and HMAC secret that nothing uses.
DELETE FROM settings
WHERE namespace = 'billing'
  AND key IN (
    'transfer_code_prefix',
    'webhook_hmac_secret',
    'sepay_merchant_id',
    'sepay_checkout_base_url',
    'sepay_api_base_url',
    'sepay_bearer_token',
    'sepay_bank_account_xid',
    'sepay_va_prefix',
    'sepay_qrcode_template',
    'sepay_with_qrcode',
    'sepay_checkout_ttl_minutes'
  );
