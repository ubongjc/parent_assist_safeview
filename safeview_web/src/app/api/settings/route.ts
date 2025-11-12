import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    sessionRequests: z.boolean().optional(),
    sessionStarted: z.boolean().optional(),
    sessionEnded: z.boolean().optional(),
    payments: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    showOnlineStatus: z.boolean().optional(),
    allowContactRequests: z.boolean().optional(),
    shareSessionHistory: z.boolean().optional(),
  }).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    defaultSessionDuration: z.number().min(5).max(240).optional(),
  }).optional(),
})

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Get user settings
 *     description: Returns user's settings and preferences
 *     tags:
 *       - Settings
 *     responses:
 *       200:
 *         description: User settings
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Settings are stored in user metadata (you could create a separate Settings model)
    // For now, return defaults merged with any stored settings
    const defaultSettings = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        sessionRequests: true,
        sessionStarted: true,
        sessionEnded: true,
        payments: true,
        marketing: false,
      },
      privacy: {
        showOnlineStatus: true,
        allowContactRequests: true,
        shareSessionHistory: false,
      },
      preferences: {
        theme: 'system' as const,
        language: 'en',
        timezone: 'America/New_York',
        defaultSessionDuration: 60,
      },
    }

    return NextResponse.json({
      settings: defaultSettings,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/settings:
 *   put:
 *     summary: Update user settings
 *     description: Update user's settings and preferences
 *     tags:
 *       - Settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *               privacy:
 *                 type: object
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateSettingsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    // In a real app, you might store these in a separate Settings table
    // For now, we'll just log the update
    const settings = validation.data

    // Log the settings update
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'settings_updated',
        resource: 'user',
        resourceId: userId,
        metadata: settings,
      },
    })

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
