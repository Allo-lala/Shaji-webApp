import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/paypal", () => ({
  cancelSubscription: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  getUserByWallet: vi.fn(),
  getSubscriptionByWallet: vi.fn(),
  upsertSubscription: vi.fn(),
}))

import { cancelSubscription } from "@/lib/paypal"
import { getUserByWallet, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

describe("POST /api/paypal/cancel", () => {
  const mockWalletAddress = "0x1234567890123456789012345678901234567890"
  const mockUserId = 1
  const mockSubscriptionId = "I-PAYPAL123"
  const mockCustomerId = "PAYPAL-CUSTOMER-123"
  const mockPlanId = "P-PLAN123"
  const mockPeriodEnd = "2024-12-31T23:59:59Z"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 400 if walletAddress is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("walletAddress is required")
  })

  it("should return 404 if user not found", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("User not found")
  })

  it("should return 404 if no active subscription found", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("No active subscription found")
  })

  it("should return 400 if subscription is already canceled", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue({
      id: 1,
      user_id: mockUserId,
      payment_gateway_customer_id: mockCustomerId,
      payment_gateway_subscription_id: mockSubscriptionId,
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "canceled",
      current_period_end: mockPeriodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Subscription is already canceled")
  })

  it("should successfully cancel subscription and preserve current_period_end", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue({
      id: 1,
      user_id: mockUserId,
      payment_gateway_customer_id: mockCustomerId,
      payment_gateway_subscription_id: mockSubscriptionId,
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "active",
      current_period_end: mockPeriodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(cancelSubscription).mockResolvedValue(true)
    vi.mocked(upsertSubscription).mockResolvedValue({
      id: 1,
      user_id: mockUserId,
      payment_gateway_customer_id: mockCustomerId,
      payment_gateway_subscription_id: mockSubscriptionId,
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "canceled",
      current_period_end: mockPeriodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("canceled")
    expect(data.currentPeriodEnd).toBe(mockPeriodEnd)

    // Verify PayPal API was called
    expect(cancelSubscription).toHaveBeenCalledWith(
      mockSubscriptionId,
      "Customer requested cancellation"
    )

    // Verify database was updated with status "canceled" and preserved current_period_end
    expect(upsertSubscription).toHaveBeenCalledWith(mockUserId, {
      paymentGatewayCustomerId: mockCustomerId,
      paymentGatewaySubscriptionId: mockSubscriptionId,
      paymentGatewayPlanId: mockPlanId,
      planName: "Professional",
      status: "canceled",
      currentPeriodEnd: mockPeriodEnd,
    })
  })

  it("should return 401 for PayPal authentication errors", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue({
      id: 1,
      user_id: mockUserId,
      payment_gateway_customer_id: mockCustomerId,
      payment_gateway_subscription_id: mockSubscriptionId,
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "active",
      current_period_end: mockPeriodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(cancelSubscription).mockRejectedValue(
      new Error("PayPal authentication failed - 401")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("PayPal authentication failed")
  })

  it("should return 500 for PayPal API errors", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue({
      id: 1,
      user_id: mockUserId,
      payment_gateway_customer_id: mockCustomerId,
      payment_gateway_subscription_id: mockSubscriptionId,
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "active",
      current_period_end: mockPeriodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(cancelSubscription).mockRejectedValue(
      new Error("PayPal API error: Service unavailable")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("PayPal API error: Service unavailable")
  })
})
