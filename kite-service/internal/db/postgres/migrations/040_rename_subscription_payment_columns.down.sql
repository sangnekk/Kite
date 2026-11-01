ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemonsqueezy_variant_id TEXT;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_payment_id_key') THEN
        ALTER TABLE subscriptions RENAME CONSTRAINT subscriptions_payment_id_key TO subscriptions_lemonsqueezy_subscription_id_key;
    END IF;
END $$;

ALTER TABLE subscriptions RENAME COLUMN plan_id TO lemonsqueezy_product_id;
ALTER TABLE subscriptions RENAME COLUMN payment_reference TO lemonsqueezy_order_id;
ALTER TABLE subscriptions RENAME COLUMN payment_id TO lemonsqueezy_subscription_id;
