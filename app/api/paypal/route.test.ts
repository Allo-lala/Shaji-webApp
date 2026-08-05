import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

/**
 * PayPal API Route Handler Tests
 * 
 * **Validates: Requirement 13.6**
 * 
 * Unit tests for PayPal API route handlers to ensure:
 * - Proper request validation
 * - Correct database operations with new column names
 * - Appropriate error handling
 * - Expected HTTP status codes
 * 
 * Task 17.3: Create tests for PayPal API route handlers
 */

// Mock dependencies
vi.mock("@/lib/paypal", () => ({
  createSubscription: vi.fn(),
  getSubscriptionDetails: vi.fn(),
  cancelSubscription: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}))

import { createSubscription, getSubscriptionDetails, cancelSubscription, verifyWebhookSignature } from "@/lib/paypal"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription, sql } from "@/lib/db"

// Import route handlers
import { POST as createSubscriptionHandler } from "./create-subscription/route"
import { POST as approveSubscriptionHandler } from "./approve-subscription/route"
import { GET as getSubscriptionHandler } from "./subscription/route"
import { POST as cancelSubscriptionHandler } from "./cancel/route"
import { POST as webhookHandler } from "./webhook/route"

// Mock sql for webhook tests
vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual("@/lib/db")
  return {
    ...actual,
    getUserByWallet: vi.fn(),
    createUser: vi.fn(),
    getSubscriptionByWallet: vi.fn(),
    upsertSubscription: vi.fn(),
    sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => {
      // Mock SQL execution - return empty result
      return Promise.resolve([])
    }),
  }
})

// Store original environment
const originalEnv = { ...process.env }

describe("PayPal API Route Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = "https://test.example.com"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe("POST /api/paypal/create-subscription", () => {
    const mockWalletAddress = "0xtest1234567890abcdef"
    const mockPlanId = "P-TEST123"
    const mockUser = { id: 1, wallet_address: mockWalletAddress }
    const mockPayPalResponse = {
      id: "I-SUBSCRIPTION123",
      status: "APPROVAL_PENDING",
      plan_id: mockPlanId,
      links: [
        { rel: "approve", href: "https://paypal.com/approve" },
        { rel: "self", href: "https://api.paypal.com/v1/billing/subscriptions/I-SUBSCRIPTION123" },
      ],
      billing_info: {
        next_billing_time: "2024-02-01T00:00:00Z",
      },
    }

    it("should create subscription successfully for new user", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(null)
      vi.mocked(createUser).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(createSubscription).mockResolvedValue(mockPayPalResponse)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscriptionId).toBe("I-SUBSCRIPTION123")
      expect(data.approvalUrl).toBe("https://paypal.com/approve")

      // Verify user was created
      expect(getUserByWallet).toHaveBeenCalledWith(mockWalletAddress)
      expect(createUser).toHaveBeenCalledWith(mockWalletAddress)

      // Verify subscription was stored with new column names
      expect(upsertSubscription).toHaveBeenCalledWith(mockUser.id, {
        paymentGatewayCustomerId: mockWalletAddress,
        paymentGatewaySubscriptionId: "I-SUBSCRIPTION123",
        paymentGatewayPlanId: mockPlanId,
        status: "pending",
        currentPeriodEnd: "2024-02-01T00:00:00Z",
      })
    })

    it("should create subscription for existing user", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(createSubscription).mockResolvedValue(mockPayPalResponse)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscriptionId).toBe("I-SUBSCRIPTION123")

      // Verify existing user was used (createUser not called)
      expect(getUserByWallet).toHaveBeenCalledWith(mockWalletAddress)
      expect(createUser).not.toHaveBeenCalled()
    })

    it("should return 400 for missing walletAddress", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("walletAddress")
    })

    it("should return 400 for missing planId", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("planId")
    })

    it("should return 409 when user has active subscription", async () => {
      const existingSubscription = {
        id: 1,
        user_id: 1,
        payment_gateway_customer_id: "cus_existing",
        payment_gateway_subscription_id: "I-EXISTING123",
        payment_gateway_plan_id: "P-EXISTING",
        plan_name: "Professional",
        status: "active",
        current_period_end: "2024-03-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(existingSubscription)

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain("already has an active subscription")
      expect(data.details.planName).toBe("Professional")
      expect(data.details.status).toBe("active")
    })

    it("should return 500 when PayPal API fails", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(createSubscription).mockRejectedValue(new Error("PayPal API error"))

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it("should return 401 for authentication errors", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(createSubscription).mockRejectedValue(new Error("PayPal credentials are missing"))

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain("authentication")
    })

    it("should return 500 when approval URL is missing", async () => {
      const responseWithoutApprovalLink = {
        ...mockPayPalResponse,
        links: [{ rel: "self", href: "https://api.paypal.com/v1/billing/subscriptions/I-SUBSCRIPTION123" }],
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(createSubscription).mockResolvedValue(responseWithoutApprovalLink)

      const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
      })

      const response = await createSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain("approval URL")
    })
  })

  describe("POST /api/paypal/approve-subscription", () => {
    const mockWalletAddress = "0xtest1234567890abcdef"
    const mockSubscriptionId = "I-SUBSCRIPTION123"
    const mockUser = { id: 1, wallet_address: mockWalletAddress }
    const mockPayPalDetails = {
      id: mockSubscriptionId,
      status: "ACTIVE",
      plan_id: "P-PLAN123",
      subscriber: {
        payer_id: "PAYER123",
        email_address: "test@example.com",
      },
      billing_info: {
        next_billing_time: "2024-02-01T00:00:00Z",
        last_payment: {
          amount: { value: "199.99", currency_code: "USD" },
          time: "2024-01-01T00:00:00Z",
        },
      },
      start_time: "2024-01-01T00:00:00Z",
    }

    beforeEach(() => {
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS = "P-STARTERS"
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL = "P-PROFESSIONAL"
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE = "P-ENTERPRISE"
    })

    it("should approve subscription successfully", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(getSubscriptionDetails).mockResolvedValue(mockPayPalDetails)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscriptionId).toBe(mockSubscriptionId)
      expect(data.status).toBe("active")

      // Verify subscription was stored with new column names
      expect(upsertSubscription).toHaveBeenCalledWith(mockUser.id, {
        paymentGatewayCustomerId: "PAYER123",
        paymentGatewaySubscriptionId: mockSubscriptionId,
        paymentGatewayPlanId: "P-PLAN123",
        planName: "P-PLAN123", // Fallback when no match
        status: "active",
        currentPeriodEnd: "2024-02-01T00:00:00Z",
      })
    })

    it("should create new user if not exists", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(null)
      vi.mocked(createUser).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(getSubscriptionDetails).mockResolvedValue(mockPayPalDetails)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)

      expect(response.status).toBe(200)
      expect(createUser).toHaveBeenCalledWith(mockWalletAddress)
    })

    it("should map plan IDs to human-readable names", async () => {
      const startersDetails = {
        ...mockPayPalDetails,
        plan_id: "P-STARTERS",
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(getSubscriptionDetails).mockResolvedValue(startersDetails)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(data.planName).toBe("Starters Pack")
    })

    it("should return 400 for missing walletAddress", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("required")
    })

    it("should return 400 for missing subscriptionId", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("required")
    })

    it("should return 409 when user already has active subscription", async () => {
      const existingSubscription = {
        id: 1,
        user_id: 1,
        payment_gateway_customer_id: "cus_existing",
        payment_gateway_subscription_id: "I-EXISTING123",
        payment_gateway_plan_id: "P-EXISTING",
        plan_name: "Professional",
        status: "active",
        current_period_end: "2024-03-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(existingSubscription)

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain("already active")
    })

    it("should return 404 when subscription not found in PayPal", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(getSubscriptionDetails).mockRejectedValue(new Error("Subscription not found"))

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain("not found")
    })

    it("should return 400 when PayPal response missing payer_id", async () => {
      const detailsWithoutPayer = {
        ...mockPayPalDetails,
        subscriber: {
          email_address: "test@example.com",
        },
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
      vi.mocked(getSubscriptionDetails).mockResolvedValue(detailsWithoutPayer as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("payer_id")
    })

    it("should return 500 for unexpected errors", async () => {
      vi.mocked(getUserByWallet).mockRejectedValue(new Error("Database connection failed"))

      const request = new NextRequest("http://localhost:3000/api/paypal/approve-subscription", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress, subscriptionId: mockSubscriptionId }),
      })

      const response = await approveSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe("GET /api/paypal/subscription", () => {
    const mockWalletAddress = "0xtest1234567890abcdef"
    const mockSubscription = {
      id: 1,
      user_id: 1,
      payment_gateway_customer_id: "cus_123",
      payment_gateway_subscription_id: "I-SUB123",
      payment_gateway_plan_id: "P-PLAN123",
      plan_name: "Professional",
      status: "active",
      current_period_end: "2024-03-01T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    }

    it("should return subscription status successfully", async () => {
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(mockSubscription)

      const request = new NextRequest(
        `http://localhost:3000/api/paypal/subscription?walletAddress=${mockWalletAddress}`
      )

      const response = await getSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.planName).toBe("Professional")
      expect(data.status).toBe("active")
      expect(data.currentPeriodEnd).toBe("2024-03-01T00:00:00Z")

      // Verify new column names are used
      expect(getSubscriptionByWallet).toHaveBeenCalledWith(mockWalletAddress)
    })

    it("should return status 'none' when no subscription exists", async () => {
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)

      const request = new NextRequest(
        `http://localhost:3000/api/paypal/subscription?walletAddress=${mockWalletAddress}`
      )

      const response = await getSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("none")
    })

    it("should return 400 for missing walletAddress", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/subscription")

      const response = await getSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("walletAddress")
    })

    it("should return 500 for database errors", async () => {
      vi.mocked(getSubscriptionByWallet).mockRejectedValue(new Error("Database error"))

      const request = new NextRequest(
        `http://localhost:3000/api/paypal/subscription?walletAddress=${mockWalletAddress}`
      )

      const response = await getSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe("POST /api/paypal/cancel", () => {
    const mockWalletAddress = "0xtest1234567890abcdef"
    const mockUser = { id: 1, wallet_address: mockWalletAddress }
    const mockSubscription = {
      id: 1,
      user_id: 1,
      payment_gateway_customer_id: "cus_123",
      payment_gateway_subscription_id: "I-SUB123",
      payment_gateway_plan_id: "P-PLAN123",
      plan_name: "Professional",
      status: "active",
      current_period_end: "2024-03-01T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    }

    it("should cancel subscription successfully", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(mockSubscription)
      vi.mocked(cancelSubscription).mockResolvedValue(true)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await cancelSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("canceled")

      // Verify subscription was canceled with PayPal
      expect(cancelSubscription).toHaveBeenCalledWith("I-SUB123", "Customer requested cancellation")

      // Verify subscription status was updated to canceled with new column names
      expect(upsertSubscription).toHaveBeenCalledWith(mockSubscription.user_id, {
        paymentGatewayCustomerId: mockSubscription.payment_gateway_customer_id,
        paymentGatewaySubscriptionId: mockSubscription.payment_gateway_subscription_id,
        paymentGatewayPlanId: mockSubscription.payment_gateway_plan_id,
        planName: mockSubscription.plan_name,
        status: "canceled",
        currentPeriodEnd: mockSubscription.current_period_end,
      })
    })

    it("should return 400 for missing walletAddress", async () => {
      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await cancelSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("walletAddress")
    })

    it("should return 404 when no active subscription found", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await cancelSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain("No active subscription")
    })

    it("should return 400 for already canceled subscription", async () => {
      const canceledSubscription = {
        ...mockSubscription,
        status: "canceled",
      }

      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(canceledSubscription)

      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await cancelSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("already canceled")
    })

    it("should return 500 when PayPal cancellation fails", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(mockSubscription)
      vi.mocked(cancelSubscription).mockRejectedValue(new Error("PayPal API error"))

      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      const response = await cancelSubscriptionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it("should preserve current_period_end when canceling", async () => {
      vi.mocked(getUserByWallet).mockResolvedValue(mockUser)
      vi.mocked(getSubscriptionByWallet).mockResolvedValue(mockSubscription)
      vi.mocked(cancelSubscription).mockResolvedValue(true)
      vi.mocked(upsertSubscription).mockResolvedValue({} as any)

      const request = new NextRequest("http://localhost:3000/api/paypal/cancel", {
        method: "POST",
        body: JSON.stringify({ walletAddress: mockWalletAddress }),
      })

      await cancelSubscriptionHandler(request)

      // Verify current_period_end was preserved
      const upsertCall = vi.mocked(upsertSubscription).mock.calls[0]
      expect(upsertCall[1].currentPeriodEnd).toBe(mockSubscription.current_period_end)
    })
  })

  describe("POST /api/paypal/webhook", () => {
    const mockWebhookId = "WH-TEST123"
    const mockHeaders = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-transmission-id": "test-transmission-123",
      "paypal-transmission-sig": "test-signature",
      "paypal-transmission-time": "2024-01-01T00:00:00Z",
    }

    beforeEach(() => {
      process.env.PAYPAL_WEBHOOK_ID = mockWebhookId
    })

    it("should process BILLING.SUBSCRIPTION.ACTIVATED event", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource_type: "subscription",
        resource: {
          id: "I-SUBSCRIPTION123",
          status: "ACTIVE",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify webhook signature was verified
      expect(verifyWebhookSignature).toHaveBeenCalledWith(
        mockWebhookId,
        mockHeaders,
        JSON.stringify(webhookEvent)
      )

      // Verify subscription status was updated to "active"
      expect(sql).toHaveBeenCalled()
      const sqlCall = vi.mocked(sql).mock.calls[0]
      const query = sqlCall[0].join("")
      expect(query).toContain("UPDATE subscriptions")
      expect(query).toContain("status")
      expect(sqlCall[1]).toBe("active")
      expect(sqlCall[2]).toBe("I-SUBSCRIPTION123")
    })

    it("should process BILLING.SUBSCRIPTION.CANCELLED event", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        resource: {
          id: "I-SUBSCRIPTION123",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify subscription status was updated to "canceled"
      const sqlCall = vi.mocked(sql).mock.calls[0]
      expect(sqlCall[1]).toBe("canceled")
    })

    it("should process BILLING.SUBSCRIPTION.SUSPENDED event", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.SUSPENDED",
        resource: {
          id: "I-SUBSCRIPTION123",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify subscription status was updated to "past_due"
      const sqlCall = vi.mocked(sql).mock.calls[0]
      expect(sqlCall[1]).toBe("past_due")
    })

    it("should process BILLING.SUBSCRIPTION.PAYMENT.FAILED event", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        resource: {
          id: "I-SUBSCRIPTION123",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify subscription status was updated to "past_due"
      const sqlCall = vi.mocked(sql).mock.calls[0]
      expect(sqlCall[1]).toBe("past_due")
    })

    it("should process BILLING.SUBSCRIPTION.UPDATED event", async () => {
      const nextBillingTime = "2024-03-01T00:00:00Z"
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.UPDATED",
        resource: {
          id: "I-SUBSCRIPTION123",
          billing_info: {
            next_billing_time: nextBillingTime,
          },
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify current_period_end was updated
      const sqlCall = vi.mocked(sql).mock.calls[0]
      const query = sqlCall[0].join("")
      expect(query).toContain("current_period_end")
      expect(sqlCall[1]).toBe(nextBillingTime)
    })

    it("should acknowledge unhandled event types", async () => {
      const webhookEvent = {
        event_type: "SOME.UNKNOWN.EVENT",
        resource: {
          id: "I-SUBSCRIPTION123",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // No SQL should be called for unhandled events
      expect(sql).not.toHaveBeenCalled()
    })

    it("should return 401 when webhook signature verification fails", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "I-SUBSCRIPTION123" },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain("signature")
    })

    it("should return 401 when signature verification throws error", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "I-SUBSCRIPTION123" },
      }

      vi.mocked(verifyWebhookSignature).mockRejectedValue(new Error("Verification failed"))

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain("verification failed")
    })

    it("should return 500 when PAYPAL_WEBHOOK_ID is not configured", async () => {
      delete process.env.PAYPAL_WEBHOOK_ID

      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "I-SUBSCRIPTION123" },
      }

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain("configuration")
    })

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: "invalid json {",
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("Invalid request body")
    })

    it("should handle events missing resource.id gracefully", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: {},
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // No SQL should be called when resource.id is missing
      expect(sql).not.toHaveBeenCalled()
    })

    it("should return 500 when database update fails", async () => {
      const webhookEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: {
          id: "I-SUBSCRIPTION123",
        },
      }

      vi.mocked(verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(sql).mockRejectedValue(new Error("Database connection failed"))

      const request = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
        headers: mockHeaders,
      })

      const response = await webhookHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain("Webhook handler failed")
    })
  })
})
