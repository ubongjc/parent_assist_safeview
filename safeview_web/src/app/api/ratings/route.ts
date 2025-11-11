import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createRatingSchema = z.object({
  roomId: z.string(),
  rating: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  helpful: z.boolean().default(true),
  wouldRecommend: z.boolean().default(true),
})

/**
 * @openapi
 * /api/ratings:
 *   post:
 *     summary: Rate a completed session
 *     description: Submit a rating and feedback for a help session
 *     tags:
 *       - Ratings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - rating
 *             properties:
 *               roomId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *                 maxLength: 1000
 *               helpful:
 *                 type: boolean
 *               wouldRecommend:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Rating submitted
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createRatingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { roomId, rating, feedback, helpful, wouldRecommend } = validation.data

    // Verify room exists and is ended
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
        invitee: { select: { id: true, name: true, email: true } },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // User must be part of the room
    if (room.inviterId !== userId && room.inviteeId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Room must be ended
    if (room.status !== 'ENDED' && room.status !== 'EXPIRED') {
      return NextResponse.json(
        { error: 'Can only rate completed sessions' },
        { status: 400 }
      )
    }

    // Check if already rated
    const existingRating = await prisma.sessionRating.findUnique({
      where: { roomId },
    })

    if (existingRating) {
      return NextResponse.json(
        { error: 'Session already rated' },
        { status: 400 }
      )
    }

    // Create rating
    const sessionRating = await prisma.sessionRating.create({
      data: {
        roomId,
        raterId: userId,
        rating,
        feedback,
        helpful,
        wouldRecommend,
      },
    })

    // Notify the other party
    const otherUserId = room.inviterId === userId ? room.inviteeId : room.inviterId
    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'SYSTEM_ALERT',
        title: 'Session Rated',
        message: `Your help session was rated ${rating} stars${feedback ? ': ' + feedback.substring(0, 50) : ''}`,
        data: {
          roomId,
          ratingId: sessionRating.id,
          rating,
        },
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'session_rated',
        resource: 'room',
        resourceId: roomId,
        metadata: {
          rating,
          helpful,
          wouldRecommend,
        },
      },
    })

    return NextResponse.json(
      {
        rating: sessionRating,
        message: 'Thank you for your feedback!',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/ratings:
 *   get:
 *     summary: Get helper ratings
 *     description: Get average rating and all ratings for a helper
 *     tags:
 *       - Ratings
 *     parameters:
 *       - in: query
 *         name: helperId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings data
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const helperId = searchParams.get('helperId') || userId

    // Get all rooms where user was the helper
    const rooms = await prisma.room.findMany({
      where: { inviterId: helperId, status: { in: ['ENDED', 'EXPIRED'] } },
      select: { id: true },
    })

    const roomIds = rooms.map((r) => r.id)

    // Get all ratings for these rooms
    const ratings = await prisma.sessionRating.findMany({
      where: { roomId: { in: roomIds } },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate average
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0

    const helpfulCount = ratings.filter((r) => r.helpful).length
    const wouldRecommendCount = ratings.filter((r) => r.wouldRecommend).length

    return NextResponse.json({
      average: Math.round(avgRating * 10) / 10,
      total: ratings.length,
      helpfulPercentage:
        ratings.length > 0 ? Math.round((helpfulCount / ratings.length) * 100) : 0,
      wouldRecommendPercentage:
        ratings.length > 0 ? Math.round((wouldRecommendCount / ratings.length) * 100) : 0,
      ratings: ratings.slice(0, 10), // Return latest 10
      distribution: {
        5: ratings.filter((r) => r.rating === 5).length,
        4: ratings.filter((r) => r.rating === 4).length,
        3: ratings.filter((r) => r.rating === 3).length,
        2: ratings.filter((r) => r.rating === 2).length,
        1: ratings.filter((r) => r.rating === 1).length,
      },
    })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
