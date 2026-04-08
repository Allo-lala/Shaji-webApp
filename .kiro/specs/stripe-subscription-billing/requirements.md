# Requirements Document

## Introduction

This feature adds Stripe-powered subscription billing to the Shaji platform. Users who are logged in will see a Pricing section in the dashboard sidebar. When a user selects a plan, they are prompted to enter their card details via Stripe Elements. Stripe stores the payment method and automatically charges the customer at the end of each billing month based on the subscribed plan. The currency for all transactions is USD.

## Glossary

- **Subscription**: A recurring billing agreement between a user and Shaji, tied to a specific plan (Starters Pack or Professional).
- **Plan**: A named tier of service with a fixed monthly price in USD (Starters Pack: $199.99/month, Professional: $499.99/month).
- **Stripe Customer**: A Stripe-side record that links a Shaji user (identified by wallet address) to their stored payment method and active subscription.
- **Payment Method**: A credit or debit card tokenized by Stripe and attached to a Stripe Customer.
- **Billing Cycle**: A monthly period at the end of which Stripe automatically charges the customer for their active subscription.
- **Dashboard Sidebar**: The persistent left-side navigation panel visible to authenticated users inside `/dashboard`.
- **Pricing Page**: The public-facing `/pricing` route displaying plan details.
- **Stripe Webhook**: An HTTP callback from Stripe notifying the application of subscription and payment events.
- **Subscription Status**: The current state of a user's subscription (e.g., `active`, `past_due`, `canceled`, `none`).
- **SetupIntent**: A Stripe object used to securely collect and save a card without an immediate charge.

---

## Requirements

### Requirement 1

**User Story:** As a logged-in user, I want to see a Pricing link in the dashboard sidebar, so that I can access subscription plans without leaving the dashboard.

#### Acceptance Criteria

1. WHILE a user is authenticated, THE Dashboard Sidebar SHALL display a "Pricing" navigation item linking to `/dashboard/pricing`.
2. WHEN a user clicks the Pricing sidebar item, THE Dashboard Sidebar SHALL navigate the user to the `/dashboard/pricing` page without a full page reload.

---

### Requirement 2

**User Story:** As a logged-in user, I want to view available subscription plans inside the dashboard, so that I can choose the plan that fits my needs.

#### Acceptance Criteria

1. WHEN a user visits `/dashboard/pricing`, THE system SHALL display the Starters Pack plan at $199.99/month and the Professional plan at $499.99/month with their respective feature lists.
2. WHEN a user already has an active Subscription, THE system SHALL visually indicate which Plan is currently active on the `/dashboard/pricing` page.
3. WHEN a user has no active Subscription, THE system SHALL display a "Subscribe" button for each eligible Plan.

---

### Requirement 3

**User Story:** As a logged-in user, I want to enter my card details securely, so that Stripe can store my Payment Method for automatic monthly billing.

#### Acceptance Criteria

1. WHEN a user clicks "Subscribe" on a Plan, THE system SHALL present a Stripe Elements card input form within the dashboard.
2. WHEN a user submits the card form, THE system SHALL create a SetupIntent via the server-side API and confirm it using the Stripe Elements SDK on the client.
3. IF the card confirmation fails, THEN THE system SHALL display the Stripe error message to the user and keep the form open.
4. WHEN the SetupIntent confirmation succeeds, THE system SHALL attach the Payment Method to the user's Stripe Customer and activate the Subscription for the selected Plan.

---

### Requirement 4

**User Story:** As a subscribed user, I want Stripe to automatically charge my card at the end of each month, so that my subscription remains active without manual action.

#### Acceptance Criteria

1. WHEN a Subscription is created, THE system SHALL configure Stripe to bill the customer automatically at the end of each monthly Billing Cycle in USD.
2. WHEN Stripe successfully charges the customer, THE system SHALL update the user's Subscription Status to `active` in the database.
3. WHEN a Stripe charge fails, THE system SHALL update the user's Subscription Status to `past_due` in the database.
4. WHEN THE system receives a Stripe Webhook event for `invoice.payment_succeeded`, THE system SHALL record the payment and confirm the subscription remains `active`.
5. WHEN THE system receives a Stripe Webhook event for `invoice.payment_failed`, THE system SHALL update the Subscription Status to `past_due`.

---

### Requirement 5

**User Story:** As a subscribed user, I want to cancel my subscription from the dashboard, so that I am not charged after my current billing period ends.

#### Acceptance Criteria

1. WHEN a user has an active Subscription, THE system SHALL display a "Cancel Subscription" option on the `/dashboard/pricing` page.
2. WHEN a user confirms cancellation, THE system SHALL cancel the Subscription in Stripe and update the Subscription Status to `canceled` in the database.
3. WHEN a Subscription is canceled, THE system SHALL retain the user's access until the end of the current Billing Cycle.

---

### Requirement 6

**User Story:** As a developer, I want all Stripe API interactions to occur server-side, so that secret keys are never exposed to the client.

#### Acceptance Criteria

1. THE system SHALL perform all Stripe API calls (creating customers, SetupIntents, subscriptions, and handling webhooks) exclusively in Next.js API route handlers.
2. THE system SHALL read the Stripe secret key only from server-side environment variables and SHALL never include it in client-side bundles.
3. WHEN a Stripe Webhook is received, THE system SHALL validate the webhook signature using the Stripe webhook secret before processing the event.
