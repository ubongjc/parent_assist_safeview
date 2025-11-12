import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

/**
 * Stripe webhook handler
 * Processes subscription events from Stripe
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const customer = await stripe.customers.retrieve(customerId)

  if (customer.deleted) {
    console.error('Customer was deleted')
    return
  }

  const userId = customer.metadata.userId

  if (!userId) {
    console.error('No userId found in customer metadata')
    return
  }

  // Get plan name from price
  const planId = getPlanIdFromPrice(subscription.items.data[0].price.id)

  await prisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: planId,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  // Log the event
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'subscription_created',
      resource: 'subscription',
      resourceId: subscription.id,
      metadata: {
        plan: planId,
        status: subscription.status,
      },
    },
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const planId = getPlanIdFromPrice(subscription.items.data[0].price.id)

  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      plan: planId,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  // Get userId for logging
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  })

  if (sub) {
    await prisma.auditLog.create({
      data: {
        userId: sub.userId,
        action: 'subscription_updated',
        resource: 'subscription',
        resourceId: subscription.id,
        metadata: {
          plan: planId,
          status: subscription.status,
        },
      },
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: subscription.id,
    },
    data: {
      status: 'canceled',
    },
  })

  // Get userId for logging
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  })

  if (sub) {
    await prisma.auditLog.create({
      data: {
        userId: sub.userId,
        action: 'subscription_canceled',
        resource: 'subscription',
        resourceId: subscription.id,
        metadata: {
          canceledAt: new Date().toISOString(),
        },
      },
    })
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (subscription) {
    await prisma.auditLog.create({
      data: {
        userId: subscription.userId,
        action: 'invoice_paid',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
        },
      },
    })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (subscription) {
    // Update subscription status to past_due
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' },
    })

    await prisma.auditLog.create({
      data: {
        userId: subscription.userId,
        action: 'invoice_payment_failed',
        resource: 'subscription',
        resourceId: subscriptionId,
        metadata: {
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
        },
      },
    })

    // TODO: Send notification to user about failed payment
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!subscriptionId) {
    return
  }

  // The subscription.created event will handle the database update
  console.log(`Checkout completed for subscription: ${subscriptionId}`)
}

/**
 * Map Stripe price ID to internal plan ID
 */
function getPlanIdFromPrice(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_FAMILY) return 'family'
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise'
  return 'free'
}
