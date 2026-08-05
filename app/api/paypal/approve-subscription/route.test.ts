import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/paypal", () => ({
  getSubscriptionDetails: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  getUserByWallet: vi.fn(),
  createUser: vi.fn(),
  getSubscriptionByWallet: vi.fn(),
  upsertSubscription: vi.fn(),
}))

import { getSubscriptionDetails } from "@/lib/paypal"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

/**
 * PayPal Approve Subscription Endpoint Tests
 * 
 * **Validates: Requirements 6.3, 6.4, 6.5, 10.2, 14.1, 14.2, 14.3**
 * 
 * Tests the POST /api/paypal/approve-subscription endpoint to ensure:
 * - Validates required parameters (walletAddress, subscriptionId)
 * - Gets or creates user records
 * - Retrieves subscription details from PayPal
 * - Stores subscription data in database
 * - Sets subscription status to active
 * - Returns success response with subscription details
 * - Handles errors appropriately
 */

describe("POST /api/paypal/approve-subscription", () => {
  const mockWalletAddress = "0x1234567890123456789012345678901234567890"
  const mockSubscriptionId = "I-SUBSCRIPTION123"
  const mockUserId = 1
  const mockPayerId = "PAYPAL-PAYER-123"
  const mockPlanId = "P-PLAN123"
  const mockNextBillingTime = "2024-02-01T00:00:00Z"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS = "P-STARTERS"
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL = "P-PROFESSIONAL"
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE = "P-ENTERPRISE"
  })

  it("should return 400 if walletAddress is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({ subscriptionId: mockSubscriptionId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("walletAddress and subscriptionId are required")
  })

  it("should return 400 if subscriptionId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("walletAddress and subscriptionId are required")
  })

  it("should create user if user doesn't exist (Requirement 6.3)", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue(null)
    vi.mocked(createUser).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: mockPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    await POST(request)

    expect(createUser).toHaveBeenCalledWith(mockWalletAddress)
  })

  it("should return 409 if user already has active subscription", async () => {
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
      payment_gateway_customer_id: "CUSTOMER123",
      payment_gateway_subscription_id: "SUB123",
      payment_gateway_plan_id: mockPlanId,
      plan_name: "Professional",
      status: "active",
      current_period_end: "2024-12-31T23:59:59Z",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe("Subscription already active")
  })

  it("should return 404 if subscription not found in PayPal", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockRejectedValue(
      new Error("Subscription not found")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Subscription not found")
  })

  it("should return 400 if subscription missing payer_id", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: mockPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {}, // Missing payer_id
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("PayPal subscription missing payer_id")
  })

  it("should successfully activate subscription with Starters Pack plan (Requirement 6.3, 6.4, 6.5)", async () => {
    const startersPlanId = "P-STARTERS"

    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: startersPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.subscriptionId).toBe(mockSubscriptionId)
    expect(data.status).toBe("active")
    expect(data.planName).toBe("Starters Pack")
    expect(data.currentPeriodEnd).toBe(mockNextBillingTime)

    // Verify subscription was stored in database
    expect(upsertSubscription).toHaveBeenCalledWith(mockUserId, {
      paymentGatewayCustomerId: mockPayerId,
      paymentGatewaySubscriptionId: mockSubscriptionId,
      paymentGatewayPlanId: startersPlanId,
      planName: "Starters Pack",
      status: "active",
      currentPeriodEnd: mockNextBillingTime,
    })
  })

  it("should successfully activate subscription with Professional plan", async () => {
    const professionalPlanId = "P-PROFESSIONAL"

    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: professionalPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.planName).toBe("Professional")
  })

  it("should successfully activate subscription with Enterprise plan", async () => {
    const enterprisePlanId = "P-ENTERPRISE"

    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: enterprisePlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.planName).toBe("Enterprise")
  })

  it("should use plan ID as fallback when plan name not recognized", async () => {
    const unknownPlanId = "P-UNKNOWN"

    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: unknownPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.planName).toBe(unknownPlanId)
  })

  it("should handle subscription without billing_info", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: mockPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      // No billing_info
    } as any)
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.currentPeriodEnd).toBe(null)

    // Verify upsertSubscription was called with null for currentPeriodEnd
    expect(upsertSubscription).toHaveBeenCalledWith(
      mockUserId,
      expect.objectContaining({
        currentPeriodEnd: null,
      })
    )
  })

  it("should return 500 for PayPal API errors (Requirement 14.1, 14.2, 14.3)", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockRejectedValue(
      new Error("PayPal API error: Service unavailable")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("PayPal API error: Service unavailable")
  })

  it("should handle database errors gracefully", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(getSubscriptionDetails).mockResolvedValue({
      id: mockSubscriptionId,
      plan_id: mockPlanId,
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      subscriber: {
        payer_id: mockPayerId,
      },
      billing_info: {
        next_billing_time: mockNextBillingTime,
      },
    } as any)
    vi.mocked(upsertSubscription).mockRejectedValue(new Error("Database connection failed"))

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Database connection failed")
  })

  it("should handle unexpected errors gracefully", async () => {
    vi.mocked(getUserByWallet).mockRejectedValue("Unexpected error")

    const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: mockWalletAddress,
        subscriptionId: mockSubscriptionId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to activate subscription")
  })
})
