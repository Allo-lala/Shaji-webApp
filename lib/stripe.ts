import Stripe from "stripe"

// Server-side Stripe singleton — secret key never leaves the server
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
})
