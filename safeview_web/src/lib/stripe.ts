import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Subscription plan IDs (replace with your actual Stripe price IDs)
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      maxSessionsPerMonth: 3,
      maxSessionDuration: 30,
      screenRecording: false,
      analytics: false,
      prioritySupport: false,
      customRedaction: false,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 999, // $9.99 in cents
    priceId: process.env.STRIPE_PRICE_PRO,
    features: {
      maxSessionsPerMonth: -1, // unlimited
      maxSessionDuration: 120,
      screenRecording: true,
      analytics: true,
      prioritySupport: true,
      customRedaction: true,
    },
  },
  FAMILY: {
    id: 'family',
    name: 'Family',
    price: 1999, // $19.99 in cents
    priceId: process.env.STRIPE_PRICE_FAMILY,
    features: {
      maxSessionsPerMonth: -1, // unlimited
      maxSessionDuration: 120,
      screenRecording: true,
      analytics: true,
      prioritySupport: true,
      customRedaction: true,
      maxFamilyMembers: 5,
      sharedHistory: true,
      familyDashboard: true,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    priceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: {
      maxSessionsPerMonth: -1, // unlimited
      maxSessionDuration: -1, // unlimited
      screenRecording: true,
      analytics: true,
      prioritySupport: true,
      customRedaction: true,
      maxTeamMembers: -1, // unlimited
      ssoIntegration: true,
      customBranding: true,
      apiAccess: true,
      sla: true,
      dedicatedSupport: true,
    },
  },
} as const

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string
  name?: string
  userId: string
}) {
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      userId: params.userId,
    },
  })

  return customer
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
    },
  })

  return session
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  return subscription
}

/**
 * Update subscription
 */
export async function updateSubscription(params: {
  subscriptionId: string
  priceId: string
}) {
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)

  const updatedSubscription = await stripe.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: params.priceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })

  return updatedSubscription
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(
  planId: SubscriptionPlanId,
  feature: keyof typeof SUBSCRIPTION_PLANS.PRO.features
): boolean {
  const plan = SUBSCRIPTION_PLANS[planId]
  return !!(plan.features as any)[feature]
}

/**
 * Get usage limits for a plan
 */
export function getUsageLimits(planId: SubscriptionPlanId) {
  const plan = SUBSCRIPTION_PLANS[planId]
  return {
    maxSessionsPerMonth: plan.features.maxSessionsPerMonth,
    maxSessionDuration: plan.features.maxSessionDuration,
  }
}

/**
 * Check if usage is within limits
 */
export function isWithinUsageLimits(params: {
  planId: SubscriptionPlanId
  currentUsage: number
  requestedDuration: number
}): { allowed: boolean; reason?: string } {
  const limits = getUsageLimits(params.planId)

  // Check session count limit
  if (limits.maxSessionsPerMonth !== -1 && params.currentUsage >= limits.maxSessionsPerMonth) {
    return {
      allowed: false,
      reason: `Monthly session limit reached (${limits.maxSessionsPerMonth} sessions)`,
    }
  }

  // Check session duration limit
  if (limits.maxSessionDuration !== -1 && params.requestedDuration > limits.maxSessionDuration) {
    return {
      allowed: false,
      reason: `Session duration exceeds plan limit (${limits.maxSessionDuration} minutes max)`,
    }
  }

  return { allowed: true }
}
