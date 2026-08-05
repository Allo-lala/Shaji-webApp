import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

async function verifyMigration() {
  try {
    console.log('========================================')
    console.log('Verification: Migration 009')
    console.log('========================================\n')
    
    let allChecksPassed = true
    
    // Check 1: Verify new columns exist
    console.log('1️⃣ Checking new payment gateway columns...')
    const newColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('payment_gateway_customer_id', 'payment_gateway_subscription_id', 'payment_gateway_plan_id')
      ORDER BY column_name
    `
    
    if (newColumns.length === 3) {
      console.log('✓ All 3 payment gateway columns exist')
      newColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } else {
      console.error('✗ FAILED: Expected 3 payment gateway columns, found', newColumns.length)
      allChecksPassed = false
    }
    console.log()
    
    // Check 2: Verify old columns don't exist
    console.log('2️⃣ Checking old Stripe columns removed...')
    const oldColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id')
    `
    
    if (oldColumns.length === 0) {
      console.log('✓ All Stripe-specific columns removed')
    } else {
      console.error('✗ FAILED: Old Stripe columns still exist:', oldColumns.map(c => c.column_name).join(', '))
      allChecksPassed = false
    }
    console.log()
    
    // Check 3: Verify unique constraint
    console.log('3️⃣ Checking unique constraint...')
    const uniqueConstraint = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_payment_gateway_customer_id'
        AND contype = 'u'
    `
    
    if (uniqueConstraint.length > 0) {
      console.log('✓ Unique constraint exists: unique_payment_gateway_customer_id')
    } else {
      console.error('✗ FAILED: unique_payment_gateway_customer_id constraint not found')
      allChecksPassed = false
    }
    
    // Verify old constraint doesn't exist
    const oldConstraint = await sql`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_stripe_customer_id'
    `
    
    if (oldConstraint.length === 0) {
      console.log('✓ Old Stripe constraint removed: unique_stripe_customer_id')
    } else {
      console.error('✗ FAILED: Old constraint still exists:', oldConstraint[0].conname)
      allChecksPassed = false
    }
    console.log()
    
    // Check 4: Verify indexes
    console.log('4️⃣ Checking indexes...')
    const paymentGatewayIndexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'subscriptions'
        AND indexname LIKE '%payment_gateway%'
      ORDER BY indexname
    `
    
    const expectedIndexes = [
      'idx_subscriptions_payment_gateway_customer_id',
      'idx_subscriptions_payment_gateway_subscription_id'
    ]
    
    const foundIndexNames = paymentGatewayIndexes.map(idx => idx.indexname)
    const allIndexesExist = expectedIndexes.every(name => foundIndexNames.includes(name))
    
    if (allIndexesExist) {
      console.log('✓ All payment gateway indexes exist:')
      paymentGatewayIndexes.forEach(idx => {
        console.log(`  - ${idx.indexname}`)
      })
    } else {
      console.error('✗ FAILED: Missing indexes')
      console.error('  Expected:', expectedIndexes)
      console.error('  Found:', foundIndexNames)
      allChecksPassed = false
    }
    
    // Verify old indexes don't exist
    const oldIndexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'subscriptions'
        AND indexname IN ('idx_subscriptions_stripe_customer_id', 'idx_subscriptions_stripe_subscription_id')
    `
    
    if (oldIndexes.length === 0) {
      console.log('✓ Old Stripe indexes removed')
    } else {
      console.error('✗ FAILED: Old indexes still exist:', oldIndexes.map(i => i.indexname).join(', '))
      allChecksPassed = false
    }
    console.log()
    
    // Check 5: Verify backup table exists
    console.log('5️⃣ Checking backup table...')
    const backupTables = await sql`
      SELECT tablename, 
             (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = pg_tables.tablename) as exists
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'subscriptions_backup_%'
      ORDER BY tablename DESC
      LIMIT 1
    `
    
    if (backupTables.length > 0) {
      console.log(`✓ Backup table exists: ${backupTables[0].tablename}`)
      
      // Get backup row count
      const backupCount = await sql.query(`SELECT COUNT(*) as count FROM ${backupTables[0].tablename}`)
      console.log(`  Records in backup: ${backupCount.rows[0].count}`)
    } else {
      console.error('✗ WARNING: No backup table found')
      // Not a failure, but concerning
    }
    console.log()
    
    // Check 6: Verify data integrity
    console.log('6️⃣ Checking data integrity...')
    const currentCount = await sql`SELECT COUNT(*) as count FROM subscriptions`
    
    if (backupTables.length > 0) {
      const backupCount = await sql.query(`SELECT COUNT(*) as count FROM ${backupTables[0].tablename}`)
      
      if (currentCount[0].count === backupCount.rows[0].count) {
        console.log(`✓ Record count matches backup: ${currentCount[0].count} records`)
      } else {
        console.error('✗ FAILED: Record count mismatch!')
        console.error(`  Current: ${currentCount[0].count}`)
        console.error(`  Backup: ${backupCount.rows[0].count}`)
        allChecksPassed = false
      }
    } else {
      console.log(`  Current record count: ${currentCount[0].count} (no backup to compare)`)
    }
    console.log()
    
    // Check 7: Verify legacy_stripe status
    console.log('7️⃣ Checking legacy_stripe subscriptions...')
    const legacyCount = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'legacy_stripe'
    `
    
    const legacySample = await sql`
      SELECT id, user_id, payment_gateway_customer_id, status
      FROM subscriptions
      WHERE status = 'legacy_stripe'
      LIMIT 3
    `
    
    console.log(`✓ Found ${legacyCount[0].count} subscriptions marked as legacy_stripe`)
    if (legacySample.length > 0) {
      console.log('  Sample records:')
      legacySample.forEach(record => {
        console.log(`    - ID ${record.id}: user ${record.user_id}, customer ${record.payment_gateway_customer_id}`)
      })
    }
    console.log()
    
    // Check 8: Verify table comment
    console.log('8️⃣ Checking table comment...')
    const tableComment = await sql`
      SELECT obj_description('subscriptions'::regclass) as comment
    `
    
    if (tableComment[0].comment && tableComment[0].comment.includes('payment gateway')) {
      console.log('✓ Table comment updated:', tableComment[0].comment)
    } else {
      console.log('  Table comment:', tableComment[0].comment || '(none)')
    }
    console.log()
    
    // Final summary
    console.log('========================================')
    if (allChecksPassed) {
      console.log('✅ All verification checks PASSED')
      console.log('========================================\n')
      console.log('Migration 009 is verified and working correctly.')
      console.log('You can now proceed with updating application code.\n')
      process.exit(0)
    } else {
      console.log('❌ Some verification checks FAILED')
      console.log('========================================\n')
      console.log('Please review the failures above.')
      console.log('Consider running rollback script if issues are critical.\n')
      process.exit(1)
    }
    
  } catch (error: any) {
    console.error('\n✗ Verification failed with error:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

verifyMigration()
