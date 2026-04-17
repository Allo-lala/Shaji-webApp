import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'scripts', '008_add_unique_constraint_stripe_customer_id.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('Applying migration 008: Add unique constraint on stripe_customer_id...')
    
    // Execute the migration
    await sql(migrationSQL)
    
    console.log('✓ Migration 008 applied successfully!')
    
    // Verify the constraint was created
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
      console.error('✗ Warning: Could not verify constraint creation')
    }
    
    process.exit(0)
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

applyMigration()
