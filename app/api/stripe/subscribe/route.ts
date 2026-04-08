import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, paymentMethodId, priceId, planName } = body

    if (!walletAddress || !paymentMethodId || !priceId || !planName) {
      return NextResponse.json({ error: "walletAddress, paymentMethodId, priceId, and planName are required" }, { status: 400 })
    }

    // Get or create user
    let user = await getUserByWallet(walletAddress)
    if (!user) {
      user = await createUser(walletAddress)
    }

    // Check for an existing active subscription
    const existing = await getSubscriptionByWallet(walletAddress)
    if (existing?.status === "active") {
      return NextResponse.json({ error: "Subscription already active" }, { status: 409 })
    }

    if (!existing?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe Customer found. Call setup-intent first." }, { status: 400 })
    }

    const customerId = existing.stripe_customer_id

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

    // Set it as the default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: "charge_automatically",
      currency: "usd",
      expand: ["latest_invoice.payment_intent"],
    })

    // current_period_end lives on the subscription item in Stripe v22+
    const periodEnd = subscription.items.data[0]?.current_period_end
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

    // Persist to DB
    await upsertSubscription(user.id, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      planName,
      status: subscription.status,
      currentPeriodEnd,
    })

    return NextResponse.json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (error) {
    console.error("[stripe] subscribe error:", error)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}
