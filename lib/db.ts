import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
export const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

// Database query helpers
export async function getUserByWallet(walletAddress: string) {
  const users = await sql`
    SELECT * FROM users WHERE wallet_address = ${walletAddress}
  `
  return users[0] || null
}

export async function createUser(walletAddress: string, name?: string, email?: string) {
  const users = await sql`
    INSERT INTO users (wallet_address, name, email)
    VALUES (${walletAddress}, ${name || null}, ${email || null})
    ON CONFLICT (wallet_address) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
  return users[0]
}

export async function getUserDocuments(userId: number) {
  return await sql`
    SELECT * FROM documents 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
}

export async function createDocument(data: {
  userId: number
  documentType: string
  title: string
  institution: string
  issueDate?: string
  fileUrl?: string
  fileHash?: string
}) {
  const documents = await sql`
    INSERT INTO documents (
      user_id, document_type, title, institution, 
      issue_date, file_url, file_hash
    ) VALUES (
      ${data.userId}, ${data.documentType}, ${data.title}, 
      ${data.institution}, ${data.issueDate || null}, 
      ${data.fileUrl || null}, ${data.fileHash || null}
    )
    RETURNING *
  `
  return documents[0]
}

export async function getUserSignatures(userId: number) {
  return await sql`
    SELECT * FROM signatures 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
}

export async function getSharedFiles(userId: number) {
  return await sql`
    SELECT sf.*, d.title as document_title, d.document_type
    FROM shared_files sf
    JOIN documents d ON sf.document_id = d.id
    WHERE sf.user_id = ${userId}
    ORDER BY sf.created_at DESC
  `
}

// ── Subscription helpers ──────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: number
  user_id: number
  stripe_customer_id: string
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  plan_name: string | null
  status: string
  current_period_end: string | null
  created_at: string
  updated_at: string
}

/**
 * Look up a subscription by wallet address, joining through the users table.
 * Returns null when no subscription row exists for the given wallet.
 */
export async function getSubscriptionByWallet(
  walletAddress: string
): Promise<SubscriptionRow | null> {
  const rows = await sql`
    SELECT s.*
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE u.wallet_address = ${walletAddress}
    LIMIT 1
  `
  return (rows[0] as SubscriptionRow) || null
}

export interface UpsertSubscriptionData {
  stripeCustomerId: string
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  planName?: string | null
  status: string
  currentPeriodEnd?: string | null
}

/**
 * Insert or update the subscription row for a given user.
 * Uses stripe_customer_id as the conflict target so re-subscribing
 * after cancellation updates the existing row rather than creating a duplicate.
 */
export async function upsertSubscription(
  userId: number,
  data: UpsertSubscriptionData
): Promise<SubscriptionRow> {
  const rows = await sql`
    INSERT INTO subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_name,
      status,
      current_period_end,
      updated_at
    ) VALUES (
      ${userId},
      ${data.stripeCustomerId},
      ${data.stripeSubscriptionId ?? null},
      ${data.stripePriceId ?? null},
      ${data.planName ?? null},
      ${data.status},
      ${data.currentPeriodEnd ?? null},
      NOW()
    )
    ON CONFLICT (stripe_customer_id) DO UPDATE SET
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id        = EXCLUDED.stripe_price_id,
      plan_name              = EXCLUDED.plan_name,
      status                 = EXCLUDED.status,
      current_period_end     = EXCLUDED.current_period_end,
      updated_at             = NOW()
    RETURNING *
  `
  return rows[0] as SubscriptionRow
}
