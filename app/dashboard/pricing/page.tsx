"use client"

import { useEffect, useState, useCallback } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Check, CreditCard, Loader2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string)

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
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTERS ?? "",
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL ?? "",
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
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE ?? "",
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
// SubscribeForm — rendered inside an <Elements> wrapper
// ---------------------------------------------------------------------------
interface SubscribeFormProps {
  plan: Plan
  walletAddress: string
  onSuccess: () => void
  onCancel: () => void
}

function SubscribeFormInner({ plan, walletAddress, onSuccess, onCancel }: SubscribeFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  // On mount: create a SetupIntent and get the clientSecret
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch("/api/stripe/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        })
        const data = await res.json()
        if (!cancelled) {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret)
          } else {
            setError(data.error ?? "Failed to initialize payment form.")
          }
        }
      } catch {
        if (!cancelled) setError("Failed to initialize payment form.")
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [walletAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return

    setLoading(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError("Card element not found.")
      setLoading(false)
      return
    }

    // Confirm the card setup
    const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (confirmError) {
      setError(confirmError.message ?? "Card confirmation failed.")
      setLoading(false)
      return
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id

    if (!paymentMethodId) {
      setError("Could not retrieve payment method.")
      setLoading(false)
      return
    }

    // Create the subscription
    const res = await fetch("/api/stripe/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        paymentMethodId,
        priceId: plan.priceId,
        planName: plan.name,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to activate subscription.")
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-border bg-background p-3">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
            },
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !stripe || !clientSecret} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            `Subscribe — ${plan.price}/mo`
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

// Wrap SubscribeFormInner with the Stripe Elements provider
function SubscribeForm(props: SubscribeFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <SubscribeFormInner {...props} />
    </Elements>
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
      const res = await fetch(`/api/stripe/subscription?walletAddress=${walletAddress}`)
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
      const res = await fetch("/api/stripe/cancel", {
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
                  <p className="mb-3 text-sm font-medium">Enter your card details</p>
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
  )
}
