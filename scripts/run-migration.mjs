import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"

const sql = neon(process.env.NEON_NEON_DATABASE_URL)

async function applyMigration() {
  try {
    console.log('Applying migration 008: Add unique constraint on stripe_customer_id...')
    
    // Check for duplicates first
    console.log('Checking for duplicate stripe_customer_id values...')
    const duplicates = await sql`
      SELECT stripe_customer_id, COUNT(*) as cnt
      FROM subscriptions
      GROUP BY stripe_customer_id
      HAVING COUNT(*) > 1
    `
    
    if (duplicates.length > 0) {
      console.log('⚠ Found duplicate stripe_customer_id values:')
      console.log(duplicates)
      console.log('Cleaning up duplicates (keeping most recent row for each stripe_customer_id)...')
      
      // For each duplicate stripe_customer_id, keep only the most recent row
      for (const dup of duplicates) {
        const customerId = dup.stripe_customer_id
        console.log(`  Cleaning up duplicates for ${customerId}...`)
        
        // Delete all but the most recent row for this stripe_customer_id
        await sql`
          DELETE FROM subscriptions
          WHERE stripe_customer_id = ${customerId}
          AND id NOT IN (
            SELECT id FROM subscriptions
            WHERE stripe_customer_id = ${customerId}
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
          )
        `
      }
      console.log('✓ Duplicates cleaned up')
    } else {
      console.log('✓ No duplicates found')
    }
    
    // Drop the existing non-unique index
    console.log('Dropping non-unique index idx_subscriptions_stripe_customer_id...')
    await sql`DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id`
    console.log('✓ Index dropped')
    
    // Add unique constraint
    console.log('Adding unique constraint unique_stripe_customer_id...')
    await sql`
      ALTER TABLE subscriptions 
      ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id)
    `
    console.log('✓ Unique constraint added')
    
    // Add comment
    console.log('Adding constraint comment...')
    await sql`
      COMMENT ON CONSTRAINT unique_stripe_customer_id ON subscriptions IS 
      'Ensures one subscription row per Stripe customer. Required for ON CONFLICT in upsertSubscription.'
    `
    console.log('✓ Comment added')
    
    // Verify the constraint was created
    console.log('Verifying constraint creation...')
    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_stripe_customer_id'
    `
    
    if (constraints.length > 0) {
      console.log('✓ Verified: unique_stripe_customer_id constraint exists')
      console.log('  Constraint name:', constraints[0].conname)
      console.log('  Constraint type:', constraints[0].contype === 'u' ? 'UNIQUE' : constraints[0].contype)
    } else {
      throw new Error('Failed to verify constraint creation')
    }
    
    console.log('\n✓ Migration 008 completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

applyMigration()
