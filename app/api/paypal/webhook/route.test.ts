import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock the dependencies BEFORE imports
vi.mock("@/lib/paypal", () => ({
  verifyWebhookSignature: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  sql: vi.fn(),
}))

import { POST } from "./route"
import * as paypalLib from "@/lib/paypal"
import * as db from "@/lib/db"

describe("/api/paypal/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set required environment variable
    process.env.PAYPAL_WEBHOOK_ID = "test-webhook-id"
  })

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    const defaultHeaders = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-transmission-id": "test-transmission-id",
      "paypal-transmission-sig": "test-signature",
      "paypal-transmission-time": new Date().toISOString(),
      ...headers,
    }

    return {
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
      headers: {
        get: vi.fn((name: string) => defaultHeaders[name] || null),
      },
    } as unknown as NextRequest
  }

  describe("Webhook signature verification", () => {
    it("should return 401 if webhook signature verification fails", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "test-sub-123" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(false)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain("Invalid webhook signature")
    })

    it("should return 401 if webhook signature verification throws error", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "test-sub-123" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockRejectedValue(
        new Error("Verification failed")
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain("Webhook verification failed")
    })

    it("should return 500 if PAYPAL_WEBHOOK_ID is not set", async () => {
      delete process.env.PAYPAL_WEBHOOK_ID

      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "test-sub-123" },
      }

      const request = createMockRequest(mockEvent)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain("Webhook configuration error")
    })
  })

  describe("BILLING.SUBSCRIPTION.ACTIVATED event", () => {
    it("should set subscription status to active", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "test-sub-123" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(db.sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("UPDATE subscriptions"),
          expect.stringContaining("SET status ="),
        ]),
        "active",
        "test-sub-123"
      )
    })
  })

  describe("BILLING.SUBSCRIPTION.CANCELLED event", () => {
    it("should set subscription status to canceled", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.CANCELLED",
        resource: { id: "test-sub-456" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(db.sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("UPDATE subscriptions"),
          expect.stringContaining("SET status ="),
        ]),
        "canceled",
        "test-sub-456"
      )
    })
  })

  describe("BILLING.SUBSCRIPTION.SUSPENDED event", () => {
    it("should set subscription status to past_due", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.SUSPENDED",
        resource: { id: "test-sub-789" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(db.sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("UPDATE subscriptions"),
          expect.stringContaining("SET status ="),
        ]),
        "past_due",
        "test-sub-789"
      )
    })
  })

  describe("BILLING.SUBSCRIPTION.PAYMENT.FAILED event", () => {
    it("should set subscription status to past_due", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
        resource: { id: "test-sub-101" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(db.sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("UPDATE subscriptions"),
          expect.stringContaining("SET status ="),
        ]),
        "past_due",
        "test-sub-101"
      )
    })
  })

  describe("BILLING.SUBSCRIPTION.UPDATED event", () => {
    it("should update current_period_end when next_billing_time is provided", async () => {
      const nextBillingTime = "2024-02-01T00:00:00Z"
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.UPDATED",
        resource: {
          id: "test-sub-202",
          billing_info: {
            next_billing_time: nextBillingTime,
          },
        },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(db.sql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining("UPDATE subscriptions"),
          expect.stringContaining("SET current_period_end ="),
        ]),
        nextBillingTime,
        "test-sub-202"
      )
    })

    it("should handle UPDATED event without next_billing_time gracefully", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.UPDATED",
        resource: {
          id: "test-sub-303",
          billing_info: {},
        },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // Should not call sql for billing period update
      expect(db.sql).not.toHaveBeenCalled()
    })
  })

  describe("Unhandled events", () => {
    it("should acknowledge receipt of unhandled event types", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.RENEWED",
        resource: { id: "test-sub-404" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockResolvedValue([])

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // Should not call any database updates
      expect(db.sql).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    it("should return 400 if request body is invalid JSON", async () => {
      const request = {
        text: vi.fn().mockResolvedValue("invalid json {"),
        headers: {
          get: vi.fn(() => "test-value"),
        },
      } as unknown as NextRequest

      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("Invalid request body")
    })

    it("should return 500 if database update fails", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: { id: "test-sub-505" },
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)
      vi.mocked(db.sql).mockRejectedValue(new Error("Database error"))

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain("Webhook handler failed")
    })

    it("should handle events with missing resource.id gracefully", async () => {
      const mockEvent = {
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: {},
      }

      const request = createMockRequest(mockEvent)
      vi.mocked(paypalLib.verifyWebhookSignature).mockResolvedValue(true)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // Should not call database updates
      expect(db.sql).not.toHaveBeenCalled()
    })
  })
})
