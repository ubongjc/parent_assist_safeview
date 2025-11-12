import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SECURITY_HEADERS, getClientIP } from './lib/security'
import { isIPBlocked, RATE_LIMITS, ratelimit } from './lib/rate-limit'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/api/health',
  '/api/webhooks/(.*)',
])

// Define API routes that need stricter rate limiting
const isAPIRoute = createRouteMatcher(['/api/(.*)'])
const isAuthRoute = createRouteMatcher(['/api/auth(.*)'])
const isPaymentRoute = createRouteMatcher(['/api/subscription(.*)'])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth()
  const clientIP = getClientIP(req)
  const pathname = req.nextUrl.pathname

  // 1. Check if IP is blocked
  if (isIPBlocked(clientIP)) {
    return new NextResponse('Access Denied', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        ...SECURITY_HEADERS,
      },
    })
  }

  // 2. Apply rate limiting based on route
  if (isAPIRoute(req)) {
    const identifier = userId || clientIP
    let rateLimitConfig = RATE_LIMITS.api

    // Use stricter limits for sensitive endpoints
    if (isAuthRoute(req)) {
      rateLimitConfig = RATE_LIMITS.auth
    } else if (isPaymentRoute(req)) {
      rateLimitConfig = RATE_LIMITS.payment
    } else if (pathname === '/api/health') {
      rateLimitConfig = RATE_LIMITS.health
    } else if (pathname.startsWith('/api/chat/')) {
      rateLimitConfig = RATE_LIMITS.chat
    } else if (pathname === '/api/room' && req.method === 'POST') {
      rateLimitConfig = RATE_LIMITS.createRoom
    } else if (pathname === '/api/contacts' && req.method === 'POST') {
      rateLimitConfig = RATE_LIMITS.contactRequest
    }

    const { success, remaining, reset } = await ratelimit(identifier, rateLimitConfig)

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset?.toString() || '',
            'Retry-After': reset ? Math.ceil((reset - Date.now()) / 1000).toString() : '60',
            ...SECURITY_HEADERS,
          },
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.requests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    if (reset) {
      response.headers.set('X-RateLimit-Reset', reset.toString())
    }

    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }

  // 3. Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  // 4. Add security headers to all responses
  const response = NextResponse.next()
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
