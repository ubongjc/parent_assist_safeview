import { z } from 'zod'

// ID validation (CUID or UUID format)
const idSchema = z.string().regex(/^(c[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i, 'Invalid ID format')

// Helper function to safely parse integers from query parameters
export function safeParseInt(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return defaultValue
  return Math.max(min, Math.min(max, parsed))
}

// Helper function to validate date strings
export function isValidDateString(value: string): boolean {
  const date = new Date(value)
  return date instanceof Date && !isNaN(date.getTime())
}

// Room creation validation
export const createRoomSchema = z.object({
  inviteeId: idSchema,
  durationMinutes: z.number().int().min(5).max(240).default(60),
  message: z.string().max(500).optional(),
})

export const joinRoomSchema = z.object({
  roomId: idSchema,
  consentGranted: z.boolean(),
})

export const endRoomSchema = z.object({
  roomId: idSchema,
  reason: z.string().max(500).optional(),
})

export const createRedactionRuleSchema = z.object({
  pattern: z.string().min(1).max(500, 'Pattern is too long'),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional().default(true),
})

// Notification validation
export const updateNotificationsSchema = z.object({
  notificationIds: z.array(idSchema).max(100).optional(),
  markAllRead: z.boolean().optional(),
}).refine(data => data.notificationIds || data.markAllRead, {
  message: 'Either notificationIds or markAllRead must be provided',
})

// Subscription validation
export const createSubscriptionSchema = z.object({
  planId: z.enum(['PRO', 'FAMILY', 'ENTERPRISE']),
})

// Contact validation
export const updateContactSchema = z.object({
  status: z.enum(['ACCEPTED', 'BLOCKED']).optional(),
  nickname: z.string().max(100).optional(),
  group: z.string().max(50).optional(),
  isEmergency: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

// Type exports
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type EndRoomInput = z.infer<typeof endRoomSchema>
export type CreateRedactionRuleInput = z.infer<typeof createRedactionRuleSchema>
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
