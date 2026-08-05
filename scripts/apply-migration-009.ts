import { Pool } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import ws from "ws"

// Configure WebSocket for Node.js environment
// @ts-ignore
if (!globalThis.WebSocket) {
  // @ts-ignore
  globalThis.WebSocket = ws
}

// Use Pool client which supports multi-statement SQL
const pool = new Pool({ connectionString: process.env.NEON_NEON_DATABASE_URL! })

async function applyMigration() {
  const client = await pool.connect()
  
  try {
    console.log('========================================')
    console.log('Migration 009: Payment Gateway Agnostic Schema')
    console.log('========================================\n')
    
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'scripts', '009_migrate_to_payment_gateway_agnostic.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('Applying migration 009: Migrate to payment gateway agnostic schema...\n')
    
    // Execute the migration using Pool client which supports multi-statement SQL
    await client.query(migrationSQL)
    
    console.log('\n✓ Migration 009 applied successfully!\n')
    
    // Verify the changes
    console.log('Verifying migration results...\n')
    
    // 1. Verify new columns exist
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('payment_gateway_customer_id', 'payment_gateway_subscription_id', 'payment_gateway_plan_id')
      ORDER BY column_name
    `)
    const columns = columnsResult.rows
    
    console.log('✓ New columns:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    console.log()
    
    // 2. Verify old columns don't exist
    const oldColumnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
        AND column_name IN ('stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id')
    `)
    const oldColumns = oldColumnsResult.rows
    
    if (oldColumns.length === 0) {
      console.log('✓ Old Stripe-specific columns successfully removed\n')
    } else {
      console.warn('⚠ Warning: Old columns still exist:', oldColumns.map(c => c.column_name))
    }
    
    // 3. Verify unique constraint
    const constraintsResult = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_payment_gateway_customer_id'
    `)
    const constraints = constraintsResult.rows
    
    if (constraints.length > 0) {
      console.log('✓ Unique constraint: unique_payment_gateway_customer_id')
      console.log(`  Type: ${constraints[0].contype === 'u' ? 'UNIQUE' : constraints[0].contype}\n`)
    } else {
      console.error('✗ Error: unique_payment_gateway_customer_id constraint not found\n')
    }
    
    // 4. Verify indexes
    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'subscriptions'
        AND indexname LIKE '%payment_gateway%'
      ORDER BY indexname
    `)
    const indexes = indexesResult.rows
    
    console.log('✓ Indexes:')
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`)
    })
    console.log()
    
    // 5. Count legacy_stripe subscriptions
    const legacyCountResult = await client.query(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'legacy_stripe'
    `)
    const legacyCount = legacyCountResult.rows
    
    console.log(`✓ Legacy Stripe subscriptions marked: ${legacyCount[0].count}\n`)
    
    // 6. Verify backup table exists
    const backupTablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'subscriptions_backup_%'
      ORDER BY tablename DESC
      LIMIT 1
    `)
    const backupTables = backupTablesResult.rows
    
    if (backupTables.length > 0) {
      console.log(`✓ Backup table created: ${backupTables[0].tablename}\n`)
    }
    
    // 7. Total record count
    const totalCountResult = await client.query(`
      SELECT COUNT(*) as count FROM subscriptions
    `)
    const totalCount = totalCountResult.rows
    
    console.log(`✓ Total subscription records: ${totalCount[0].count}\n`)
    
    console.log('========================================')
    console.log('Migration completed successfully!')
    console.log('========================================\n')
    console.log('Next steps:')
    console.log('  1. Update database helper functions (lib/db.ts) to use new column names')
    console.log('  2. Update API routes to use PayPal instead of Stripe')
    console.log('  3. Test the migration with sample data')
    console.log('  4. Keep rollback script available in case of issues\n')
    
    process.exit(0)
  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message)
    console.error('Error details:', error)
    console.error('\nTo rollback, run the rollback script:')
    console.error('  npx tsx scripts/rollback-migration-009.ts\n')
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

applyMigration()
