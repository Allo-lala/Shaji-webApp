/**
 * PayPal Sandbox Manual Test Helper
 * 
 * This script helps you manually test the PayPal integration.
 * It provides curl commands and instructions for each test.
 * 
 * Run with: node scripts/test-paypal-manual.js
 */

const fs = require('fs')
const path = require('path')

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
}

const TEST_WALLET = "0xtest1234567890abcdef1234567890abcdef12345678"

const PLANS = {
  starters: process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS,
  professional: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL,
  enterprise: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE
}

console.log('\n' + '='.repeat(70))
console.log('PayPal Sandbox Integration - Manual Testing Guide')
console.log('='.repeat(70))

// Verify configuration
console.log('\n1. CONFIGURATION STATUS')
console.log('-'.repeat(70))

if (process.env.PAYPAL_CLIENT_ID) {
  console.log('✓ PAYPAL_CLIENT_ID configured:', process.env.PAYPAL_CLIENT_ID.substring(0, 20) + '...')
} else {
  console.log('✗ PAYPAL_CLIENT_ID not configured')
}

if (process.env.PAYPAL_CLIENT_SECRET) {
  console.log('✓ PAYPAL_CLIENT_SECRET configured')
} else {
  console.log('✗ PAYPAL_CLIENT_SECRET not configured')
}

if (process.env.PAYPAL_WEBHOOK_ID) {
  console.log('✓ PAYPAL_WEBHOOK_ID configured:', process.env.PAYPAL_WEBHOOK_ID)
} else {
  console.log('⚠ PAYPAL_WEBHOOK_ID not configured (needed for webhook testing)')
}

console.log('\nPlan IDs:')
console.log('  Starters:', PLANS.starters || '⚠ NOT CONFIGURED')
console.log('  Professional:', PLANS.professional || '⚠ NOT CONFIGURED')
console.log('  Enterprise:', PLANS.enterprise || '⚠ NOT CONFIGURED')

// Test instructions
console.log('\n2. START DEVELOPMENT SERVER')
console.log('-'.repeat(70))
console.log('Run: pnpm dev')
console.log('Wait for server to start on http://localhost:3000')

console.log('\n3. TEST SUBSCRIPTION CREATION - STARTERS PACK')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/create-subscription \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '","planId":"' + PLANS.starters + '"}\'')
console.log('\nExpected: JSON with subscriptionId and approvalUrl')
console.log('Performance: Should complete in <5 seconds')

console.log('\n4. TEST SUBSCRIPTION CREATION - PROFESSIONAL')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/create-subscription \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '","planId":"' + PLANS.professional + '"}\'')
console.log('\nExpected: JSON with subscriptionId and approvalUrl')
console.log('Performance: Should complete in <5 seconds')

console.log('\n5. TEST SUBSCRIPTION CREATION - ENTERPRISE')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/create-subscription \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '","planId":"' + PLANS.enterprise + '"}\'')
console.log('\nExpected: JSON with subscriptionId and approvalUrl')
console.log('Performance: Should complete in <5 seconds')

console.log('\n6. TEST SUBSCRIPTION STATUS RETRIEVAL')
console.log('-'.repeat(70))
console.log('curl "http://localhost:3000/api/paypal/subscription?walletAddress=' + TEST_WALLET + '"')
console.log('\nExpected: JSON with status, planName, currentPeriodEnd')
console.log('Performance: Should complete in <500ms')

console.log('\n7. TEST SUBSCRIPTION CANCELLATION')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/cancel \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '"}\'')
console.log('\nExpected: Success message')
console.log('Performance: Should complete in <3 seconds')

console.log('\n8. TEST ERROR HANDLING - INVALID PLAN ID')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/create-subscription \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '","planId":"P-INVALID123"}\'')
console.log('\nExpected: HTTP 400 or 500 with error message')

console.log('\n9. TEST ERROR HANDLING - EMPTY PLAN ID')
console.log('-'.repeat(70))
console.log('curl -X POST http://localhost:3000/api/paypal/create-subscription \\')
console.log('  -H "Content-Type: application/json" \\')
console.log('  -d \'{"walletAddress":"' + TEST_WALLET + '","planId":""}\'')
console.log('\nExpected: HTTP 400 with error message')

console.log('\n10. TEST ERROR HANDLING - DUPLICATE SUBSCRIPTION')
console.log('-'.repeat(70))
console.log('1. Create a subscription using test #3')
console.log('2. Run the same command again')
console.log('\nExpected: HTTP 409 with "User already has an active subscription" error')

console.log('\n11. TEST WEBHOOK EVENT PROCESSING')
console.log('-'.repeat(70))
console.log('Manual testing required:')
console.log('1. Log into PayPal Developer Dashboard:')
console.log('   https://developer.paypal.com/dashboard')
console.log('2. Navigate to: Apps & Credentials > Sandbox > [Your App] > Webhooks')
console.log('3. Add webhook URL (use ngrok or similar for local testing)')
console.log('4. Copy Webhook ID and add to .env.local as PAYPAL_WEBHOOK_ID')
console.log('5. Use Webhook Simulator to send test events:')
console.log('   - BILLING.SUBSCRIPTION.ACTIVATED')
console.log('   - BILLING.SUBSCRIPTION.CANCELLED')
console.log('   - BILLING.SUBSCRIPTION.SUSPENDED')
console.log('   - BILLING.SUBSCRIPTION.PAYMENT.FAILED')
console.log('   - BILLING.SUBSCRIPTION.UPDATED')
console.log('6. Check application logs to verify processing')

console.log('\n12. PERFORMANCE SUMMARY')
console.log('-'.repeat(70))
console.log('Requirements:')
console.log('  ✓ Subscription creation: <5 seconds (Requirement 20.1)')
console.log('  ✓ Subscription cancellation: <3 seconds (Requirement 20.2)')
console.log('  ✓ Status retrieval: <500ms (Requirement 20.3)')
console.log('  ✓ Webhook processing: <2 seconds (Requirement 20.4)')
console.log('  ✓ PayPal button render: <2 seconds (Requirement 20.5)')

console.log('\n13. ADDITIONAL RESOURCES')
console.log('-'.repeat(70))
console.log('PayPal Developer Dashboard: https://developer.paypal.com/dashboard')
console.log('PayPal API Reference: https://developer.paypal.com/docs/api/overview/')
console.log('Test Results Documentation: PAYPAL_SANDBOX_TEST_RESULTS.md')
console.log('Integration Test Suite: app/api/paypal/integration.sandbox.test.ts')

console.log('\n' + '='.repeat(70))
console.log('Ready to test! Start with step 2 (start dev server)')
console.log('='.repeat(70) + '\n')
