import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
    }

    // Get or create the user record
    let user = await getUserByWallet(walletAddress)
    if (!user) {
      user = await createUser(walletAddress)
    }

    // Check if a Stripe Customer already exists for this user (idempotency)
    const existing = await getSubscriptionByWallet(walletAddress)
    let customerId: string

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id
    } else {
      // Create a new Stripe Customer
      const customer = await stripe.customers.create({
        metadata: { walletAddress },
      })
      customerId = customer.id

      // Persist the customer ID so future calls reuse it
      await upsertSubscription(user.id, {
        stripeCustomerId: customerId,
        status: "none",
      })
    }

    // Create a SetupIntent for the customer
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    })

    return NextResponse.json({ clientSecret: setupIntent.client_secret })
  } catch (error) {
    console.error("[stripe] setup-intent error:", error)
    return NextResponse.json({ error: "Failed to create SetupIntent" }, { status: 500 })
  }
}
