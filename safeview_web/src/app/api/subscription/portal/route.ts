import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createBillingPortalSession } from '@/lib/stripe'

/**
 * @openapi
 * /api/subscription/portal:
 *   post:
 *     summary: Create Stripe billing portal session
 *     description: Creates a session for users to manage their subscription
 *     tags:
 *       - Subscription
 *     responses:
 *       200:
 *         description: Portal session created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No subscription found
 */
export async function POST(request: NextRequest) {
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

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Create billing portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/billing`,
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'billing_portal_accessed',
        resource: 'subscription',
        resourceId: subscription.id,
      },
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
