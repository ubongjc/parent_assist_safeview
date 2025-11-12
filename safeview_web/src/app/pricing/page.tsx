'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for occasional family help',
    color: 'from-gray-500 to-gray-600',
    features: [
      '3 sessions per month',
      '30-minute session limit',
      'Basic support',
      'All safety features',
      'Auto-redaction',
      'Session audit logs',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'For regular helpers and tech support',
    color: 'from-blue-500 to-indigo-600',
    features: [
      'Unlimited sessions',
      '120-minute session limit',
      'Session recordings',
      'Advanced analytics',
      'Priority support',
      'Custom redaction rules',
      'Session scheduling',
      'Contact management',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    price: 19.99,
    period: 'month',
    description: 'Best for families with elderly relatives',
    color: 'from-purple-500 to-pink-600',
    features: [
      'Everything in Pro',
      'Up to 5 family members',
      'Shared session history',
      'Family dashboard',
      'Group management',
      'Emergency contacts',
      'Email & SMS notifications',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: 'custom',
    description: 'For organizations and care facilities',
    color: 'from-green-500 to-emerald-600',
    features: [
      'Everything in Family',
      'Unlimited team members',
      'SSO integration',
      'Advanced admin controls',
      'Custom branding',
      'SLA guarantees',
      'Dedicated support',
      'API access',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      window.location.href = '/sign-up'
      return
    }

    if (planId === 'enterprise') {
      window.location.href = '/contact-sales'
      return
    }

    setLoading(planId)

    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error creating checkout session')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Safe, consent-based remote assistance for helping loved ones with their devices.
            Start with a 14-day free trial on any paid plan.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                plan.popular
                  ? 'border-4 border-blue-500 dark:border-blue-400 shadow-xl'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </div>
              )}

              <CardHeader>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} mb-4 flex items-center justify-center`}>
                  <span className="text-3xl text-white font-bold">
                    {plan.name.charAt(0)}
                  </span>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  {plan.price === null ? (
                    <div className="text-4xl font-bold">Custom</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold">${plan.price}</span>
                        <span className="text-gray-500 dark:text-gray-400">/{plan.period}</span>
                      </div>
                      {plan.price > 0 && (
                        <div className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2">
                          14-day free trial
                        </div>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg
                        className={`w-5 h-5 text-green-500 flex-shrink-0 mt-0.5`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-6 text-lg transition-all duration-300`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? 'Loading...' : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Yes! You can cancel your subscription at any time from your billing portal. No questions asked.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What happens after the free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Your card will be charged automatically after 14 days. You'll receive a reminder email 3 days before.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Absolutely. We use bank-level encryption, all sessions are logged for security, and sensitive information
                  is automatically redacted. Your privacy and security are our top priority.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
