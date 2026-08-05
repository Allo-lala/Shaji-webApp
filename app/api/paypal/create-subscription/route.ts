import { NextRequest, NextResponse } from "next/server"
import { createSubscription } from "@/lib/paypal"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

/**
 * PayPal Subscription Creation Endpoint
 * 
 * 
 * Creates a new PayPal subscription for a user identified by wallet address.
 * Returns subscription ID and approval URL for frontend to complete the subscription flow.
 * 
 * @route POST /api/paypal/create-subscription
 * @body {walletAddress: string, planId: string}
 * @returns {subscriptionId: string, approvalUrl: string}
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { walletAddress, planId } = body

    // Validate required parameters
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid walletAddress parameter" },
        { status: 400 }
      )
    }

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid planId parameter" },
        { status: 400 }
      )
    }

    // Get or create user record
    let user = await getUserByWallet(walletAddress)
    
    if (!user) {
      user = await createUser(walletAddress)
    }

    // Check for existing active subscription
    const existingSubscription = await getSubscriptionByWallet(walletAddress)
    
    if (existingSubscription && existingSubscription.status === "active") {
      return NextResponse.json(
        { 
          error: "User already has an active subscription",
          details: {
            planName: existingSubscription.plan_name,
            status: existingSubscription.status,
            currentPeriodEnd: existingSubscription.current_period_end
          }
        },
        { status: 409 }
      )
    }

    // Call PayPal API to create subscription 
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const returnUrl = `${appUrl}/dashboard/pricing?success=true`
    const cancelUrl = `${appUrl}/dashboard/pricing?canceled=true`

    const paypalSubscription = await createSubscription(planId, returnUrl, cancelUrl)

    // Extract approval URL from links
    const approvalLink = paypalSubscription.links.find(
      (link) => link.rel === "approve"
    )

    if (!approvalLink) {
      return NextResponse.json(
        { error: "Failed to retrieve PayPal approval URL" },
        { status: 500 }
      )
    }

    // Store subscription with pending status
    // We'll update to active when webhook confirms activation
    await upsertSubscription(user.id, {
      paymentGatewayCustomerId: walletAddress, // Using wallet as customer ID
      paymentGatewaySubscriptionId: paypalSubscription.id,
      paymentGatewayPlanId: planId,
      status: "pending",
      currentPeriodEnd: paypalSubscription.billing_info?.next_billing_time || null,
    })

    // Return subscription ID and approval URL to frontend
    return NextResponse.json({
      subscriptionId: paypalSubscription.id,
      approvalUrl: approvalLink.href,
    })
  } catch (error) {
    // Error handling with appropriate HTTP status codes
    console.error("PayPal subscription creation error:", error)

    if (error instanceof Error) {
      // Check for authentication errors
      if (
        error.message.includes("credentials") ||
        error.message.includes("authentication") ||
        error.message.includes("authenticate")
      ) {
        return NextResponse.json(
          { error: "PayPal authentication failed. Please contact support." },
          { status: 401 }
        )
      }

      // Return user-friendly error message
      return NextResponse.json(
        { 
          error: "Failed to create subscription",
          message: error.message 
        },
        { status: 500 }
      )
    }

    // Unexpected error
    return NextResponse.json(
      { error: "An unexpected error occurred while creating subscription" },
      { status: 500 }
    )
  }
}
