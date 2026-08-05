// @ts-ignore - @paypal/checkout-server-sdk has no type definitions
import paypal from "@paypal/checkout-server-sdk"

/**
 * PayPal API Response Interfaces
 */

export interface PayPalSubscriptionResponse {
  id: string
  status: string
  status_update_time: string
  plan_id: string
  start_time: string
  quantity: string
  subscriber: {
    email_address?: string
    payer_id?: string
    name?: {
      given_name?: string
      surname?: string
    }
  }
  billing_info?: {
    outstanding_balance?: {
      value: string
      currency_code: string
    }
    cycle_executions?: Array<{
      tenure_type: string
      sequence: number
      cycles_completed: number
      cycles_remaining: number
      current_pricing_scheme_version: number
    }>
    last_payment?: {
      amount: {
        value: string
        currency_code: string
      }
      time: string
    }
    next_billing_time?: string
    final_payment_time?: string
    failed_payments_count?: number
  }
  create_time: string
  update_time: string
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface PayPalSubscriptionDetails {
  id: string
  plan_id: string
  status: string
  start_time: string
  billing_info?: {
    next_billing_time?: string
    last_payment?: {
      amount: {
        value: string
        currency_code: string
      }
      time: string
    }
  }
}

export interface PayPalErrorResponse {
  name: string
  message: string
  debug_id?: string
  details?: Array<{
    issue: string
    description: string
  }>
}

/**
 * Lazy singleton for PayPal client - avoids crashing at build time when env vars are not set
 */
let _paypalClient: paypal.core.PayPalHttpClient | null = null

/**
 * Get or initialize PayPal client with sandbox or production environment
 * 
 * **Validates: Requirements 16.1, 16.2**
 * 
 * @throws {Error} When PayPal credentials are invalid or missing
 * @returns PayPal HTTP client configured for the appropriate environment
 */
export function getPayPalClient(): paypal.core.PayPalHttpClient {
  if (!_paypalClient) {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error(
        "PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables."
      )
    }

    // Determine environment based on NODE_ENV or explicit PAYPAL_MODE setting
    const mode = process.env.PAYPAL_MODE || process.env.NODE_ENV
    const environment =
      mode === "production"
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret)

    _paypalClient = new paypal.core.PayPalHttpClient(environment)
  }

  return _paypalClient
}

/**
 * Create a PayPal subscription for a given plan
 * 
 * **Validates: Requirements 16.3**
 * 
 * @param planId - The PayPal billing plan ID
 * @param returnUrl - URL to redirect after subscription approval (optional)
 * @param cancelUrl - URL to redirect if user cancels (optional)
 * @returns PayPal subscription response with subscription ID and approval URL
 * @throws {Error} When subscription creation fails
 */
export async function createSubscription(
  planId: string,
  returnUrl?: string,
  cancelUrl?: string
): Promise<PayPalSubscriptionResponse> {
  try {
    const client = getPayPalClient()

    const requestBody = {
      plan_id: planId,
      application_context: {
        brand_name: "Shaji",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pricing`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pricing`,
      },
    }

    // Create subscription request using the REST API
    const request = new paypal.orders.OrdersCreateRequest()
    request.requestBody(requestBody as any)

    // Note: The @paypal/checkout-server-sdk doesn't have a direct SubscriptionsCreateRequest
    // We need to use the REST API directly via fetch
    const url =
      client.environment.constructor.name === "LiveEnvironment"
        ? "https://api-m.paypal.com/v1/billing/subscriptions"
        : "https://api-m.sandbox.paypal.com/v1/billing/subscriptions"

    const accessToken = await getAccessToken()

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error: PayPalErrorResponse = await response.json()
      throw new Error(
        `PayPal subscription creation failed: ${error.message || error.name}${
          error.details ? ` - ${error.details.map((d) => d.description).join(", ")}` : ""
        }`
      )
    }

    const subscription: PayPalSubscriptionResponse = await response.json()
    return subscription
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to create PayPal subscription")
  }
}

/**
 * Cancel a PayPal subscription
 * 
 * **Validates: Requirements 16.4**
 * 
 * @param subscriptionId - The PayPal subscription ID to cancel
 * @param reason - Optional reason for cancellation
 * @returns True if cancellation was successful
 * @throws {Error} When subscription cancellation fails
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<boolean> {
  try {
    const client = getPayPalClient()

    const url =
      client.environment.constructor.name === "LiveEnvironment"
        ? `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`
        : `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`

    const accessToken = await getAccessToken()

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: reason || "Customer requested cancellation",
      }),
    })

    if (!response.ok) {
      const error: PayPalErrorResponse = await response.json()
      throw new Error(
        `PayPal subscription cancellation failed: ${error.message || error.name}${
          error.details ? ` - ${error.details.map((d) => d.description).join(", ")}` : ""
        }`
      )
    }

    return true
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to cancel PayPal subscription")
  }
}

/**
 * Get details of a PayPal subscription
 * 
 * **Validates: Requirements 16.5**
 * 
 * @param subscriptionId - The PayPal subscription ID
 * @returns Subscription details including status and billing information
 * @throws {Error} When subscription retrieval fails
 */
export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<PayPalSubscriptionDetails> {
  try {
    const client = getPayPalClient()

    const url =
      client.environment.constructor.name === "LiveEnvironment"
        ? `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`
        : `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`

    const accessToken = await getAccessToken()

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error: PayPalErrorResponse = await response.json()
      throw new Error(
        `Failed to retrieve PayPal subscription: ${error.message || error.name}${
          error.details ? ` - ${error.details.map((d) => d.description).join(", ")}` : ""
        }`
      )
    }

    const subscription: PayPalSubscriptionDetails = await response.json()
    return subscription
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to get PayPal subscription details")
  }
}

/**
 * Verify PayPal webhook signature to ensure authenticity
 * 
 * **Validates: Requirements 16.6**
 * 
 * @param webhookId - The PayPal webhook ID from environment variables
 * @param headers - The webhook request headers
 * @param body - The webhook request body
 * @returns True if signature is valid, false otherwise
 * @throws {Error} When webhook verification fails
 */
export async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  try {
    const client = getPayPalClient()

    const url =
      client.environment.constructor.name === "LiveEnvironment"
        ? "https://api-m.paypal.com/v1/notifications/verify-webhook-signature"
        : "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature"

    const accessToken = await getAccessToken()

    const verificationData = {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verificationData),
    })

    if (!response.ok) {
      const error: PayPalErrorResponse = await response.json()
      throw new Error(
        `Webhook signature verification failed: ${error.message || error.name}`
      )
    }

    const result = await response.json()
    return result.verification_status === "SUCCESS"
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Failed to verify webhook signature")
  }
}

/**
 * Get OAuth 2.0 access token for PayPal API requests
 * 
 * Internal helper function for authenticating API calls
 * 
 * @returns Access token string
 * @throws {Error} When authentication fails or credentials are invalid
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal credentials are missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables."
    )
  }

  const mode = process.env.PAYPAL_MODE || process.env.NODE_ENV
  const url =
    mode === "production"
      ? "https://api-m.paypal.com/v1/oauth2/token"
      : "https://api-m.sandbox.paypal.com/v1/oauth2/token"

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("PayPal authentication failed:", response.status, errorBody)
    throw new Error(
      "Failed to authenticate with PayPal. Please verify your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET."
    )
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Proxy object for backwards compatibility (similar to Stripe implementation)
 */
export const paypalClient = new Proxy({} as paypal.core.PayPalHttpClient, {
  get(_target, prop) {
    return (getPayPalClient() as any)[prop]
  },
})
