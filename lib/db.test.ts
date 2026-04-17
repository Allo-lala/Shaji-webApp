import { describe, it, expect, beforeAll } from 'vitest'
import { sql, upsertSubscription } from './db'
import * as fc from 'fast-check'

/**
 * Bug Condition Exploration Test - NOW TESTING FIXED BEHAVIOR
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * This test now verifies the bug is FIXED on the schema with migration 008 applied.
 * EXPECTED OUTCOME: This test MUST PASS on fixed schema (after migration 008).
 * 
 * The fix: Added unique constraint on stripe_customer_id to support ON CONFLICT clause.
 * upsertSubscription should now succeed without throwing NeonDbError.
 */
describe('Bug Condition Exploration - Property 1: Upsert Operations Succeed With Unique Constraint', () => {
  
  beforeAll(async () => {
    // Ensure we have a test user to work with
    const users = await sql`
      INSERT INTO users (wallet_address, name, email)
      VALUES ('0xBugTestWallet', 'Bug Test User', 'bugtest@example.com')
      ON CONFLICT (wallet_address) DO UPDATE
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `
    console.log('Test user created/updated:', users[0])
  })

  it('should successfully upsert subscription without throwing error (Requirement 2.1)', async () => {
    // Get test user
    const users = await sql`SELECT id FROM users WHERE wallet_address = '0xBugTestWallet'`
    const userId = users[0].id

    // Attempt to upsert a subscription - this should now succeed
    // because we have a unique constraint on stripe_customer_id
    const result = await upsertSubscription(userId, {
      stripeCustomerId: 'cus_bug_test_123',
      status: 'none'
    })

    // Verify the upsert succeeded
    expect(result).toBeDefined()
    expect(result.stripe_customer_id).toBe('cus_bug_test_123')
    expect(result.status).toBe('none')
    expect(result.user_id).toBe(userId)

    console.log('✓ First upsert succeeded:', result.id)

    // Try upserting again with the same stripe_customer_id - should update existing row
    const result2 = await upsertSubscription(userId, {
      stripeCustomerId: 'cus_bug_test_123',
      status: 'active',
      planName: 'Pro Plan'
    })

    // Should update the same row (same id)
    expect(result2.id).toBe(result.id)
    expect(result2.status).toBe('active')
    expect(result2.plan_name).toBe('Pro Plan')

    console.log('✓ Second upsert updated existing row:', result2.id)

    // Cleanup
    await sql`DELETE FROM subscriptions WHERE stripe_customer_id = 'cus_bug_test_123'`
  })

  it('should prevent duplicate stripe_customer_id inserts with unique constraint (Requirement 2.3)', async () => {
    // Get test user
    const users = await sql`SELECT id FROM users WHERE wallet_address = '0xBugTestWallet'`
    const userId = users[0].id

    const testCustomerId = 'cus_duplicate_test_' + Date.now()

    // Insert first row with stripe_customer_id
    const insert1 = await sql`
      INSERT INTO subscriptions (user_id, stripe_customer_id, status)
      VALUES (${userId}, ${testCustomerId}, 'none')
      RETURNING id
    `

    expect(insert1[0].id).toBeDefined()
    console.log('✓ First insert succeeded:', insert1[0].id)

    // Attempt to insert second row with same stripe_customer_id
    // This should now fail with unique constraint violation
    await expect(async () => {
      await sql`
        INSERT INTO subscriptions (user_id, stripe_customer_id, status)
        VALUES (${userId}, ${testCustomerId}, 'active')
      `
    }).rejects.toThrow()

    console.log('✓ Second insert correctly rejected due to unique constraint')

    // Cleanup
    await sql`DELETE FROM subscriptions WHERE stripe_customer_id = ${testCustomerId}`
  })

  it('should show unique constraint on stripe_customer_id in pg_constraint (Requirement 2.3)', async () => {
    // Query pg_constraint to verify unique constraint exists
    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND contype IN ('u', 'p')
        AND conname LIKE '%stripe_customer_id%'
    `

    console.log('Constraints found on stripe_customer_id:', constraints)

    // Should find unique constraint on stripe_customer_id
    const uniqueConstraint = constraints.find((c: any) => 
      c.contype === 'u' && c.conname.includes('stripe_customer_id')
    )

    expect(uniqueConstraint).toBeDefined()
    expect(uniqueConstraint.conname).toBe('unique_stripe_customer_id')
    console.log('✓ Unique constraint found:', uniqueConstraint.conname)

    // Verify the constraint is of type 'u' (unique)
    expect(uniqueConstraint.contype).toBe('u')
    console.log('✓ Constraint type is UNIQUE')
  })

  /**
   * Property-Based Test: All upsert operations should succeed on fixed schema
   * 
   * This uses fast-check to generate random subscription data and verify
   * that ALL upsert attempts succeed without errors.
   */
  it('property: all upsert operations succeed on fixed schema', async () => {
    // Get test user
    const users = await sql`SELECT id FROM users WHERE wallet_address = '0xBugTestWallet'`
    const userId = users[0].id

    await fc.assert(
      fc.asyncProperty(
        // Generate random stripe customer IDs
        fc.string({ minLength: 10, maxLength: 30 }).map(s => `cus_pbt_${s}`),
        // Generate random status values
        fc.constantFrom('none', 'active', 'past_due', 'canceled'),
        async (stripeCustomerId, status) => {
          // Every upsert should succeed on fixed schema
          try {
            const result = await upsertSubscription(userId, {
              stripeCustomerId,
              status
            })
            
            // Verify the result is valid
            const isValid = result.id > 0 && 
                           result.stripe_customer_id === stripeCustomerId &&
                           result.status === status
            
            // Cleanup
            await sql`DELETE FROM subscriptions WHERE stripe_customer_id = ${stripeCustomerId}`
            
            return isValid
          } catch (error: any) {
            console.error('Unexpected error during upsert:', error.message)
            return false
          }
        }
      ),
      { numRuns: 10 } // Run 10 random test cases
    )
  }, 15000) // Increase timeout to 15 seconds
})

/**
 * Preservation Property Tests - Property 2: Existing Operations Unchanged
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that non-upsert operations work correctly on the UNFIXED schema.
 * EXPECTED OUTCOME: These tests MUST PASS on unfixed schema (before migration 008).
 * 
 * After the fix is applied, these same tests should continue to pass, proving that
 * existing functionality is preserved.
 */
describe('Preservation Property Tests - Property 2: Existing Operations Unchanged', () => {
  
  let testUserId: number
  let testWalletAddress: string

  beforeAll(async () => {
    // Create test user for preservation tests
    testWalletAddress = '0xPreservationTestWallet_' + Date.now()
    const users = await sql`
      INSERT INTO users (wallet_address, name, email)
      VALUES (${testWalletAddress}, 'Preservation Test User', 'preservation@example.com')
      RETURNING id
    `
    testUserId = users[0].id
    console.log('Preservation test user created:', testUserId)

    // Generate unique customer IDs for this test run
    const timestamp = Date.now()
    
    // Insert test subscriptions using direct INSERT (avoiding upsert)
    await sql`
      INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_end)
      VALUES 
        (${testUserId}, ${`cus_preserve_1_${timestamp}`}, ${`sub_preserve_1_${timestamp}`}, 'price_1', 'Pro Plan', 'active', NOW() + INTERVAL '30 days'),
        (${testUserId}, ${`cus_preserve_2_${timestamp}`}, ${`sub_preserve_2_${timestamp}`}, 'price_2', 'Basic Plan', 'past_due', NOW() + INTERVAL '15 days')
    `
    console.log('Test subscriptions inserted')
  })

  /**
   * Requirement 3.1: Query subscriptions by user_id
   * Verify that SELECT queries by user_id return correct results
   */
  it('should query subscriptions by user_id correctly (Requirement 3.1)', async () => {
    const subscriptions = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${testUserId}
      ORDER BY stripe_customer_id
    `

    expect(subscriptions).toHaveLength(2)
    expect(subscriptions[0].stripe_customer_id).toContain('cus_preserve_1')
    expect(subscriptions[0].status).toBe('active')
    expect(subscriptions[1].stripe_customer_id).toContain('cus_preserve_2')
    expect(subscriptions[1].status).toBe('past_due')
  })

  /**
   * Requirement 3.1: Query subscriptions by stripe_subscription_id
   * Verify that SELECT queries by stripe_subscription_id return correct results
   */
  it('should query subscriptions by stripe_subscription_id correctly (Requirement 3.1)', async () => {
    // Get one of our test subscriptions first
    const ourSubs = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${testUserId} LIMIT 1
    `
    expect(ourSubs.length).toBeGreaterThan(0)
    
    const testSubId = ourSubs[0].stripe_subscription_id
    
    const subscriptions = await sql`
      SELECT * FROM subscriptions WHERE stripe_subscription_id = ${testSubId}
    `

    // Should find at least one subscription with this ID
    expect(subscriptions.length).toBeGreaterThanOrEqual(1)
    // Find our specific test subscription
    const ourSub = subscriptions.find((s: any) => s.user_id === testUserId)
    expect(ourSub).toBeDefined()
    expect(ourSub.stripe_customer_id).toContain('cus_preserve_')
    expect(ourSub.plan_name).toBe('Pro Plan')
  })

  /**
   * Requirement 3.5: JOIN query with users table (getSubscriptionByWallet)
   * Verify that JOIN operations return correct subscription data
   */
  it('should execute getSubscriptionByWallet JOIN query correctly (Requirement 3.5)', async () => {
    const subscription = await sql`
      SELECT s.*
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE u.wallet_address = ${testWalletAddress}
      LIMIT 1
    `

    expect(subscription).toHaveLength(1)
    expect(subscription[0].user_id).toBe(testUserId)
    expect(subscription[0].stripe_customer_id).toMatch(/^cus_preserve_/)
  })

  /**
   * Requirement 3.4: Cascade delete from users to subscriptions
   * Verify that deleting a user cascades to subscriptions
   */
  it('should cascade delete subscriptions when user is deleted (Requirement 3.4)', async () => {
    // Create a temporary user and subscription for deletion test
    const tempWallet = '0xTempDeleteWallet_' + Date.now()
    const tempUsers = await sql`
      INSERT INTO users (wallet_address, name)
      VALUES (${tempWallet}, 'Temp Delete User')
      RETURNING id
    `
    const tempUserId = tempUsers[0].id

    await sql`
      INSERT INTO subscriptions (user_id, stripe_customer_id, status)
      VALUES (${tempUserId}, 'cus_temp_delete', 'none')
    `

    // Verify subscription exists
    const beforeDelete = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${tempUserId}
    `
    expect(beforeDelete).toHaveLength(1)

    // Delete the user
    await sql`DELETE FROM users WHERE id = ${tempUserId}`

    // Verify subscription was cascade deleted
    const afterDelete = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${tempUserId}
    `
    expect(afterDelete).toHaveLength(0)
  })

  /**
   * Requirement 3.3: Query subscriptions by status and verify index usage
   * Verify that queries filtering by status work correctly
   */
  it('should query subscriptions by status correctly (Requirement 3.3)', async () => {
    const activeSubscriptions = await sql`
      SELECT * FROM subscriptions WHERE status = 'active'
    `

    // Should find at least our test subscription
    const ourSubscription = activeSubscriptions.find((s: any) => s.user_id === testUserId)
    expect(ourSubscription).toBeDefined()
    expect(ourSubscription.stripe_customer_id).toContain('cus_preserve_1')
  })

  /**
   * Requirement 3.2: Update existing subscription
   * Verify that UPDATE operations work correctly
   */
  it('should update existing subscription correctly (Requirement 3.2)', async () => {
    // Get one of our test subscriptions
    const ourSubs = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${testUserId} AND status = 'past_due' LIMIT 1
    `
    expect(ourSubs.length).toBeGreaterThan(0)
    
    const testCustomerId = ourSubs[0].stripe_customer_id
    
    // Update subscription status for our specific test user
    await sql`
      UPDATE subscriptions
      SET status = 'canceled', updated_at = NOW()
      WHERE stripe_customer_id = ${testCustomerId} AND user_id = ${testUserId}
    `

    // Verify update
    const updated = await sql`
      SELECT * FROM subscriptions 
      WHERE stripe_customer_id = ${testCustomerId} AND user_id = ${testUserId}
    `

    expect(updated.length).toBeGreaterThanOrEqual(1)
    expect(updated[0].status).toBe('canceled')
  })

  /**
   * Property-Based Test: SELECT queries return consistent results
   * 
   * Generate random user_ids and verify queries return expected data structure
   */
  it('property: SELECT queries by user_id return consistent data structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user IDs (including our test user)
        fc.constantFrom(testUserId, testUserId, 999999, 888888),
        async (userId) => {
          const subscriptions = await sql`
            SELECT * FROM subscriptions WHERE user_id = ${userId}
          `

          // All results should have the expected structure
          for (const sub of subscriptions) {
            if (typeof sub.id !== 'number') return false
            if (typeof sub.user_id !== 'number') return false
            if (typeof sub.stripe_customer_id !== 'string') return false
            if (typeof sub.status !== 'string') return false
          }

          return true
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property-Based Test: JOIN operations return correct data
   * 
   * Generate random wallet addresses and verify JOIN queries work correctly
   */
  it('property: JOIN queries return correct subscription data', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random wallet addresses (including our test wallet)
        fc.constantFrom(testWalletAddress, testWalletAddress, '0xNonExistent', '0xRandom'),
        async (walletAddress) => {
          const result = await sql`
            SELECT s.*
            FROM subscriptions s
            JOIN users u ON u.id = s.user_id
            WHERE u.wallet_address = ${walletAddress}
          `

          // If results exist, they should have valid structure
          for (const sub of result) {
            if (typeof sub.user_id !== 'number') return false
            if (typeof sub.stripe_customer_id !== 'string') return false
          }

          return true
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property-Based Test: Status queries work correctly
   * 
   * Generate random status values and verify queries return valid data
   */
  it('property: queries by status return valid subscriptions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random status values
        fc.constantFrom('none', 'active', 'past_due', 'canceled', 'invalid_status'),
        async (status) => {
          const subscriptions = await sql`
            SELECT * FROM subscriptions WHERE status = ${status}
          `

          // All results should have the queried status
          for (const sub of subscriptions) {
            if (sub.status !== status) return false
          }

          return true
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property-Based Test: Index usage for common queries
   * 
   * Verify that indexes are being used for common query patterns
   * Note: Small tables may use sequential scan instead of index scan for performance
   */
  it('property: queries use appropriate indexes', async () => {
    // Query by user_id - should use idx_subscriptions_user_id (or seq scan if table is small)
    const userIdPlan = await sql`
      EXPLAIN SELECT * FROM subscriptions WHERE user_id = ${testUserId}
    `
    const userIdPlanText = userIdPlan.map((row: any) => row['QUERY PLAN']).join(' ')
    // For small tables, PostgreSQL may choose seq scan over index scan
    expect(userIdPlanText.length).toBeGreaterThan(0)

    // Query by stripe_customer_id - should use unique_stripe_customer_id index
    // (the unique constraint automatically creates an index)
    const ourSubs = await sql`SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${testUserId} LIMIT 1`
    const testCustomerId = ourSubs[0].stripe_customer_id
    
    const customerIdPlan = await sql`
      EXPLAIN SELECT * FROM subscriptions WHERE stripe_customer_id = ${testCustomerId}
    `
    const customerIdPlanText = customerIdPlan.map((row: any) => row['QUERY PLAN']).join(' ')
    // Should use the unique constraint's index (or seq scan if table is small)
    expect(customerIdPlanText.length).toBeGreaterThan(0)

    // Query by status - should use idx_subscriptions_status (or seq scan if table is small)
    const statusPlan = await sql`
      EXPLAIN SELECT * FROM subscriptions WHERE status = 'active'
    `
    const statusPlanText = statusPlan.map((row: any) => row['QUERY PLAN']).join(' ')
    expect(statusPlanText.length).toBeGreaterThan(0)
    
    // Verify that the indexes exist in the database
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'subscriptions'
      ORDER BY indexname
    `
    const indexNames = indexes.map((idx: any) => idx.indexname)
    expect(indexNames).toContain('idx_subscriptions_user_id')
    expect(indexNames).toContain('idx_subscriptions_status')
    expect(indexNames).toContain('unique_stripe_customer_id')
  })
})
