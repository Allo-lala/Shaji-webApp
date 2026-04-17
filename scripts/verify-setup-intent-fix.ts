/**
 * Manual verification script for setup intent fix
 * 
 * This script verifies that:
 * 1. The unique constraint exists on stripe_customer_id
 * 2. upsertSubscription works correctly (insert and update)
 * 3. The setup intent flow can complete without errors
 */

import { sql, upsertSubscription, getUserByWallet, createUser } from '../lib/db'

async function verifySetupIntentFix() {
  console.log('🔍 Verifying setup intent fix...\n')

  try {
    // Step 1: Verify unique constraint exists
    console.log('1️⃣ Checking for unique constraint on stripe_customer_id...')
    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_stripe_customer_id'
        AND contype = 'u'
    `
    
    if (constraints.length === 0) {
      console.error('❌ FAILED: Unique constraint not found!')
      process.exit(1)
    }
    console.log('✅ Unique constraint exists:', constraints[0].conname)

    // Step 2: Test upsertSubscription (insert)
    console.log('\n2️⃣ Testing upsertSubscription (insert)...')
    const testWallet = '0xVerifyTestWallet_' + Date.now()
    
    let user = await getUserByWallet(testWallet)
    if (!user) {
      user = await createUser(testWallet, 'Verify Test User')
    }

    const testCustomerId = 'cus_verify_' + Date.now()
    const result1 = await upsertSubscription(user.id, {
      stripeCustomerId: testCustomerId,
      status: 'none'
    })
    
    if (!result1 || result1.stripe_customer_id !== testCustomerId) {
      console.error('❌ FAILED: First upsert did not insert correctly')
      process.exit(1)
    }
    console.log('✅ First upsert succeeded (insert):', result1.id)

    // Step 3: Test upsertSubscription (update)
    console.log('\n3️⃣ Testing upsertSubscription (update)...')
    const result2 = await upsertSubscription(user.id, {
      stripeCustomerId: testCustomerId,
      status: 'active',
      planName: 'Pro Plan'
    })
    
    if (result2.id !== result1.id || result2.status !== 'active') {
      console.error('❌ FAILED: Second upsert did not update correctly')
      process.exit(1)
    }
    console.log('✅ Second upsert succeeded (update):', result2.id)

    // Step 4: Verify duplicate prevention
    console.log('\n4️⃣ Testing duplicate prevention...')
    try {
      await sql`
        INSERT INTO subscriptions (user_id, stripe_customer_id, status)
        VALUES (${user.id}, ${testCustomerId}, 'canceled')
      `
      console.error('❌ FAILED: Duplicate insert should have been rejected!')
      process.exit(1)
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        console.log('✅ Duplicate insert correctly rejected')
      } else {
        console.error('❌ FAILED: Unexpected error:', error.message)
        process.exit(1)
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await sql`DELETE FROM subscriptions WHERE stripe_customer_id = ${testCustomerId}`
    await sql`DELETE FROM users WHERE wallet_address = ${testWallet}`

    console.log('\n✅ All verifications passed!')
    console.log('\n📋 Summary:')
    console.log('  ✓ Unique constraint exists on stripe_customer_id')
    console.log('  ✓ upsertSubscription can insert new subscriptions')
    console.log('  ✓ upsertSubscription can update existing subscriptions')
    console.log('  ✓ Duplicate stripe_customer_id values are prevented')
    console.log('\n🎉 Setup intent fix is working correctly!')
    
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error)
    process.exit(1)
  }
}

verifySetupIntentFix()
