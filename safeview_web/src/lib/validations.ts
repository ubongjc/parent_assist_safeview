import { z } from 'zod'

// ID validation (CUID or UUID format)
const idSchema = z.string().regex(/^(c[a-z0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i, 'Invalid ID format')

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

// Type exports
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type EndRoomInput = z.infer<typeof endRoomSchema>
export type CreateRedactionRuleInput = z.infer<typeof createRedactionRuleSchema>
