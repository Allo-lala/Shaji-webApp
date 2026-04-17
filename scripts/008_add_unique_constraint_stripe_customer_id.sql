-- Migration 008: Add unique constraint on stripe_customer_id
-- 
-- This migration fixes the bug where upsertSubscription fails with error code 42P10
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 
-- The upsertSubscription function uses ON CONFLICT (stripe_customer_id) to implement
-- idempotent subscription creation, but PostgreSQL requires an explicit unique constraint
-- or unique index for the ON CONFLICT target.

-- Check for duplicate stripe_customer_id values before adding constraint
-- (None expected based on application logic, but verify to be safe)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT stripe_customer_id, COUNT(*) as cnt
    FROM subscriptions
    GROUP BY stripe_customer_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate stripe_customer_id values. Please resolve duplicates before applying this migration.', duplicate_count;
  END IF;
END $$;

-- Drop the existing non-unique index on stripe_customer_id
-- It will be replaced by the unique constraint's automatically created unique index
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id;

-- Add unique constraint on stripe_customer_id
-- This ensures one subscription row per Stripe customer and enables ON CONFLICT clause
ALTER TABLE subscriptions 
ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_stripe_customer_id ON subscriptions IS 
'Ensures one subscription row per Stripe customer. Required for ON CONFLICT in upsertSubscription.';

-- Verify the constraint was created successfully
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'subscriptions'::regclass
      AND conname = 'unique_stripe_customer_id'
      AND contype = 'u'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Failed to create unique constraint unique_stripe_customer_id';
  END IF;
  
  RAISE NOTICE 'Successfully created unique constraint unique_stripe_customer_id on subscriptions.stripe_customer_id';
END $$;
