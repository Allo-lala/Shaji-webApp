import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionByWallet } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress")

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
    }

    const subscription = await getSubscriptionByWallet(walletAddress)

    if (!subscription) {
      return NextResponse.json({ status: "none", planName: null, currentPeriodEnd: null })
    }

    return NextResponse.json({
      status: subscription.status,
      planName: subscription.plan_name,
      currentPeriodEnd: subscription.current_period_end,
    })
  } catch (error) {
    console.error("[stripe] subscription status error:", error)
    return NextResponse.json({ error: "Failed to fetch subscription status" }, { status: 500 })
  }
}
