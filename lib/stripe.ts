import Stripe from "stripe"

// Lazy singleton — avoids crashing at build time when env var is not set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    _stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" })
  }
  return _stripe
}

// Keep named export for backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop]
  },
})
