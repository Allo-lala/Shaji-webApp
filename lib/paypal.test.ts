import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getPayPalClient,
  createSubscription,
  cancelSubscription,
  getSubscriptionDetails,
  verifyWebhookSignature,
} from "./paypal"

/**
 * PayPal Client Library Tests
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7**
 * 
 * Tests for the PayPal SDK client library functions to ensure:
 * - Proper client initialization with credentials (16.1, 16.2)
 * - Subscription creation functionality (16.3)
 * - Subscription cancellation functionality (16.4)
 * - Subscription details retrieval (16.5)
 * - Webhook signature verification (16.6)
 * - Error handling for invalid credentials (16.7)
 */

// Store original env vars to restore after tests
const originalEnv = { ...process.env }

describe("PayPal Client Library", () => {
  beforeEach(() => {
    // Reset module cache to ensure fresh client initialization
    vi.resetModules()
    
    // Set up test environment variables
    process.env.PAYPAL_CLIENT_ID = "test-client-id"
    process.env.PAYPAL_CLIENT_SECRET = "test-client-secret"
    process.env.NODE_ENV = "test"
  })

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  describe("getPayPalClient", () => {
    it("should initialize PayPal client with sandbox environment in non-production mode (Requirement 16.1, 16.2)", () => {
      process.env.NODE_ENV = "development"
      
      const client = getPayPalClient()
      
      expect(client).toBeDefined()
      expect(client.environment).toBeDefined()
      expect(client.environment.constructor.name).toBe("SandboxEnvironment")
    })

    it("should initialize PayPal client with production environment when NODE_ENV is production (Requirement 16.1, 16.2)", () => {
      process.env.NODE_ENV = "production"
      
      const client = getPayPalClient()
      
      expect(client).toBeDefined()
      expect(client.environment).toBeDefined()
      expect(client.environment.constructor.name).toBe("LiveEnvironment")
    })

    it("should use PAYPAL_MODE environment variable when set (Requirement 16.2)", () => {
      process.env.PAYPAL_MODE = "production"
      process.env.NODE_ENV = "development"
      
      const client = getPayPalClient()
      
      expect(client.environment.constructor.name).toBe("LiveEnvironment")
    })

    it("should throw descriptive error when PAYPAL_CLIENT_ID is missing (Requirement 16.7)", () => {
      delete process.env.PAYPAL_CLIENT_ID
      
      expect(() => getPayPalClient()).toThrow(
        "PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables."
      )
    })

    it("should throw descriptive error when PAYPAL_CLIENT_SECRET is missing (Requirement 16.7)", () => {
      delete process.env.PAYPAL_CLIENT_SECRET
      
      expect(() => getPayPalClient()).toThrow(
        "PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables."
      )
    })

    it("should throw descriptive error when both credentials are missing (Requirement 16.7)", () => {
      delete process.env.PAYPAL_CLIENT_ID
      delete process.env.PAYPAL_CLIENT_SECRET
      
      expect(() => getPayPalClient()).toThrow(
        "PayPal credentials are missing"
      )
    })

    it("should return the same client instance on subsequent calls (singleton pattern)", () => {
      const client1 = getPayPalClient()
      const client2 = getPayPalClient()
      
      expect(client1).toBe(client2)
    })
  })

  describe("createSubscription", () => {
    const mockPlanId = "P-TEST123"
    const mockAccessToken = "mock-access-token"
    const mockSubscriptionResponse = {
      id: "I-SUBSCRIPTION123",
      status: "APPROVAL_PENDING",
      status_update_time: "2024-01-01T00:00:00Z",
      plan_id: mockPlanId,
      start_time: "2024-01-01T00:00:00Z",
      quantity: "1",
      subscriber: {
        email_address: "test@example.com",
        payer_id: "PAYER123",
      },
      create_time: "2024-01-01T00:00:00Z",
      update_time: "2024-01-01T00:00:00Z",
      links: [
        {
          href: "https://paypal.com/approve",
          rel: "approve",
          method: "GET",
        },
      ],
    }

    beforeEach(() => {
      // Mock global fetch for PayPal API calls
      global.fetch = vi.fn()
    })

    it("should create a subscription successfully (Requirement 16.3)", async () => {
      // Mock OAuth token request
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        // Mock subscription creation request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubscriptionResponse,
        } as Response)

      const result = await createSubscription(mockPlanId)

      expect(result).toEqual(mockSubscriptionResponse)
      expect(result.id).toBe("I-SUBSCRIPTION123")
      expect(result.plan_id).toBe(mockPlanId)
      expect(result.status).toBe("APPROVAL_PENDING")
    })

    it("should include return_url and cancel_url in application_context (Requirement 16.3)", async () => {
      const returnUrl = "https://example.com/success"
      const cancelUrl = "https://example.com/cancel"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubscriptionResponse,
        } as Response)

      await createSubscription(mockPlanId, returnUrl, cancelUrl)

      // Check the second fetch call (subscription creation)
      const subscriptionCall = vi.mocked(global.fetch).mock.calls[1]
      const requestBody = JSON.parse(subscriptionCall[1]?.body as string)

      expect(requestBody.application_context.return_url).toBe(returnUrl)
      expect(requestBody.application_context.cancel_url).toBe(cancelUrl)
    })

    it("should use default return_url and cancel_url when not provided", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubscriptionResponse,
        } as Response)

      await createSubscription(mockPlanId)

      const subscriptionCall = vi.mocked(global.fetch).mock.calls[1]
      const requestBody = JSON.parse(subscriptionCall[1]?.body as string)

      expect(requestBody.application_context.return_url).toBe(
        "https://myapp.com/dashboard/pricing"
      )
      expect(requestBody.application_context.cancel_url).toBe(
        "https://myapp.com/dashboard/pricing"
      )
    })

    it("should use sandbox URL for non-production environment", async () => {
      process.env.NODE_ENV = "development"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubscriptionResponse,
        } as Response)

      await createSubscription(mockPlanId)

      const subscriptionCall = vi.mocked(global.fetch).mock.calls[1]
      expect(subscriptionCall[0]).toBe(
        "https://api-m.sandbox.paypal.com/v1/billing/subscriptions"
      )
    })

    it("should use production URL for production environment", async () => {
      process.env.NODE_ENV = "production"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubscriptionResponse,
        } as Response)

      await createSubscription(mockPlanId)

      const subscriptionCall = vi.mocked(global.fetch).mock.calls[1]
      expect(subscriptionCall[0]).toBe(
        "https://api-m.paypal.com/v1/billing/subscriptions"
      )
    })

    it("should throw descriptive error when subscription creation fails", async () => {
      const errorResponse = {
        name: "INVALID_REQUEST",
        message: "Invalid plan ID",
        details: [
          {
            issue: "INVALID_PLAN_ID",
            description: "Plan ID does not exist",
          },
        ],
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        } as Response)

      await expect(createSubscription(mockPlanId)).rejects.toThrow(
        "PayPal subscription creation failed: Invalid plan ID - Plan ID does not exist"
      )
    })

    it("should handle PayPal API errors without details", async () => {
      const errorResponse = {
        name: "SERVICE_UNAVAILABLE",
        message: "Service temporarily unavailable",
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        } as Response)

      await expect(createSubscription(mockPlanId)).rejects.toThrow(
        "PayPal subscription creation failed: Service temporarily unavailable"
      )
    })
  })

  describe("cancelSubscription", () => {
    const mockSubscriptionId = "I-SUBSCRIPTION123"
    const mockAccessToken = "mock-access-token"

    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it("should cancel a subscription successfully (Requirement 16.4)", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

      const result = await cancelSubscription(mockSubscriptionId)

      expect(result).toBe(true)
    })

    it("should include custom cancellation reason when provided (Requirement 16.4)", async () => {
      const customReason = "User requested refund"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

      await cancelSubscription(mockSubscriptionId, customReason)

      const cancelCall = vi.mocked(global.fetch).mock.calls[1]
      const requestBody = JSON.parse(cancelCall[1]?.body as string)

      expect(requestBody.reason).toBe(customReason)
    })

    it("should use default cancellation reason when not provided", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

      await cancelSubscription(mockSubscriptionId)

      const cancelCall = vi.mocked(global.fetch).mock.calls[1]
      const requestBody = JSON.parse(cancelCall[1]?.body as string)

      expect(requestBody.reason).toBe("Customer requested cancellation")
    })

    it("should use sandbox URL for non-production environment", async () => {
      process.env.NODE_ENV = "development"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

      await cancelSubscription(mockSubscriptionId)

      const cancelCall = vi.mocked(global.fetch).mock.calls[1]
      expect(cancelCall[0]).toBe(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${mockSubscriptionId}/cancel`
      )
    })

    it("should use production URL for production environment", async () => {
      process.env.NODE_ENV = "production"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)

      await cancelSubscription(mockSubscriptionId)

      const cancelCall = vi.mocked(global.fetch).mock.calls[1]
      expect(cancelCall[0]).toBe(
        `https://api-m.paypal.com/v1/billing/subscriptions/${mockSubscriptionId}/cancel`
      )
    })

    it("should throw descriptive error when cancellation fails", async () => {
      const errorResponse = {
        name: "RESOURCE_NOT_FOUND",
        message: "Subscription not found",
        details: [
          {
            issue: "INVALID_RESOURCE_ID",
            description: "Specified resource ID does not exist",
          },
        ],
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        } as Response)

      await expect(cancelSubscription(mockSubscriptionId)).rejects.toThrow(
        "PayPal subscription cancellation failed: Subscription not found - Specified resource ID does not exist"
      )
    })
  })

  describe("getSubscriptionDetails", () => {
    const mockSubscriptionId = "I-SUBSCRIPTION123"
    const mockAccessToken = "mock-access-token"
    const mockDetailsResponse = {
      id: mockSubscriptionId,
      plan_id: "P-PLAN123",
      status: "ACTIVE",
      start_time: "2024-01-01T00:00:00Z",
      billing_info: {
        next_billing_time: "2024-02-01T00:00:00Z",
        last_payment: {
          amount: {
            value: "199.99",
            currency_code: "USD",
          },
          time: "2024-01-01T00:00:00Z",
        },
      },
    }

    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it("should retrieve subscription details successfully (Requirement 16.5)", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailsResponse,
        } as Response)

      const result = await getSubscriptionDetails(mockSubscriptionId)

      expect(result).toEqual(mockDetailsResponse)
      expect(result.id).toBe(mockSubscriptionId)
      expect(result.status).toBe("ACTIVE")
      expect(result.plan_id).toBe("P-PLAN123")
      expect(result.billing_info?.next_billing_time).toBe("2024-02-01T00:00:00Z")
    })

    it("should use sandbox URL for non-production environment", async () => {
      process.env.NODE_ENV = "development"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailsResponse,
        } as Response)

      await getSubscriptionDetails(mockSubscriptionId)

      const detailsCall = vi.mocked(global.fetch).mock.calls[1]
      expect(detailsCall[0]).toBe(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${mockSubscriptionId}`
      )
    })

    it("should use production URL for production environment", async () => {
      process.env.NODE_ENV = "production"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDetailsResponse,
        } as Response)

      await getSubscriptionDetails(mockSubscriptionId)

      const detailsCall = vi.mocked(global.fetch).mock.calls[1]
      expect(detailsCall[0]).toBe(
        `https://api-m.paypal.com/v1/billing/subscriptions/${mockSubscriptionId}`
      )
    })

    it("should throw descriptive error when retrieval fails", async () => {
      const errorResponse = {
        name: "RESOURCE_NOT_FOUND",
        message: "Subscription not found",
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        } as Response)

      await expect(getSubscriptionDetails(mockSubscriptionId)).rejects.toThrow(
        "Failed to retrieve PayPal subscription: Subscription not found"
      )
    })
  })

  describe("verifyWebhookSignature", () => {
    const mockWebhookId = "WH-TEST123"
    const mockAccessToken = "mock-access-token"
    const mockHeaders = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-transmission-id": "test-transmission-123",
      "paypal-transmission-sig": "test-signature",
      "paypal-transmission-time": "2024-01-01T00:00:00Z",
    }
    const mockBody = JSON.stringify({
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      resource: { id: "I-SUBSCRIPTION123" },
    })

    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it("should verify webhook signature successfully (Requirement 16.6)", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: "SUCCESS" }),
        } as Response)

      const result = await verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)

      expect(result).toBe(true)
    })

    it("should return false when verification status is not SUCCESS", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: "FAILURE" }),
        } as Response)

      const result = await verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)

      expect(result).toBe(false)
    })

    it("should include all required verification data in request", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: "SUCCESS" }),
        } as Response)

      await verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)

      const verifyCall = vi.mocked(global.fetch).mock.calls[1]
      const requestBody = JSON.parse(verifyCall[1]?.body as string)

      expect(requestBody.auth_algo).toBe(mockHeaders["paypal-auth-algo"])
      expect(requestBody.cert_url).toBe(mockHeaders["paypal-cert-url"])
      expect(requestBody.transmission_id).toBe(mockHeaders["paypal-transmission-id"])
      expect(requestBody.transmission_sig).toBe(mockHeaders["paypal-transmission-sig"])
      expect(requestBody.transmission_time).toBe(mockHeaders["paypal-transmission-time"])
      expect(requestBody.webhook_id).toBe(mockWebhookId)
      expect(requestBody.webhook_event).toEqual(JSON.parse(mockBody))
    })

    it("should use sandbox URL for non-production environment", async () => {
      process.env.NODE_ENV = "development"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: "SUCCESS" }),
        } as Response)

      await verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)

      const verifyCall = vi.mocked(global.fetch).mock.calls[1]
      expect(verifyCall[0]).toBe(
        "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature"
      )
    })

    it("should use production URL for production environment", async () => {
      process.env.NODE_ENV = "production"

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ verification_status: "SUCCESS" }),
        } as Response)

      await verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)

      const verifyCall = vi.mocked(global.fetch).mock.calls[1]
      expect(verifyCall[0]).toBe(
        "https://api-m.paypal.com/v1/notifications/verify-webhook-signature"
      )
    })

    it("should throw descriptive error when verification request fails", async () => {
      const errorResponse = {
        name: "INVALID_REQUEST",
        message: "Invalid signature",
      }

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: mockAccessToken }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => errorResponse,
        } as Response)

      await expect(
        verifyWebhookSignature(mockWebhookId, mockHeaders, mockBody)
      ).rejects.toThrow("Webhook signature verification failed: Invalid signature")
    })
  })
})
