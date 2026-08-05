-- Rollback Script for Migration 009: Payment Gateway Agnostic Schema
-- 
-- This script reverts the payment-gateway-agnostic changes back to Stripe-specific naming.
-- Use this script if critical issues are discovered after migration and a rollback to Stripe is needed.
--
-- CAUTION: This rollback script should only be used if:
--   1. No PayPal subscriptions have been created yet
--   2. The migration was recently applied and needs to be undone
--   3. You are certain you want to revert to Stripe-only naming
--
-- If PayPal subscriptions exist, this rollback will cause data inconsistency!

-- ============================================================================
-- STEP 1: Verify rollback safety - Check for PayPal subscriptions
-- ============================================================================

DO $$
DECLARE
  paypal_subscription_count INTEGER;
BEGIN
  -- Check if any subscriptions look like PayPal (not legacy_stripe status)
  SELECT COUNT(*) INTO paypal_subscription_count
  FROM subscriptions
  WHERE status NOT IN ('legacy_stripe', 'none', 'active', 'canceled', 'past_due')
     OR (payment_gateway_customer_id NOT LIKE 'cus_%' AND payment_gateway_customer_id IS NOT NULL);
  
  IF paypal_subscription_count > 0 THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: Found % potential PayPal subscriptions. Rollback would cause data inconsistency!', 
      paypal_subscription_count;
  END IF;
  
  RAISE NOTICE 'Rollback safety check PASSED: No PayPal subscriptions detected';
END $$;

-- ============================================================================
-- STEP 2: Verify backup table exists
-- ============================================================================

DO $$
DECLARE
  backup_table_name TEXT;
  backup_count INTEGER;
BEGIN
  -- Find the most recent backup table
  SELECT tablename INTO backup_table_name
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'subscriptions_backup_%'
  ORDER BY tablename DESC
  LIMIT 1;
  
  IF backup_table_name IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK ABORTED: No backup table found. Cannot safely rollback without backup!';
  END IF;
  
  EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO backup_count;
  
  RAISE NOTICE 'Found backup table: % with % records', backup_table_name, backup_count;
END $$;

-- ============================================================================
-- STEP 3: Create rollback backup (backup of current state before rollback)
-- ============================================================================

DO $$
DECLARE
  rollback_backup_name TEXT;
BEGIN
  rollback_backup_name := 'subscriptions_before_rollback_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM subscriptions', rollback_backup_name);
  RAISE NOTICE 'Created rollback backup table: %', rollback_backup_name;
END $$;

-- ============================================================================
-- STEP 4: Revert legacy_stripe status back to original statuses
-- ============================================================================

-- For legacy_stripe subscriptions, we need to determine their original status
-- Assuming active subscriptions were marked as legacy_stripe, revert to 'canceled'
-- This is a safe default as users need to re-subscribe anyway
UPDATE subscriptions
SET status = 'canceled'
WHERE status = 'legacy_stripe';

DO $$
DECLARE
  reverted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reverted_count 
  FROM subscriptions 
  WHERE status = 'canceled';
  RAISE NOTICE 'Reverted % legacy_stripe subscriptions to canceled status', reverted_count;
END $$;

-- ============================================================================
-- STEP 5: Drop the payment-gateway-agnostic unique constraint
-- ============================================================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS unique_payment_gateway_customer_id;

RAISE NOTICE 'Dropped unique constraint: unique_payment_gateway_customer_id';

-- ============================================================================
-- STEP 6: Drop payment-gateway-agnostic indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_subscriptions_payment_gateway_customer_id;
DROP INDEX IF EXISTS idx_subscriptions_payment_gateway_subscription_id;

RAISE NOTICE 'Dropped payment-gateway-agnostic indexes';

-- ============================================================================
-- STEP 7: Rename columns back to Stripe-specific names
-- ============================================================================

ALTER TABLE subscriptions RENAME COLUMN payment_gateway_customer_id TO stripe_customer_id;
ALTER TABLE subscriptions RENAME COLUMN payment_gateway_subscription_id TO stripe_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN payment_gateway_plan_id TO stripe_price_id;

RAISE NOTICE 'Renamed columns back to Stripe-specific names';

-- ============================================================================
-- STEP 8: Recreate Stripe-specific unique constraint
-- ============================================================================

ALTER TABLE subscriptions 
ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);

COMMENT ON CONSTRAINT unique_stripe_customer_id ON subscriptions IS 
'Ensures one subscription row per Stripe customer. Required for ON CONFLICT in upsertSubscription.';

RAISE NOTICE 'Recreated unique constraint: unique_stripe_customer_id';

-- ============================================================================
-- STEP 9: Recreate Stripe-specific indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
ON subscriptions(stripe_subscription_id);

RAISE NOTICE 'Recreated Stripe-specific indexes';

-- ============================================================================
-- STEP 10: Verify rollback integrity
-- ============================================================================

DO $$
DECLARE
  post_rollback_count INTEGER;
  backup_count INTEGER;
  constraint_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Verify record count
  SELECT COUNT(*) INTO post_rollback_count FROM subscriptions;
  
  -- Get original backup count
  EXECUTE format(
    'SELECT COUNT(*) FROM %I',
    (SELECT tablename FROM pg_tables 
     WHERE schemaname = 'public' 
       AND tablename LIKE 'subscriptions_backup_%' 
     ORDER BY tablename DESC LIMIT 1)
  ) INTO backup_count;
  
  IF post_rollback_count != backup_count THEN
    RAISE WARNING 'Record count mismatch after rollback. Original: %, Current: %', 
      backup_count, post_rollback_count;
  ELSE
    RAISE NOTICE 'Rollback integrity check PASSED: Record count matches (% records)', post_rollback_count;
  END IF;
  
  -- Verify unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'subscriptions'::regclass
      AND conname = 'unique_stripe_customer_id'
      AND contype = 'u'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Rollback integrity check FAILED: unique_stripe_customer_id constraint not found';
  END IF;
  
  RAISE NOTICE 'Rollback integrity check PASSED: unique_stripe_customer_id constraint exists';
  
  -- Verify indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'subscriptions'
    AND indexname IN (
      'idx_subscriptions_stripe_customer_id',
      'idx_subscriptions_stripe_subscription_id'
    );
  
  IF index_count != 2 THEN
    RAISE EXCEPTION 'Rollback integrity check FAILED: Expected 2 Stripe indexes, found %', index_count;
  END IF;
  
  RAISE NOTICE 'Rollback integrity check PASSED: All expected indexes exist';
  
  -- Verify columns were renamed back
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
      AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id')
  ) THEN
    RAISE EXCEPTION 'Rollback integrity check FAILED: Stripe column names not found';
  END IF;
  
  -- Verify payment-gateway columns don't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
      AND column_name IN ('payment_gateway_customer_id', 'payment_gateway_subscription_id', 'payment_gateway_plan_id')
  ) THEN
    RAISE EXCEPTION 'Rollback integrity check FAILED: Payment gateway column names still exist';
  END IF;
  
  RAISE NOTICE 'Rollback integrity check PASSED: Column rename successful';
END $$;

-- ============================================================================
-- STEP 11: Update table comment back to Stripe-specific
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription billing data per user';

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
DECLARE
  total_records INTEGER;
  canceled_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM subscriptions;
  SELECT COUNT(*) INTO canceled_records FROM subscriptions WHERE status = 'canceled';
  
  RAISE NOTICE '✓ Rollback completed successfully';
  RAISE NOTICE '  Total subscriptions: %', total_records;
  RAISE NOTICE '  Canceled subscriptions (formerly legacy_stripe): %', canceled_records;
  RAISE NOTICE '  Pre-rollback backup: subscriptions_before_rollback_* (check pg_tables)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Verify application functionality with Stripe integration';
  RAISE NOTICE '  2. Review rollback backup tables and delete when confirmed successful';
  RAISE NOTICE '  3. Update application code to use stripe_* column names';
END $$;
