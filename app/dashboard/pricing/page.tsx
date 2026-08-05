"use client"

import { useEffect, useState, useCallback } from "react"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { Check, CreditCard, Loader2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

interface SubscriptionStatus {
  status: "none" | "active" | "past_due" | "canceled"
  planName: string | null
  currentPeriodEnd: string | null
}

interface Plan {
  id: string
  name: string
  price: string
  priceId: string
  description: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: "starters",
    name: "Starters Pack",
    price: "$199.99",
    priceId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS ?? "",
    description: "Perfect for individuals verifying occasional documents",
    features: [
      "5 verifications per month",
      "Basic document types",
      "Mobile app access",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$499.99",
    priceId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL ?? "",
    description: "For professionals and small teams",
    features: [
      "Unlimited verifications",
      "All document types",
      "Priority support",
      "API access",
      "Bulk verification",
      "Advanced analytics",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$2,500",
    priceId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE ?? "",
    description: "For large organizations and institutions",
    features: [
      "Everything in Professional",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "White-label options",
      "Custom training",
    ],
  },
]

// ---------------------------------------------------------------------------
// SubscribeForm — PayPal subscription button component
// ---------------------------------------------------------------------------
interface SubscribeFormProps {
  plan: Plan
  walletAddress: string
  onSuccess: () => void
  onCancel: () => void
}

function SubscribeForm({ plan, walletAddress, onSuccess, onCancel }: SubscribeFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const createSubscription = async () => {
    try {
      setError(null)
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress, 
          planId: plan.priceId 
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription")
      }
      
      return data.subscriptionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create subscription"
      setError(errorMessage)
      throw err
    }
  }

  const onApprove = async (data: any) => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch("/api/paypal/approve-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          subscriptionId: data.subscriptionID,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Failed to activate subscription")
      }

      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to activate subscription"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const onError = (err: any) => {
    console.error("PayPal error:", err)
    setError("Payment failed. Please try again.")
  }

  return (
    <div className="space-y-4">
      <PayPalButtons
        createSubscription={createSubscription}
        onApprove={onApprove}
        onError={onError}
        disabled={loading}
        style={{
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "subscribe",
        }}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel} 
        disabled={loading}
        className="w-full"
      >
        Cancel
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main pricing page
// ---------------------------------------------------------------------------
export default function DashboardPricingPage() {
  const { walletAddress } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    status: "none",
    planName: null,
    currentPeriodEnd: null,
  })
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!walletAddress) return
    try {
      const res = await fetch(`/api/paypal/subscription?walletAddress=${walletAddress}`)
      const data: SubscriptionStatus = await res.json()
      setSubscription(data)
    } catch {
      // silently fail — status stays "none"
    } finally {
      setLoadingStatus(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleSubscribeSuccess = () => {
    setActivePlanId(null)
    fetchSubscription()
  }

  const handleCancel = async () => {
    if (!walletAddress) return
    setCanceling(true)
    setCancelError(null)
    try {
      const res = await fetch("/api/paypal/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error ?? "Failed to cancel subscription.")
      } else {
        await fetchSubscription()
      }
    } catch {
      setCancelError("Failed to cancel subscription.")
    } finally {
      setCanceling(false)
    }
  }

  const isActivePlan = (plan: Plan) =>
    subscription.status === "active" && subscription.planName === plan.name

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <PayPalScriptProvider 
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        vault: true,
        intent: "subscription",
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Pricing</h2>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your needs</p>
        </div>

      {/* Active subscription info */}
      {subscription.status === "active" && subscription.currentPeriodEnd && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <p className="text-sm">
              <span className="font-medium">{subscription.planName}</span> is active. Next billing date:{" "}
              <span className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </p>
          </div>
        </Card>
      )}

      {subscription.status === "canceled" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Your subscription has been canceled. Access continues until the end of the current billing period.
          </p>
        </Card>
      )}

      {subscription.status === "past_due" && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            Your last payment failed. Please update your payment method to restore access.
          </p>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const active = isActivePlan(plan)
          const showForm = activePlanId === plan.id

          return (
            <Card
              key={plan.id}
              id={plan.id}
              className={`p-6 transition-colors ${active ? "border-primary" : "border-border/50"}`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {active && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Subscribe form (inline) */}
              {showForm && walletAddress && (
                <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-3 text-sm font-medium">Subscribe with PayPal</p>
                  <SubscribeForm
                    plan={plan}
                    walletAddress={walletAddress}
                    onSuccess={handleSubscribeSuccess}
                    onCancel={() => setActivePlanId(null)}
                  />
                </div>
              )}

              {/* Action buttons */}
              {active ? (
                <div className="space-y-2">
                  {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={canceling}
                  >
                    {canceling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling…
                      </>
                    ) : (
                      "Cancel Subscription"
                    )}
                  </Button>
                </div>
              ) : (
                !showForm &&
                subscription.status !== "active" && (
                  <Button
                    className="w-full"
                    onClick={() => setActivePlanId(plan.id)}
                  >
                    Subscribe
                  </Button>
                )
              )}
            </Card>
          )
        })}
      </div>
    </div>
    </PayPalScriptProvider>
  )
}
