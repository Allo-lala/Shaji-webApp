#!/usr/bin/env node
/**
 * PayPal Sandbox Integration Test Script
 * 
 * This script validates the PayPal integration in sandbox mode.
 * Run with: node scripts/test-paypal-sandbox.mjs
 * 
 * **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 20.1, 20.2, 20.3**
 * 
 * Task 16 Subtasks:
 * - 16.1 Configure application to use PayPal sandbox credentials
 * - 16.2 Test subscription creation flow for Starters Pack plan
 * - 16.3 Test subscription creation flow for Professional plan
 * - 16.4 Test subscription creation flow for Enterprise plan
 * - 16.5 Test subscription status retrieval
 * - 16.6 Test subscription cancellation
 * - 16.8 Test error handling for invalid payment methods
 * - 16.10 Verify performance meets requirements
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

// Import PayPal functions (we'll need to use dynamic import)
const { createSubscription, cancelSubscription, getSubscriptionDetails } = await import('../lib/paypal.ts')

// Test configuration
const TEST_PLAN_IDS = {
  starters: process.env.NEXT_PUBLIC_PAYPAL_PLAN_STARTERS || "",
  professional: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL || "",
  enterprise: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE || "",
}

// Track created subscriptions for cleanup
const createdSubscriptions = []
const testResults = []

// Test utilities
function logSection(title) {
  console.log('\n' + '='.repeat(60))
  console.log(title)
  console.log('='.repeat(60))
}

function logSuccess(message) {
  console.log(`✓ ${message}`)
}

function logError(message) {
  console.log(`✗ ${message}`)
}

function logInfo(message) {
  console.log(`  ${message}`)
}

function recordTest(name, passed, duration, details = null) {
  testResults.push({ name, passed, duration, details })
  if (passed) {
    logSuccess(`${name} (${duration}ms)`)
  } else {
    logError(`${name} (${duration}ms)`)
  }
  if (details) {
    logInfo(details)
  }
}

// Test 16.1: Verify sandbox credentials configured
async function testCredentialsConfigured() {
  logSection('16.1: Verify PayPal Sandbox Credentials')
  
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    logError('PayPal credentials not configured')
    logInfo('Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local')
    process.exit(1)
  }
  
  logSuccess('PayPal sandbox credentials configured')
  logInfo(`Client ID: ${clientId.substring(0, 20)}...`)
  
  if (!TEST_PLAN_IDS.starters || !TEST_PLAN_IDS.professional || !TEST_PLAN_IDS.enterprise) {
    logError('PayPal plan IDs not configured')
    logInfo('Please set NEXT_PUBLIC_PAYPAL_PLAN_STARTERS, NEXT_PUBLIC_PAYPAL_PLAN_PROFESSIONAL, and NEXT_PUBLIC_PAYPAL_PLAN_ENTERPRISE')
    process.exit(1)
  }
  
  logSuccess('PayPal plan IDs configured')
  logInfo(`Starters: ${TEST_PLAN_IDS.starters}`)
  logInfo(`Professional: ${TEST_PLAN_IDS.professional}`)
  logInfo(`Enterprise: ${TEST_PLAN_IDS.enterprise}`)
}

// Test 16.2: Create subscription for Starters Pack
async function testCreateStartersPack() {
  logSection('16.2: Test Subscription Creation - Starters Pack')
  
  try {
    const startTime = Date.now()
    
    const subscription = await createSubscription(
      TEST_PLAN_IDS.starters,
      "http://localhost:3000/dashboard/pricing?success=true",
      "http://localhost:3000/dashboard/pricing?canceled=true"
    )
    
    const duration = Date.now() - startTime
    
    if (subscription && subscription.id && subscription.plan_id === TEST_PLAN_IDS.starters) {
      const approvalLink = subscription.links.find(link => link.rel === "approve")
      createdSubscriptions.push(subscription.id)
      
      recordTest(
        'Create Starters Pack subscription',
        true,
        duration,
        `ID: ${subscription.id}, Status: ${subscription.status}`
      )
      
      if (approvalLink) {
        logInfo(`Approval URL: ${approvalLink.href.substring(0, 60)}...`)
      }
      
      // 20.1: Verify performance (<5s)
      if (duration < 5000) {
        recordTest('Performance: Subscription creation <5s', true, duration)
      } else {
        recordTest('Performance: Subscription creation <5s', false, duration, 'Exceeded 5000ms threshold')
      }
      
      return subscription.id
    } else {
      recordTest('Create Starters Pack subscription', false, duration, 'Invalid response')
      return null
    }
  } catch (error) {
    recordTest('Create Starters Pack subscription', false, 0, error.message)
    return null
  }
}

// Test 16.3: Create subscription for Professional
async function testCreateProfessional() {
  logSection('16.3: Test Subscription Creation - Professional')
  
  try {
    const startTime = Date.now()
    
    const subscription = await createSubscription(
      TEST_PLAN_IDS.professional,
      "http://localhost:3000/dashboard/pricing?success=true",
      "http://localhost:3000/dashboard/pricing?canceled=true"
    )
    
    const duration = Date.now() - startTime
    
    if (subscription && subscription.id && subscription.plan_id === TEST_PLAN_IDS.professional) {
      createdSubscriptions.push(subscription.id)
      
      recordTest(
        'Create Professional subscription',
        true,
        duration,
        `ID: ${subscription.id}, Status: ${subscription.status}`
      )
      
      if (duration < 5000) {
        recordTest('Performance: Professional creation <5s', true, duration)
      } else {
        recordTest('Performance: Professional creation <5s', false, duration)
      }
      
      return subscription.id
    } else {
      recordTest('Create Professional subscription', false, duration, 'Invalid response')
      return null
    }
  } catch (error) {
    recordTest('Create Professional subscription', false, 0, error.message)
    return null
  }
}

// Test 16.4: Create subscription for Enterprise
async function testCreateEnterprise() {
  logSection('16.4: Test Subscription Creation - Enterprise')
  
  try {
    const startTime = Date.now()
    
    const subscription = await createSubscription(
      TEST_PLAN_IDS.enterprise,
      "http://localhost:3000/dashboard/pricing?success=true",
      "http://localhost:3000/dashboard/pricing?canceled=true"
    )
    
    const duration = Date.now() - startTime
    
    if (subscription && subscription.id && subscription.plan_id === TEST_PLAN_IDS.enterprise) {
      createdSubscriptions.push(subscription.id)
      
      recordTest(
        'Create Enterprise subscription',
        true,
        duration,
        `ID: ${subscription.id}, Status: ${subscription.status}`
      )
      
      if (duration < 5000) {
        recordTest('Performance: Enterprise creation <5s', true, duration)
      } else {
        recordTest('Performance: Enterprise creation <5s', false, duration)
      }
      
      return subscription.id
    } else {
      recordTest('Create Enterprise subscription', false, duration, 'Invalid response')
      return null
    }
  } catch (error) {
    recordTest('Create Enterprise subscription', false, 0, error.message)
    return null
  }
}

// Test 16.5: Test subscription status retrieval
async function testStatusRetrieval(subscriptionId) {
  logSection('16.5: Test Subscription Status Retrieval')
  
  if (!subscriptionId) {
    logError('No subscription ID available for testing')
    return
  }
  
  try {
    const startTime = Date.now()
    
    const details = await getSubscriptionDetails(subscriptionId)
    
    const duration = Date.now() - startTime
    
    if (details && details.id === subscriptionId) {
      recordTest(
        'Retrieve subscription details',
        true,
        duration,
        `Status: ${details.status}, Plan: ${details.plan_id}`
      )
      
      // 20.3: Verify performance (<500ms)
      if (duration < 500) {
        recordTest('Performance: Status retrieval <500ms', true, duration)
      } else {
        recordTest('Performance: Status retrieval <500ms', false, duration, 'Exceeded 500ms threshold')
      }
    } else {
      recordTest('Retrieve subscription details', false, duration, 'Invalid response')
    }
  } catch (error) {
    recordTest('Retrieve subscription details', false, 0, error.message)
  }
  
  // Test non-existent subscription
  try {
    await getSubscriptionDetails('I-FAKE1234567890')
    recordTest('Handle non-existent subscription', false, 0, 'Should have thrown error')
  } catch (error) {
    recordTest('Handle non-existent subscription', true, 0, 'Properly rejected')
  }
}

// Test 16.6: Test subscription cancellation
async function testCancellation() {
  logSection('16.6: Test Subscription Cancellation')
  
  // Create a new subscription specifically for cancellation test
  try {
    const subscription = await createSubscription(TEST_PLAN_IDS.starters)
    const subscriptionId = subscription.id
    
    logInfo(`Created test subscription: ${subscriptionId}`)
    
    const startTime = Date.now()
    
    const result = await cancelSubscription(subscriptionId, "Test cancellation")
    
    const duration = Date.now() - startTime
    
    if (result) {
      recordTest('Cancel subscription', true, duration)
      
      // 20.2: Verify performance (<3s)
      if (duration < 3000) {
        recordTest('Performance: Cancellation <3s', true, duration)
      } else {
        recordTest('Performance: Cancellation <3s', false, duration, 'Exceeded 3000ms threshold')
      }
      
      // Verify cancellation by checking status
      const details = await getSubscriptionDetails(subscriptionId)
      if (details.status === 'CANCELLED') {
        recordTest('Verify cancellation status', true, 0, `Status: ${details.status}`)
      } else {
        recordTest('Verify cancellation status', false, 0, `Unexpected status: ${details.status}`)
      }
      
      // Remove from cleanup list
      const index = createdSubscriptions.indexOf(subscriptionId)
      if (index > -1) {
        createdSubscriptions.splice(index, 1)
      }
    } else {
      recordTest('Cancel subscription', false, duration, 'Returned false')
    }
  } catch (error) {
    recordTest('Cancel subscription', false, 0, error.message)
  }
  
  // Test canceling non-existent subscription
  try {
    await cancelSubscription('I-FAKE1234567890')
    recordTest('Handle non-existent cancellation', false, 0, 'Should have thrown error')
  } catch (error) {
    recordTest('Handle non-existent cancellation', true, 0, 'Properly rejected')
  }
}

// Test 16.8: Test error handling for invalid payment methods
async function testErrorHandling() {
  logSection('16.8: Test Error Handling - Invalid Payment Methods')
  
  // Test invalid plan ID
  try {
    await createSubscription('P-INVALID123456789')
    recordTest('Reject invalid plan ID', false, 0, 'Should have thrown error')
  } catch (error) {
    recordTest('Reject invalid plan ID', true, 0, 'Properly rejected')
  }
  
  // Test empty plan ID
  try {
    await createSubscription('')
    recordTest('Reject empty plan ID', false, 0, 'Should have thrown error')
  } catch (error) {
    recordTest('Reject empty plan ID', true, 0, 'Properly rejected')
  }
}

// Cleanup function
async function cleanup() {
  logSection('Cleanup: Canceling Test Subscriptions')
  
  for (const subscriptionId of createdSubscriptions) {
    try {
      await cancelSubscription(subscriptionId, "Test cleanup")
      logSuccess(`Canceled subscription: ${subscriptionId}`)
    } catch (error) {
      logError(`Failed to cancel subscription ${subscriptionId}: ${error.message}`)
    }
  }
}

// Display test summary
function displaySummary() {
  logSection('Test Summary')
  
  const passed = testResults.filter(t => t.passed).length
  const failed = testResults.filter(t => !t.passed).length
  const total = testResults.length
  
  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log('')
  
  if (failed > 0) {
    console.log('Failed Tests:')
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`  ✗ ${t.name}`)
      if (t.details) {
        console.log(`    ${t.details}`)
      }
    })
  }
  
  console.log('='.repeat(60))
  
  logSection('Manual Testing Instructions')
  console.log('16.7: Test webhook event processing:')
  console.log('  1. Log into PayPal Developer Dashboard')
  console.log('     https://developer.paypal.com/dashboard')
  console.log('  2. Navigate to: Apps & Credentials > Sandbox > [Your App] > Webhooks')
  console.log('  3. Use Webhook Simulator to send test events')
  console.log('  4. Verify webhook handler at: app/api/paypal/webhook/route.ts')
  console.log('')
  console.log('16.9: Test duplicate subscription prevention:')
  console.log('  1. Start dev server: pnpm dev')
  console.log('  2. Test API endpoint with same wallet address twice')
  console.log('  3. Second request should return 409 Conflict')
  console.log('='.repeat(60))
}

// Main test execution
async function runTests() {
  console.log('\nPayPal Sandbox Integration Tests')
  console.log('Starting test suite...\n')
  
  try {
    // 16.1: Verify credentials
    await testCredentialsConfigured()
    
    // 16.2: Test Starters Pack creation
    const startersId = await testCreateStartersPack()
    
    // 16.3: Test Professional creation
    const professionalId = await testCreateProfessional()
    
    // 16.4: Test Enterprise creation
    const enterpriseId = await testCreateEnterprise()
    
    // 16.5: Test status retrieval (use first created subscription)
    await testStatusRetrieval(startersId || professionalId || enterpriseId)
    
    // 16.6: Test cancellation
    await testCancellation()
    
    // 16.8: Test error handling
    await testErrorHandling()
    
  } catch (error) {
    logError(`Test execution error: ${error.message}`)
    console.error(error)
  } finally {
    // Cleanup
    await cleanup()
    
    // Display summary
    displaySummary()
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
