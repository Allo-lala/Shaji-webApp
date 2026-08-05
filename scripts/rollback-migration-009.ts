import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

async function rollbackMigration() {
  try {
    console.log('========================================')
    console.log('Rollback Migration 009: Payment Gateway Agnostic Schema')
    console.log('========================================\n')
    
    console.log('⚠️  WARNING: This will revert to Stripe-specific column names!')
    console.log('⚠️  Only proceed if you are certain no PayPal subscriptions exist.\n')
    
    console.log('Reading rollback script...')
    const rollbackPath = join(process.cwd(), 'scripts', '009_rollback_payment_gateway_agnostic.sql')
    const rollbackSQL = readFileSync(rollbackPath, 'utf-8')
    
    console.log('Applying rollback...\n')
    
    // Execute the rollback
    await sql(rollbackSQL)
    
    console.log('\n✓ Rollback applied successfully!\n')
    
    // Verify the rollback
    console.log('Verifying rollback results...\n')
    
    // 1. Verify Stripe columns exist
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id')
      ORDER BY column_name
    `
    
    console.log('✓ Stripe columns restored:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    console.log()
    
    // 2. Verify payment gateway columns don't exist
    const paymentGatewayColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('payment_gateway_customer_id', 'payment_gateway_subscription_id', 'payment_gateway_plan_id')
    `
    
    if (paymentGatewayColumns.length === 0) {
      console.log('✓ Payment gateway columns successfully removed\n')
    } else {
      console.warn('⚠ Warning: Payment gateway columns still exist:', paymentGatewayColumns.map(c => c.column_name))
    }
    
    // 3. Verify unique constraint
    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_stripe_customer_id'
    `
    
    if (constraints.length > 0) {
      console.log('✓ Unique constraint restored: unique_stripe_customer_id')
      console.log(`  Type: ${constraints[0].contype === 'u' ? 'UNIQUE' : constraints[0].contype}\n`)
    } else {
      console.error('✗ Error: unique_stripe_customer_id constraint not found\n')
    }
    
    // 4. Verify indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'subscriptions'
        AND indexname LIKE '%stripe%'
      ORDER BY indexname
    `
    
    console.log('✓ Stripe indexes restored:')
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`)
    })
    console.log()
    
    // 5. Count canceled subscriptions (formerly legacy_stripe)
    const canceledCount = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'canceled'
    `
    
    console.log(`✓ Canceled subscriptions (formerly legacy_stripe): ${canceledCount[0].count}\n`)
    
    // 6. Verify rollback backup table exists
    const backupTables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'subscriptions_before_rollback_%'
      ORDER BY tablename DESC
      LIMIT 1
    `
    
    if (backupTables.length > 0) {
      console.log(`✓ Rollback backup table created: ${backupTables[0].tablename}\n`)
    }
    
    // 7. Total record count
    const totalCount = await sql`
      SELECT COUNT(*) as count FROM subscriptions
    `
    
    console.log(`✓ Total subscription records: ${totalCount[0].count}\n`)
    
    console.log('========================================')
    console.log('Rollback completed successfully!')
    console.log('========================================\n')
    console.log('Next steps:')
    console.log('  1. Verify application functionality with Stripe integration')
    console.log('  2. Update code to use stripe_* column names if necessary')
    console.log('  3. Review and clean up backup tables when confirmed successful\n')
    
    process.exit(0)
  } catch (error: any) {
    console.error('\n✗ Rollback failed:', error.message)
    console.error('Error details:', error)
    console.error('\nManual intervention may be required.')
    console.error('Check database state and backup tables.\n')
    process.exit(1)
  }
}

rollbackMigration()
