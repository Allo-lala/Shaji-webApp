import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

async function verifyMigration() {
  try {
    console.log('Checking if migration 008 has been applied...\n')
    
    // Check if unique constraint exists
    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND conname = 'unique_stripe_customer_id'
    `
    
    if (constraints.length > 0) {
      console.log('✅ Migration 008 is ALREADY APPLIED')
      console.log('   Constraint name:', constraints[0].conname)
      console.log('   Constraint type:', constraints[0].contype === 'u' ? 'UNIQUE' : constraints[0].contype)
      console.log('\n✅ Production database is ready!')
    } else {
      console.log('❌ Migration 008 is NOT APPLIED')
      console.log('\n⚠️  You need to run: npx tsx scripts/apply-migration-008.ts')
    }
    
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

verifyMigration()
