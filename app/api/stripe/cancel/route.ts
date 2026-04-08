import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getUserByWallet, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
    }

    const user = await getUserByWallet(walletAddress)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const subscription = await getSubscriptionByWallet(walletAddress)
    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    // Cancel at period end so the user retains access until the billing cycle ends
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Update DB status to canceled
    await upsertSubscription(user.id, {
      stripeCustomerId: subscription.stripe_customer_id,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      stripePriceId: subscription.stripe_price_id,
      planName: subscription.plan_name,
      status: "canceled",
      currentPeriodEnd: subscription.current_period_end,
    })

    return NextResponse.json({ status: "canceled" })
  } catch (error) {
    console.error("[stripe] cancel error:", error)
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
  }
}
