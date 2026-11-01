-- The subscriptions table was built for LemonSqueezy, but only SePay bank
-- transfers create subscriptions now and the columns hold something else:
--   lemonsqueezy_subscription_id  the transfer code of the payment (KITE123)
--   lemonsqueezy_order_id         the bank reference of the transaction
--   lemonsqueezy_product_id       the id of the plan that was bought
-- The names now say what they hold. Values and the unique index are kept.
ALTER TABLE subscriptions RENAME COLUMN lemonsqueezy_subscription_id TO payment_id;
ALTER TABLE subscriptions RENAME COLUMN lemonsqueezy_order_id TO payment_reference;
ALTER TABLE subscriptions RENAME COLUMN lemonsqueezy_product_id TO plan_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_lemonsqueezy_subscription_id_key') THEN
        ALTER TABLE subscriptions RENAME CONSTRAINT subscriptions_lemonsqueezy_subscription_id_key TO subscriptions_payment_id_key;
    END IF;
END $$;

-- customer_id and variant_id were never filled by the SePay flow and nothing
-- reads them. They are dropped, but never silently: if a row still carries
-- LemonSqueezy data the whole migration stops and nothing is changed (the
-- database stays marked dirty at version 40 until it is forced back to 39).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM subscriptions
        WHERE lemonsqueezy_customer_id IS NOT NULL OR lemonsqueezy_variant_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'subscriptions still holds LemonSqueezy customer/variant ids. Export them if you need them, then: UPDATE subscriptions SET lemonsqueezy_customer_id = NULL, lemonsqueezy_variant_id = NULL; run `database migrate postgres force --version 39 --danger` (a failed migration leaves the database marked dirty) and migrate up again.';
    END IF;
END $$;

ALTER TABLE subscriptions DROP COLUMN lemonsqueezy_customer_id;
ALTER TABLE subscriptions DROP COLUMN lemonsqueezy_variant_id;
