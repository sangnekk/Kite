-- Backfill ends_at for legacy SePay subscription entitlements that were created
-- before premium_duration_days existed. Those were granted with a NULL ends_at,
-- which ActiveEntitlements treats as "never expires", so the plans never
-- auto-release (re-purchase stays blocked, the plan stays "active" forever).
--
-- Fix: retroactively expire each one from its purchase date, i.e.
--   ends_at = created_at + the plan's duration.
-- Scope is limited to SePay subscriptions (source = 'sepay'); manual grants keep
-- their intentional NULL (lifetime), and lifetime paid plans (duration 0) are
-- left untouched because they are not listed below.
--
-- Plan durations live in the billing config (TOML), not the DB, so they are
-- inlined here. IMPORTANT: before running this migration, replace the example
-- rows below with the real paid plans and their premium_duration_days from your
-- billing.plans config. Only list plans with a POSITIVE duration. As shipped,
-- the placeholder row matches nothing, so an unedited run is a safe no-op rather
-- than corrupting data.
WITH plan_durations (plan_id, duration_days) AS (
    VALUES
        -- TODO: fill in from billing.plans, e.g.:
        -- ('pro', 30),
        -- ('pro_yearly', 365),
        (NULL::text, 0) -- placeholder: matches nothing (plan_id NULL, duration 0)
)
UPDATE entitlements e
SET ends_at    = e.created_at + (pd.duration_days * INTERVAL '1 day'),
    updated_at = timezone('utc', now())
FROM subscriptions s, plan_durations pd
WHERE e.subscription_id = s.id
  AND s.source          = 'sepay'
  AND e.type            = 'subscription'
  AND e.ends_at IS NULL
  AND e.plan_id         = pd.plan_id
  AND pd.duration_days  > 0;

-- Mirror the same window onto the subscription row so the billing UI's
-- renews_at / ends_at line up with the entitlement (gating uses the entitlement;
-- this keeps the displayed data consistent). The legacy rows carry a
-- far-future renews_at (now + 50y), which we replace with the real expiry.
WITH plan_durations (plan_id, duration_days) AS (
    VALUES
        -- Keep this list identical to the one above.
        -- ('pro', 30),
        -- ('pro_yearly', 365),
        (NULL::text, 0)
)
UPDATE subscriptions s
SET ends_at    = e.created_at + (pd.duration_days * INTERVAL '1 day'),
    renews_at  = e.created_at + (pd.duration_days * INTERVAL '1 day'),
    updated_at = timezone('utc', now())
FROM entitlements e, plan_durations pd
WHERE e.subscription_id = s.id
  AND s.source          = 'sepay'
  AND e.type            = 'subscription'
  AND s.ends_at IS NULL
  AND e.plan_id         = pd.plan_id
  AND pd.duration_days  > 0;
