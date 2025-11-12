import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createSubscriptionSchema } from '@/lib/validations'
import {
  createStripeCustomer,
  createCheckoutSession,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from '@/lib/stripe'

/**
 * @openapi
 * /api/subscription:
 *   get:
 *     summary: Get user's subscription status
 *     description: Returns the current user's subscription details and usage
 *     tags:
 *       - Subscription
 *     responses:
 *       200:
 *         description: Subscription information retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Get current month usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const sessionsThisMonth = await prisma.room.count({
      where: {
        OR: [{ inviterId: userId }, { inviteeId: userId }],
        createdAt: { gte: startOfMonth },
        status: { in: ['ACTIVE', 'ENDED'] },
      },
    })

    const planId = (subscription?.plan as SubscriptionPlanId) || 'FREE'
    const plan = SUBSCRIPTION_PLANS[planId]

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
          }
        : null,
      plan: {
        id: planId,
        name: plan.name,
        price: plan.price,
        features: plan.features,
      },
      usage: {
        sessionsThisMonth,
        limit: plan.features.maxSessionsPerMonth,
        unlimited: plan.features.maxSessionsPerMonth === -1,
      },
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/subscription:
 *   post:
 *     summary: Create a checkout session for subscription
 *     description: Creates a Stripe checkout session to subscribe to a plan
 *     tags:
 *       - Subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [pro, family, enterprise]
 *     responses:
 *       200:
 *         description: Checkout session created
 *       400:
 *         description: Invalid plan
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createSubscriptionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { planId } = validation.data
    const plan = SUBSCRIPTION_PLANS[planId as SubscriptionPlanId]

    if (!plan.priceId) {
      return NextResponse.json({ error: 'Plan not available for checkout' }, { status: 400 })
    }

    // Get or create user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: { in: ['active', 'trialing'] } },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has an active subscription
    if (user.subscriptions.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Use billing portal to change plans.' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    let customerId = subscription?.stripeCustomerId

    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.email,
        name: user.name || undefined,
        userId: user.id,
      })
      customerId = customer.id
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await createCheckoutSession({
      customerId,
      priceId: plan.priceId,
      successUrl: `${baseUrl}/dashboard?subscription=success`,
      cancelUrl: `${baseUrl}/pricing?subscription=canceled`,
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'checkout_session_created',
        resource: 'subscription',
        metadata: {
          planId,
          sessionId: session.id,
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
