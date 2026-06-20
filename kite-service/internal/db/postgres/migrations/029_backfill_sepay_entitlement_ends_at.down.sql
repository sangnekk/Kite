-- Irreversible data backfill: once ends_at has been written from created_at +
-- duration we can no longer tell which SePay entitlements were originally NULL
-- versus correctly set by the application, so reverting to NULL would also wipe
-- legitimately-expired rows. This down migration is intentionally a no-op.
SELECT 1;
