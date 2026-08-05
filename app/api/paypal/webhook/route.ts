import { type NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/paypal"
import { sql } from "@/lib/db"

/**
 * POST /api/paypal/webhook
 * 
 * Receive and process PayPal subscription lifecycle webhook events.
 * 
 * 
 * Webhook events:
 * - BILLING.SUBSCRIPTION.ACTIVATED: Set status to "active"
 * - BILLING.SUBSCRIPTION.CANCELLED: Set status to "canceled"
 * - BILLING.SUBSCRIPTION.SUSPENDED: Set status to "past_due"
 * - BILLING.SUBSCRIPTION.PAYMENT.FAILED: Set status to "past_due"
 * - BILLING.SUBSCRIPTION.UPDATED: Update current_period_end timestamp
 * 
 * Response:
 * - 200: { received: true } on successful processing
 * - 401: Webhook signature verification failed
 * - 500: Server error during webhook processing
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Extract webhook verification headers
  const headers: Record<string, string> = {
    "paypal-auth-algo": request.headers.get("paypal-auth-algo") || "",
    "paypal-cert-url": request.headers.get("paypal-cert-url") || "",
    "paypal-transmission-id": request.headers.get("paypal-transmission-id") || "",
    "paypal-transmission-sig": request.headers.get("paypal-transmission-sig") || "",
    "paypal-transmission-time": request.headers.get("paypal-transmission-time") || "",
  }

  // Verify webhook signature
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    console.error("[paypal] webhook: PAYPAL_WEBHOOK_ID environment variable not set")
    return NextResponse.json(
      { error: "Webhook configuration error" },
      { status: 500 }
    )
  }

  try {
    const isValid = await verifyWebhookSignature(webhookId, headers, rawBody)
    
    if (!isValid) {
      console.warn("[paypal] webhook: signature verification failed")
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("[paypal] webhook: signature verification error:", error)
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 401 }
    )
  }

  // Parse webhook event
  let event
  try {
    event = JSON.parse(rawBody)
  } catch (error) {
    console.error("[paypal] webhook: failed to parse request body:", error)
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  // Log webhook event for debugging
  console.log("[paypal] webhook event received:", {
    eventType: event.event_type,
    resourceType: event.resource_type,
    subscriptionId: event.resource?.id,
    timestamp: new Date().toISOString(),
  })

  // Process webhook events based on event type
  try {
    const eventType = event.event_type
    const resource = event.resource

    if (!resource?.id) {
      console.warn("[paypal] webhook: missing resource.id in event")
      return NextResponse.json({ received: true })
    }

    const subscriptionId = resource.id

    switch (eventType) {
      // BILLING.SUBSCRIPTION.ACTIVATED: Set status to "active"
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        await updateSubscriptionStatus(subscriptionId, "active")
        console.log(`[paypal] webhook: subscription ${subscriptionId} activated`)
        break
      }

      // BILLING.SUBSCRIPTION.CANCELLED: Set status to "canceled" 
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        await updateSubscriptionStatus(subscriptionId, "canceled")
        console.log(`[paypal] webhook: subscription ${subscriptionId} canceled`)
        break
      }

      // BILLING.SUBSCRIPTION.SUSPENDED: Set status to "past_due"
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        await updateSubscriptionStatus(subscriptionId, "past_due")
        console.log(`[paypal] webhook: subscription ${subscriptionId} suspended`)
        break
      }

      // BILLING.SUBSCRIPTION.PAYMENT.FAILED: Set status to "past_due"
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        await updateSubscriptionStatus(subscriptionId, "past_due")
        console.log(`[paypal] webhook: subscription ${subscriptionId} payment failed`)
        break
      }

      // BILLING.SUBSCRIPTION.UPDATED: Update current_period_end
      case "BILLING.SUBSCRIPTION.UPDATED": {
        const nextBillingTime = resource.billing_info?.next_billing_time
        if (nextBillingTime) {
          await updateSubscriptionBillingPeriod(subscriptionId, nextBillingTime)
          console.log(
            `[paypal] webhook: subscription ${subscriptionId} billing period updated to ${nextBillingTime}`
          )
        } else {
          console.warn(
            `[paypal] webhook: BILLING.SUBSCRIPTION.UPDATED event missing next_billing_time`
          )
        }
        break
      }

      default:
        // Unhandled event type — acknowledge receipt without action
        console.log(`[paypal] webhook: unhandled event type: ${eventType}`)
        break
    }
  } catch (error) {
    console.error("[paypal] webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }

  // Return 200 on successful processing
  return NextResponse.json({ received: true })
}

/**
 * Update subscription status in database by PayPal subscription ID
 * 
 * @param subscriptionId - PayPal subscription ID
 * @param status - New subscription status
 */
async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string
): Promise<void> {
  await sql`
    UPDATE subscriptions
    SET status = ${status}, updated_at = NOW()
    WHERE payment_gateway_subscription_id = ${subscriptionId}
  `
}

/**
 * Update subscription billing period end date in database
 * 
 * @param subscriptionId - PayPal subscription ID
 * @param currentPeriodEnd - ISO 8601 timestamp for next billing date
 */
async function updateSubscriptionBillingPeriod(
  subscriptionId: string,
  currentPeriodEnd: string
): Promise<void> {
  await sql`
    UPDATE subscriptions
    SET current_period_end = ${currentPeriodEnd}, updated_at = NOW()
    WHERE payment_gateway_subscription_id = ${subscriptionId}
  `
}
