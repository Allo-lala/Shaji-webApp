# Implementation Plan: Stripe Subscription Billing

- [x] 1. Install dependencies and configure environment
  - Install `stripe`, `@stripe/stripe-js`, and `@stripe/react-stripe-js` packages
  - Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTERS`, and `STRIPE_PRICE_PROFESSIONAL` to `.env.local`
  - _Requirements: 6.1, 6.2_

- [x] 2. Create the subscriptions database table
- [x] 2.1 Write and run the SQL migration
  - Create `scripts/007_create_subscriptions_table.sql` with the `subscriptions` table schema (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_end)
  - _Requirements: 4.2, 4.3, 5.2_

- [x] 3. Create the Stripe server-side singleton and DB helpers
- [x] 3.1 Implement `lib/stripe.ts`
  - Export a single Stripe instance initialized from `STRIPE_SECRET_KEY`
  - _Requirements: 6.1, 6.2_

- [x] 3.2 Add subscription DB helper functions to `lib/db.ts`
  - `getSubscriptionByWallet(walletAddress)` — looks up subscription joined with users table
  - `upsertSubscription(userId, data)` — insert or update subscription row
  - _Requirements: 4.2, 4.3, 5.2_

- [x] 4. Implement Stripe API routes
- [x] 4.1 Create `app/api/stripe/setup-intent/route.ts`
  - POST handler: accept `walletAddress`, find or create Stripe Customer, create SetupIntent, return `clientSecret`
  - Reuse existing Stripe Customer if one already exists in the subscriptions table (idempotency)
  - _Requirements: 3.2, 6.1_

- [ ]* 4.2 Write property test for SetupIntent idempotency (Property 5)
  - **Property 5: SetupIntent creation is idempotent per user**
  - Use fast-check to generate arbitrary wallet addresses, call setup-intent handler logic multiple times, assert only one Stripe Customer is created per wallet
  - **Validates: Requirements 3.2**

- [x] 4.3 Create `app/api/stripe/subscribe/route.ts`
  - POST handler: accept `walletAddress`, `paymentMethodId`, `priceId`, `planName`
  - Attach payment method to Stripe Customer, create Subscription with `billing_cycle_anchor=now`, `collection_method=charge_automatically`, `currency=usd`
  - Return 409 if subscription already active
  - Upsert subscription row in DB with status from Stripe response
  - _Requirements: 3.4, 4.1, 6.1_

- [x] 4.4 Create `app/api/stripe/cancel/route.ts`
  - POST handler: accept `walletAddress`, cancel the Stripe subscription at period end, update DB status to `canceled`
  - _Requirements: 5.2, 5.3_

- [x] 4.5 Create `app/api/stripe/subscription/route.ts`
  - GET handler: accept `walletAddress` query param, return `{ status, planName, currentPeriodEnd }` from DB
  - _Requirements: 2.2, 5.1_

- [x] 4.6 Create `app/api/stripe/webhook/route.ts`
  - POST handler: validate Stripe signature using `STRIPE_WEBHOOK_SECRET` — return 400 on failure
  - Handle `invoice.payment_succeeded` → set status `active`
  - Handle `invoice.payment_failed` → set status `past_due`
  - Handle `customer.subscription.deleted` → set status `canceled`
  - Export route config with `bodyParser: false` (raw body required for signature verification)
  - _Requirements: 4.4, 4.5, 5.2, 6.3_

- [ ]* 4.7 Write property test for webhook status transitions (Property 1)
  - **Property 1: Subscription status reflects Stripe webhook events**
  - Use fast-check to generate arbitrary subscription IDs, simulate `invoice.payment_succeeded` and `invoice.payment_failed` events through the handler logic, assert DB status is `active` and `past_due` respectively
  - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

- [ ]* 4.8 Write property test for webhook signature rejection (Property 4)
  - **Property 4: Webhook signature validation rejects tampered payloads**
  - Use fast-check to generate arbitrary request bodies with random or missing Stripe-Signature headers, assert handler returns HTTP 400 and does not write to DB
  - **Validates: Requirements 6.3**

- [ ]* 4.9 Write property test for cancel status (Property 2)
  - **Property 2: Cancel sets status to canceled**
  - Use fast-check to generate arbitrary active subscription records, run cancel handler logic, assert resulting DB status is `canceled`
  - **Validates: Requirements 5.2**

- [x] 5. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add Pricing link to the dashboard sidebar
- [x] 6.1 Update `components/dashboard-sidebar.tsx`
  - Add `{ name: "Pricing", href: "/dashboard/pricing", icon: CreditCard }` to the `navigation` array
  - Import `CreditCard` from `lucide-react`
  - _Requirements: 1.1, 1.2_

- [x] 7. Build the dashboard pricing page
- [x] 7.1 Create `app/dashboard/pricing/page.tsx`
  - Fetch current subscription status from `/api/stripe/subscription` on load
  - Render Starters Pack ($199.99/mo) and Professional ($499.99/mo) cards with feature lists
  - Show active plan badge on the subscribed plan
  - Show "Subscribe" button on non-active plans; show "Cancel Subscription" button on the active plan
  - _Requirements: 2.1, 2.2, 2.3, 5.1_

- [x] 7.2 Implement the `SubscribeForm` component inside the pricing page
  - On mount: POST to `/api/stripe/setup-intent` to get `clientSecret`
  - Wrap with `<Elements>` provider from `@stripe/react-stripe-js`
  - Render `<CardElement>` for card input
  - On submit: call `stripe.confirmCardSetup(clientSecret)` then POST to `/api/stripe/subscribe`
  - Display Stripe error messages inline on failure; keep form open
  - On success: refresh subscription status and close form
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.
