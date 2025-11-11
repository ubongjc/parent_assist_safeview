import { z } from 'zod'

// Room creation validation
export const createRoomSchema = z.object({
  inviteeId: z.string().min(1, 'Invitee ID is required'),
  durationMinutes: z.number().min(5).max(120).default(60),
  message: z.string().optional(),
})

export const joinRoomSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  consentGranted: z.boolean(),
})

export const endRoomSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  reason: z.string().optional(),
})

export const createRedactionRuleSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  description: z.string().optional(),
})

// Type exports
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type EndRoomInput = z.infer<typeof endRoomSchema>
export type CreateRedactionRuleInput = z.infer<typeof createRedactionRuleSchema>
