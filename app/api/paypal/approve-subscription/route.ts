import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionDetails } from "@/lib/paypal"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

/**
 * POST /api/paypal/approve-subscription
 * 
 * Request body:
 * - walletAddress: User's wallet address
 * - subscriptionId: PayPal subscription ID from approval flow
 * 
 * Response:
 * - 200: { subscriptionId, status, planName, currentPeriodEnd }
 * - 400: Missing parameters or invalid request
 * - 404: Subscription not found in PayPal
 * - 409: User already has active subscription
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, subscriptionId } = body

    // Validate required parameters
    if (!walletAddress || !subscriptionId) {
      return NextResponse.json(
        { error: "walletAddress and subscriptionId are required" },
        { status: 400 }
      )
    }

    // Get or create user record (Requirement 6.3)
    let user = await getUserByWallet(walletAddress)
    if (!user) {
      user = await createUser(walletAddress)
    }

    // Check for existing active subscription
    const existing = await getSubscriptionByWallet(walletAddress)
    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "Subscription already active" },
        { status: 409 }
      )
    }

    // Get subscription details from PayPal
    let subscriptionDetails
    try {
      subscriptionDetails = await getSubscriptionDetails(subscriptionId)
    } catch (error) {
      console.error("[paypal] Failed to get subscription details:", error)
      
      // Check if it's a 404 error
      if (error instanceof Error && error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        )
      }
      
      throw error
    }

    // Extract customer ID, plan ID, and billing info
    const payerId = (subscriptionDetails as any).subscriber?.payer_id
    const planId = subscriptionDetails.plan_id
    const nextBillingTime = subscriptionDetails.billing_info?.next_billing_time

    if (!payerId) {
      return NextResponse.json(
        { error: "PayPal subscription missing payer_id" },
        { status: 400 }
      )
    }

    // Map plan ID to human-readable name
    const planName = getPlanName(planId)

    // Store subscription in database
    await upsertSubscription(user.id, {
      paymentGatewayCustomerId: payerId,
      paymentGatewaySubscriptionId: subscriptionId,
      paymentGatewayPlanId: planId,
      planName,
      status: "active", 
      currentPeriodEnd: nextBillingTime || null,
    })

    // Return success response 
    return NextResponse.json({
      subscriptionId,
      status: "active",
      planName,
      currentPeriodEnd: nextBillingTime || null,
    })
  } catch (error) {
    console.error("[paypal] approve-subscription error:", error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || "Failed to activate subscription" },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    )
  }
}

/**
 * Map PayPal plan ID to human-readable plan name
 * Uses environment variables to identify plan tiers
 */
function getPlanName(planId: string): string {
  const startersPlanId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS
  const professionalPlanId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL
  const enterprisePlanId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE

  if (planId === startersPlanId) {
    return "Starters Pack"
  } else if (planId === professionalPlanId) {
    return "Professional"
  } else if (planId === enterprisePlanId) {
    return "Enterprise"
  }

  // Fallback to plan ID if no match found
  return planId
}
