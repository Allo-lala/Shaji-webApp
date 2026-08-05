import { type NextRequest, NextResponse } from "next/server"
import { cancelSubscription } from "@/lib/paypal"
import { getUserByWallet, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

/**
 * PayPal Subscription Cancellation Endpoint
 * 
 * Cancels a PayPal subscription for a user identified by wallet address.
 * The subscription is canceled immediately at PayPal but the user retains access
 * until the current billing period ends.
 * 
 * Request body:
 * - walletAddress: User's wallet address
 * 
 * Response:
 * - 200: { status: "canceled", currentPeriodEnd: string }
 * - 400: Missing or invalid parameters 
 * - 401: Authentication failure 
 * - 404: No active subscription found
 * - 500: Server error 
 * 
 * Performance: Completes within 3 seconds
 * 
 * @route POST /api/paypal/cancel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    // Validate required parameter
    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      )
    }

    // Get user by wallet address
    const user = await getUserByWallet(walletAddress)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get subscription from database
    const subscription = await getSubscriptionByWallet(walletAddress)
    
    // Return 404 if no active subscription found
    if (!subscription?.payment_gateway_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      )
    }

    // Prevent cancellation of already-canceled subscriptions
    if (subscription.status === "canceled") {
      return NextResponse.json(
        { error: "Subscription is already canceled" },
        { status: 400 }
      )
    }

    // Call PayPal API to cancel subscription
    try {
      await cancelSubscription(
        subscription.payment_gateway_subscription_id,
        "Customer requested cancellation"
      )
    } catch (error) {
      console.error("[paypal] cancel API error:", error)
      
      // Return PayPal error message to user
      if (error instanceof Error) {
        // Check if it's an authentication error 
        if (error.message.includes("authentication") || error.message.includes("401")) {
          return NextResponse.json(
            { error: "PayPal authentication failed" },
            { status: 401 }
          )
        }
        
        return NextResponse.json(
          { error: error.message || "Failed to cancel subscription" },
          { status: 500 }
        )
      }
      
      throw error
    }

    // Update database status to "canceled" 
    // Preserve current_period_end date
    await upsertSubscription(user.id, {
      paymentGatewayCustomerId: subscription.payment_gateway_customer_id,
      paymentGatewaySubscriptionId: subscription.payment_gateway_subscription_id,
      paymentGatewayPlanId: subscription.payment_gateway_plan_id,
      planName: subscription.plan_name,
      status: "canceled", // cancel
      currentPeriodEnd: subscription.current_period_end, 
    })

    // Return success response
    return NextResponse.json({
      status: "canceled",
      currentPeriodEnd: subscription.current_period_end,
    })
  } catch (error) {
    console.error("[paypal] cancel error:", error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "Failed to cancel subscription" },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
