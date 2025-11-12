import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { updateNotificationsSchema, safeParseInt } from '@/lib/validations'

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     description: Returns all notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = safeParseInt(searchParams.get('limit'), 50, 1, 200)

    const where: any = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/notifications:
 *   put:
 *     summary: Mark notifications as read
 *     description: Mark all or specific notifications as read
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               markAllRead:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateNotificationsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { notificationIds, markAllRead } = validation.data

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })

      return NextResponse.json({
        message: 'All notifications marked as read',
      })
    }

    if (notificationIds) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId, // Security: only update user's own notifications
        },
        data: { isRead: true, readAt: new Date() },
      })

      return NextResponse.json({
        message: 'Notifications marked as read',
      })
    }

    // This should never be reached due to Zod validation, but keep for safety
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
