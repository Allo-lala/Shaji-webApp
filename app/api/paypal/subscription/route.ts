import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionByWallet } from "@/lib/db"

/**
 * PayPal Subscription Status Endpoint
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.3, 20.3**
 * 
 * Retrieves subscription status for a user identified by wallet address.
 * Returns plan name, status, and current period end when subscription exists.
 * Returns status "none" when no subscription exists.
 * 
 * @route GET /api/paypal/subscription?walletAddress=<address>
 * @query {walletAddress: string}
 * @returns {planName: string | null, status: string, currentPeriodEnd: string | null}
 */
export async function GET(request: NextRequest) {
  try {
    // Extract wallet address from query parameters (Requirement 8.1)
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress")

    // Validate required parameter
    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      )
    }

    // Query database for subscription by wallet address (Requirement 8.1)
    // The getSubscriptionByWallet function is already optimized with proper indexes (Requirement 8.6, 20.3)
    const subscription = await getSubscriptionByWallet(walletAddress)

    // Return status "none" if no subscription exists (Requirement 8.5)
    if (!subscription) {
      return NextResponse.json({
        status: "none",
        planName: null,
        currentPeriodEnd: null,
      })
    }

    // Return plan name, status, and current period end (Requirements 8.2, 8.3, 8.4)
    return NextResponse.json({
      status: subscription.status,
      planName: subscription.plan_name,
      currentPeriodEnd: subscription.current_period_end,
    })
  } catch (error) {
    // Error handling with appropriate HTTP status codes
    console.error("[paypal] subscription status error:", error)
    
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    )
  }
}
