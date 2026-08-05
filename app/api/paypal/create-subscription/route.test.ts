import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/paypal", () => ({
  createSubscription: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  getUserByWallet: vi.fn(),
  createUser: vi.fn(),
  getSubscriptionByWallet: vi.fn(),
  upsertSubscription: vi.fn(),
}))

import { createSubscription } from "@/lib/paypal"
import { getUserByWallet, createUser, getSubscriptionByWallet, upsertSubscription } from "@/lib/db"

/**
 * PayPal Create Subscription Endpoint Tests
 * 
 * **Validates: Requirements 6.1, 6.2, 6.7, 10.1, 14.1, 14.2, 14.3, 14.4, 14.7**
 * 
 * Tests the POST /api/paypal/create-subscription endpoint to ensure:
 * - Validates required parameters (walletAddress, planId)
 * - Creates or retrieves user records
 * - Checks for existing active subscriptions (409 conflict)
 * - Calls PayPal API to create subscription
 * - Returns subscription ID and approval URL
 * - Handles errors appropriately
 */

describe("POST /api/paypal/create-subscription", () => {
  const mockWalletAddress = "0x1234567890123456789012345678901234567890"
  const mockPlanId = "P-PLAN123"
  const mockUserId = 1
  const mockSubscriptionId = "I-SUBSCRIPTION123"
  const mockApprovalUrl = "https://paypal.com/approve/subscription"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com"
  })

  it("should return 400 if walletAddress is missing (Requirement 14.4)", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing or invalid walletAddress parameter")
  })

  it("should return 400 if walletAddress is invalid type", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: 12345, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing or invalid walletAddress parameter")
  })

  it("should return 400 if planId is missing (Requirement 14.4)", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing or invalid planId parameter")
  })

  it("should return 400 if planId is invalid type", async () => {
    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: 12345 }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing or invalid planId parameter")
  })

  it("should create user if user doesn't exist (Requirement 6.1)", async () => {
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
    vi.mocked(createSubscription).mockResolvedValue({
      id: mockSubscriptionId,
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
        { href: mockApprovalUrl, rel: "approve", method: "GET" },
      ],
    })
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    await POST(request)

    expect(createUser).toHaveBeenCalledWith(mockWalletAddress)
  })

  it("should return 409 if user already has active subscription (Requirement 6.7, 14.7)", async () => {
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

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe("User already has an active subscription")
    expect(data.details).toHaveProperty("planName", "Professional")
    expect(data.details).toHaveProperty("status", "active")
  })

  it("should allow subscription creation if previous subscription is canceled", async () => {
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
      status: "canceled",
      current_period_end: "2024-12-31T23:59:59Z",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(createSubscription).mockResolvedValue({
      id: mockSubscriptionId,
      status: "APPROVAL_PENDING",
      status_update_time: "2024-01-01T00:00:00Z",
      plan_id: mockPlanId,
      start_time: "2024-01-01T00:00:00Z",
      quantity: "1",
      subscriber: {},
      create_time: "2024-01-01T00:00:00Z",
      update_time: "2024-01-01T00:00:00Z",
      links: [
        { href: mockApprovalUrl, rel: "approve", method: "GET" },
      ],
    })
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(createSubscription).toHaveBeenCalled()
  })

  it("should successfully create subscription and return approval URL (Requirement 6.1, 6.2)", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(createSubscription).mockResolvedValue({
      id: mockSubscriptionId,
      status: "APPROVAL_PENDING",
      status_update_time: "2024-01-01T00:00:00Z",
      plan_id: mockPlanId,
      start_time: "2024-01-01T00:00:00Z",
      quantity: "1",
      subscriber: {},
      billing_info: {
        next_billing_time: "2024-02-01T00:00:00Z",
      },
      create_time: "2024-01-01T00:00:00Z",
      update_time: "2024-01-01T00:00:00Z",
      links: [
        { href: mockApprovalUrl, rel: "approve", method: "GET" },
      ],
    })
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.subscriptionId).toBe(mockSubscriptionId)
    expect(data.approvalUrl).toBe(mockApprovalUrl)

    // Verify PayPal API was called with correct return/cancel URLs
    expect(createSubscription).toHaveBeenCalledWith(
      mockPlanId,
      "https://example.com/dashboard/pricing?success=true",
      "https://example.com/dashboard/pricing?canceled=true"
    )

    // Verify subscription was stored with pending status
    expect(upsertSubscription).toHaveBeenCalledWith(mockUserId, {
      paymentGatewayCustomerId: mockWalletAddress,
      paymentGatewaySubscriptionId: mockSubscriptionId,
      paymentGatewayPlanId: mockPlanId,
      status: "pending",
      currentPeriodEnd: "2024-02-01T00:00:00Z",
    })
  })

  it("should return 500 if approval URL is missing from PayPal response", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(createSubscription).mockResolvedValue({
      id: mockSubscriptionId,
      status: "APPROVAL_PENDING",
      status_update_time: "2024-01-01T00:00:00Z",
      plan_id: mockPlanId,
      start_time: "2024-01-01T00:00:00Z",
      quantity: "1",
      subscriber: {},
      create_time: "2024-01-01T00:00:00Z",
      update_time: "2024-01-01T00:00:00Z",
      links: [], // No approval link
    })

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to retrieve PayPal approval URL")
  })

  it("should return 401 for PayPal authentication errors (Requirement 14.1)", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(createSubscription).mockRejectedValue(
      new Error("PayPal authentication failed - invalid credentials")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("PayPal authentication failed. Please contact support.")
  })

  it("should return 500 for PayPal API errors (Requirement 14.2, 14.3)", async () => {
    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(createSubscription).mockRejectedValue(
      new Error("PayPal API error: Invalid plan ID")
    )

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to create subscription")
    expect(data.message).toBe("PayPal API error: Invalid plan ID")
  })

  it("should handle unexpected errors gracefully", async () => {
    vi.mocked(getUserByWallet).mockRejectedValue("Unexpected error")

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("An unexpected error occurred while creating subscription")
  })

  it("should use localhost URL when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    vi.mocked(getUserByWallet).mockResolvedValue({
      id: mockUserId,
      wallet_address: mockWalletAddress,
      name: null,
      email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.mocked(getSubscriptionByWallet).mockResolvedValue(null)
    vi.mocked(createSubscription).mockResolvedValue({
      id: mockSubscriptionId,
      status: "APPROVAL_PENDING",
      status_update_time: "2024-01-01T00:00:00Z",
      plan_id: mockPlanId,
      start_time: "2024-01-01T00:00:00Z",
      quantity: "1",
      subscriber: {},
      create_time: "2024-01-01T00:00:00Z",
      update_time: "2024-01-01T00:00:00Z",
      links: [
        { href: mockApprovalUrl, rel: "approve", method: "GET" },
      ],
    })
    vi.mocked(upsertSubscription).mockResolvedValue({} as any)

    const request = new NextRequest("http://localhost:3000/api/paypal/create-subscription", {
      method: "POST",
      body: JSON.stringify({ walletAddress: mockWalletAddress, planId: mockPlanId }),
    })

    await POST(request)

    expect(createSubscription).toHaveBeenCalledWith(
      mockPlanId,
      "http://localhost:3000/dashboard/pricing?success=true",
      "http://localhost:3000/dashboard/pricing?canceled=true"
    )
  })
})
