/**
 * Security utilities for SafeView
 * Implements OWASP Top 10 protections and industry best practices
 */

import { NextRequest } from 'next/server'
import { ratelimit } from './rate-limit'

// Input sanitization to prevent XSS
export function sanitizeInput(input: string): string {
  if (!input) return ''

  // Remove any HTML tags
  const withoutHtml = input.replace(/<[^>]*>/g, '')

  // Escape special characters
  const escaped = withoutHtml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  return escaped.trim()
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number (international format)
export function isValidPhone(phone: string): boolean {
  // Allow +, digits, spaces, hyphens, parentheses
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

// Detect SQL injection attempts
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

// Detect XSS attempts
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ]

  return xssPatterns.some((pattern) => pattern.test(input))
}

// Validate input for malicious content
export function validateInput(input: string, maxLength: number = 1000): {
  valid: boolean
  error?: string
} {
  if (!input) {
    return { valid: true }
  }

  if (input.length > maxLength) {
    return { valid: false, error: `Input exceeds maximum length of ${maxLength}` }
  }

  if (containsSQLInjection(input)) {
    return { valid: false, error: 'Potential SQL injection detected' }
  }

  if (containsXSS(input)) {
    return { valid: false, error: 'Potential XSS detected' }
  }

  return { valid: true }
}

// Rate limiting check
export async function checkRateLimit(
  request: NextRequest,
  identifier: string,
  limits: { requests: number; window: string } = { requests: 60, window: '1 m' }
): Promise<{ success: boolean; remaining?: number }> {
  try {
    const { success, remaining } = await ratelimit(identifier, limits)

    if (!success) {
      return { success: false }
    }

    return { success: true, remaining }
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error('Rate limiting error:', error)
    return { success: true }
  }
}

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

// Validate UUID/CUID format
export function isValidId(id: string): boolean {
  // CUID format: c[a-z0-9]{24}
  const cuidRegex = /^c[a-z0-9]{24}$/
  // UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  return cuidRegex.test(id) || uuidRegex.test(id)
}

// Secure session token generation (for custom sessions, not Clerk)
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint8Array(length)
    crypto.getRandomValues(randomValues)

    for (let i = 0; i < length; i++) {
      token += chars[randomValues[i] % chars.length]
    }
  } else {
    // Fallback for Node.js
    const crypto = require('crypto')
    const randomBytes = crypto.randomBytes(length)

    for (let i = 0; i < length; i++) {
      token += chars[randomBytes[i] % chars.length]
    }
  }

  return token
}

// Hash sensitive data (for logging/audit without exposing actual values)
export async function hashSensitiveData(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Fallback for Node.js
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}

// Validate password strength
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Sanitize file name for uploads
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  const withoutPath = fileName.replace(/\.\./g, '').replace(/\//g, '')

  // Allow only alphanumeric, dash, underscore, and dot
  const sanitized = withoutPath.replace(/[^a-zA-Z0-9._-]/g, '_')

  return sanitized
}

// Content Security Policy
export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.clerk.com https://api.stripe.com wss:",
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

// Security headers
export const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP_HEADER,
}

// Sensitive data patterns to redact from logs
export const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, // Phone
  /password/gi,
  /token/gi,
  /secret/gi,
  /api[_-]?key/gi,
]

// Redact sensitive information from logs
export function redactSensitiveInfo(text: string): string {
  let redacted = text

  SENSITIVE_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, '[REDACTED]')
  })

  return redacted
}

// Audit log helper with automatic redaction
export async function createSecureAuditLog(data: {
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
}) {
  const { prisma } = await import('./prisma')

  // Redact sensitive info from metadata
  const safeMetadata = data.metadata
    ? JSON.parse(redactSensitiveInfo(JSON.stringify(data.metadata)))
    : undefined

  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      metadata: safeMetadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}
