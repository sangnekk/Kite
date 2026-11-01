-- The dropped settings and the ids stored in these columns are not restored.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS lemonsqueezy_product_id TEXT NOT NULL DEFAULT '';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS lemonsqueezy_variant_id TEXT NOT NULL DEFAULT '';
