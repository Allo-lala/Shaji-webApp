-- Migration 009: Migrate to Payment Gateway Agnostic Schema
-- 
-- This migration transforms the subscriptions table from Stripe-specific naming
-- to payment-gateway-agnostic naming to support PayPal integration.
-- 
-- Changes:
--   1. Rename stripe_customer_id -> payment_gateway_customer_id
--   2. Rename stripe_subscription_id -> payment_gateway_subscription_id
--   3. Rename stripe_price_id -> payment_gateway_plan_id
--   4. Update unique constraint from unique_stripe_customer_id -> unique_payment_gateway_customer_id
--   5. Update indexes to reference new column names
--   6. Mark existing Stripe subscriptions with status 'legacy_stripe'
--   7. Verify data integrity after migration

-- ============================================================================
-- STEP 1: Create backup of subscriptions table
-- ============================================================================

-- Create backup table with timestamp
DO $$
DECLARE
  backup_table_name TEXT;
BEGIN
  backup_table_name := 'subscriptions_backup_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM subscriptions', backup_table_name);
  RAISE NOTICE 'Created backup table: %', backup_table_name;
END $$;

-- ============================================================================
-- STEP 2: Verify no data loss before migration
-- ============================================================================

DO $$
DECLARE
  pre_migration_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pre_migration_count FROM subscriptions;
  RAISE NOTICE 'Pre-migration record count: %', pre_migration_count;
END $$;

-- ============================================================================
-- STEP 3: Drop the unique constraint (will be recreated with new name)
-- ============================================================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS unique_stripe_customer_id;

DO $$
BEGIN
  RAISE NOTICE 'Dropped unique constraint: unique_stripe_customer_id';
END $$;

-- ============================================================================
-- STEP 4: Drop existing indexes (will be recreated with new column references)
-- ============================================================================

DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id;
DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription_id;

DO $$
BEGIN
  RAISE NOTICE 'Dropped indexes: idx_subscriptions_stripe_customer_id, idx_subscriptions_stripe_subscription_id';
END $$;

-- ============================================================================
-- STEP 5: Rename columns to payment-gateway-agnostic names
-- ============================================================================

ALTER TABLE subscriptions RENAME COLUMN stripe_customer_id TO payment_gateway_customer_id;
ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO payment_gateway_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN stripe_price_id TO payment_gateway_plan_id;

DO $$
BEGIN
  RAISE NOTICE 'Renamed columns to payment-gateway-agnostic names';
END $$;

-- ============================================================================
-- STEP 6: Create new unique constraint with payment-gateway-agnostic name
-- ============================================================================

ALTER TABLE subscriptions 
ADD CONSTRAINT unique_payment_gateway_customer_id UNIQUE (payment_gateway_customer_id);

COMMENT ON CONSTRAINT unique_payment_gateway_customer_id ON subscriptions IS 
'Ensures one subscription row per payment gateway customer. Required for ON CONFLICT in upsertSubscription. Gateway-agnostic to support both Stripe and PayPal.';

DO $$
BEGIN
  RAISE NOTICE 'Created unique constraint: unique_payment_gateway_customer_id';
END $$;

-- ============================================================================
-- STEP 7: Recreate indexes with new column names
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_gateway_customer_id 
ON subscriptions(payment_gateway_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_gateway_subscription_id 
ON subscriptions(payment_gateway_subscription_id);

DO $$
BEGIN
  RAISE NOTICE 'Recreated indexes with new column names';
END $$;

-- ============================================================================
-- STEP 8: Mark existing Stripe subscriptions as legacy_stripe
-- ============================================================================

-- Update all existing subscriptions with non-null payment_gateway_customer_id to legacy_stripe
-- This marks existing Stripe subscriptions for user migration
UPDATE subscriptions
SET status = 'legacy_stripe'
WHERE payment_gateway_customer_id IS NOT NULL
  AND payment_gateway_customer_id != ''
  AND status IN ('active', 'canceled', 'past_due', 'none');

-- Get count of affected records
DO $$
DECLARE
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count 
  FROM subscriptions 
  WHERE status = 'legacy_stripe';
  RAISE NOTICE 'Marked % existing subscriptions as legacy_stripe', legacy_count;
END $$;

-- ============================================================================
-- STEP 9: Verify data integrity after migration
-- ============================================================================

DO $$
DECLARE
  post_migration_count INTEGER;
  pre_migration_count INTEGER;
  constraint_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Verify record count matches
  SELECT COUNT(*) INTO post_migration_count FROM subscriptions;
  
  -- Get pre-migration count from most recent backup table
  EXECUTE format(
    'SELECT COUNT(*) FROM %I',
    (SELECT tablename FROM pg_tables 
     WHERE schemaname = 'public' 
       AND tablename LIKE 'subscriptions_backup_%' 
     ORDER BY tablename DESC LIMIT 1)
  ) INTO pre_migration_count;
  
  IF post_migration_count != pre_migration_count THEN
    RAISE EXCEPTION 'Data integrity check FAILED: Record count mismatch. Pre: %, Post: %', 
      pre_migration_count, post_migration_count;
  END IF;
  
  RAISE NOTICE 'Data integrity check PASSED: Record count matches (% records)', post_migration_count;
  
  -- Verify unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'subscriptions'::regclass
      AND conname = 'unique_payment_gateway_customer_id'
      AND contype = 'u'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Data integrity check FAILED: unique_payment_gateway_customer_id constraint not found';
  END IF;
  
  RAISE NOTICE 'Data integrity check PASSED: unique_payment_gateway_customer_id constraint exists';
  
  -- Verify indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'subscriptions'
    AND indexname IN (
      'idx_subscriptions_payment_gateway_customer_id',
      'idx_subscriptions_payment_gateway_subscription_id'
    );
  
  IF index_count != 2 THEN
    RAISE EXCEPTION 'Data integrity check FAILED: Expected 2 payment gateway indexes, found %', index_count;
  END IF;
  
  RAISE NOTICE 'Data integrity check PASSED: All expected indexes exist';
  
  -- Verify columns were renamed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
      AND column_name IN ('payment_gateway_customer_id', 'payment_gateway_subscription_id', 'payment_gateway_plan_id')
  ) THEN
    RAISE EXCEPTION 'Data integrity check FAILED: New column names not found';
  END IF;
  
  -- Verify old columns don't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
      AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id')
  ) THEN
    RAISE EXCEPTION 'Data integrity check FAILED: Old column names still exist';
  END IF;
  
  RAISE NOTICE 'Data integrity check PASSED: Column rename successful';
END $$;

-- ============================================================================
-- STEP 10: Update table comment
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Stores subscription billing data per user. Supports multiple payment gateways (Stripe legacy, PayPal).';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
DECLARE
  total_records INTEGER;
  legacy_stripe_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM subscriptions;
  SELECT COUNT(*) INTO legacy_stripe_records FROM subscriptions WHERE status = 'legacy_stripe';
  
  RAISE NOTICE '✓ Migration 009 completed successfully';
  RAISE NOTICE '  Total subscriptions: %', total_records;
  RAISE NOTICE '  Legacy Stripe subscriptions: %', legacy_stripe_records;
  RAISE NOTICE '  Backup table: subscriptions_backup_* (check pg_tables for exact name)';
END $$;
