/**
 * Rate limiting implementation
 * Protects against brute force attacks and API abuse
 *
 * In production, use Redis or Upstash for distributed rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Parse time window string to milliseconds
 * Examples: "1 m" = 60000, "1 h" = 3600000, "1 d" = 86400000
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*([smhd])$/)
  if (!match) throw new Error('Invalid window format. Use: "10 s", "1 m", "1 h", "1 d"')

  const [, amount, unit] = match
  const value = parseInt(amount)

  const units: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  }

  return value * units[unit]
}

/**
 * Rate limit check
 *
 * @param identifier - Unique identifier (userId, IP address, etc.)
 * @param limits - Rate limit configuration
 * @returns success: whether request is allowed, remaining: requests remaining
 */
export async function ratelimit(
  identifier: string,
  limits: { requests: number; window: string } = { requests: 60, window: '1 m' }
): Promise<{ success: boolean; remaining: number; reset?: number }> {
  const windowMs = parseWindow(limits.window)
  const now = Date.now()
  const resetAt = now + windowMs

  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    })

    return {
      success: true,
      remaining: limits.requests - 1,
      reset: resetAt,
    }
  }

  if (entry.count >= limits.requests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)

  return {
    success: true,
    remaining: limits.requests - entry.count,
    reset: entry.resetAt,
  }
}

/**
 * Sliding window rate limiter (more accurate)
 */
export async function slidingWindowRateLimit(
  identifier: string,
  limits: { requests: number; window: string }
): Promise<{ success: boolean; remaining: number }> {
  // For now, use simple fixed window
  // In production with Redis, implement true sliding window
  return ratelimit(identifier, limits)
}

/**
 * Pre-configured rate limits for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  auth: { requests: 5, window: '15 m' }, // 5 attempts per 15 minutes
  passwordReset: { requests: 3, window: '1 h' }, // 3 attempts per hour

  // API endpoints - moderate limits
  api: { requests: 100, window: '1 m' }, // 100 requests per minute
  apiStrict: { requests: 30, window: '1 m' }, // 30 requests per minute

  // Sensitive operations - very strict
  createRoom: { requests: 10, window: '1 h' }, // 10 rooms per hour
  payment: { requests: 5, window: '1 h' }, // 5 payment attempts per hour

  // Public endpoints - lenient
  health: { requests: 1000, window: '1 m' }, // 1000 requests per minute

  // Contact operations
  contactRequest: { requests: 20, window: '1 h' }, // 20 contact requests per hour

  // Messaging
  chat: { requests: 60, window: '1 m' }, // 60 messages per minute

  // Notifications
  notifications: { requests: 120, window: '1 m' }, // 120 checks per minute
}

/**
 * Block an IP address temporarily
 */
const blockedIPs = new Map<string, number>()

export function blockIP(ip: string, durationMs: number = 24 * 60 * 60 * 1000) {
  blockedIPs.set(ip, Date.now() + durationMs)
}

export function isIPBlocked(ip: string): boolean {
  const blockedUntil = blockedIPs.get(ip)
  if (!blockedUntil) return false

  if (Date.now() > blockedUntil) {
    blockedIPs.delete(ip)
    return false
  }

  return true
}

/**
 * Suspicious activity detection
 */
const suspiciousActivity = new Map<string, number>()

export function trackSuspiciousActivity(identifier: string) {
  const current = suspiciousActivity.get(identifier) || 0
  suspiciousActivity.set(identifier, current + 1)

  // Auto-block after 10 suspicious activities
  if (current + 1 >= 10) {
    blockIP(identifier, 24 * 60 * 60 * 1000) // Block for 24 hours
    console.warn(`[SECURITY] IP ${identifier} blocked due to suspicious activity`)
  }
}

/**
 * Reset rate limit for identifier (admin use)
 */
export function resetRateLimit(identifier: string) {
  rateLimitStore.delete(identifier)
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(identifier: string): {
  count: number
  remaining: number
  resetAt: number | null
} | null {
  const entry = rateLimitStore.get(identifier)
  if (!entry) return null

  return {
    count: entry.count,
    remaining: Math.max(0, 100 - entry.count), // Assuming default limit of 100
    resetAt: entry.resetAt,
  }
}
