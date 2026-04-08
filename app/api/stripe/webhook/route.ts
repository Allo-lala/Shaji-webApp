import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db"

// Raw body is required for Stripe signature verification
export const config = { api: { bodyParser: false } }

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.warn("[stripe] webhook: missing Stripe-Signature header")
    return NextResponse.json({ error: "Missing Stripe-Signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.warn("[stripe] webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as { subscription?: string }
        if (invoice.subscription) {
          await updateStatusBySubscriptionId(invoice.subscription, "active")
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { subscription?: string }
        if (invoice.subscription) {
          await updateStatusBySubscriptionId(invoice.subscription, "past_due")
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as { id: string }
        await updateStatusBySubscriptionId(subscription.id, "canceled")
        break
      }

      default:
        // Unhandled event type — acknowledge receipt without action
        break
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function updateStatusBySubscriptionId(
  stripeSubscriptionId: string,
  status: string
): Promise<void> {
  await sql`
    UPDATE subscriptions
    SET status = ${status}, updated_at = NOW()
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
  `
}
