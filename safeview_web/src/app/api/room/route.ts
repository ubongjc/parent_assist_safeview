import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createRoomSchema } from '@/lib/validations'
import { RoomStatus, ConsentStatus } from '@prisma/client'

/**
 * @openapi
 * /api/room:
 *   post:
 *     summary: Create a new remote assistance room
 *     description: Creates a WebRTC room and sends a consent request to the invitee
 *     tags:
 *       - Rooms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteeId
 *             properties:
 *               inviteeId:
 *                 type: string
 *                 description: ID of the person being invited (elder)
 *               durationMinutes:
 *                 type: number
 *                 minimum: 5
 *                 maximum: 120
 *                 default: 60
 *               message:
 *                 type: string
 *                 description: Optional message to send with the request
 *     responses:
 *       201:
 *         description: Room created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid input
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createRoomSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { inviteeId, durationMinutes, message } = validation.data

    // Check if invitee exists
    const invitee = await prisma.user.findUnique({
      where: { id: inviteeId }
    })

    if (!invitee) {
      return NextResponse.json(
        { error: 'Invitee not found' },
        { status: 404 }
      )
    }

    // Create room with expiration
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000)

    const room = await prisma.room.create({
      data: {
        inviterId: userId,
        inviteeId,
        status: RoomStatus.PENDING,
        expiresAt,
        metadata: {
          durationMinutes,
          requestMessage: message,
        },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Create consent request
    const consent = await prisma.consent.create({
      data: {
        roomId: room.id,
        giverId: inviteeId,
        requesterId: userId,
        status: ConsentStatus.REQUESTED,
        message,
        expiresAt,
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'room_created',
        resource: 'room',
        resourceId: room.id,
        metadata: {
          inviteeId,
          durationMinutes,
        }
      }
    })

    return NextResponse.json({
      room,
      consent,
      message: 'Room created successfully. Waiting for consent from invitee.'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @openapi
 * /api/room:
 *   get:
 *     summary: List user's rooms
 *     description: Get all rooms where user is inviter or invitee
 *     tags:
 *       - Rooms
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, ENDED, EXPIRED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *     responses:
 *       200:
 *         description: List of rooms
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as RoomStatus | null
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      OR: [
        { inviterId: userId },
        { inviteeId: userId },
      ]
    }

    if (status) {
      where.status = status
    }

    const rooms = await prisma.room.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        consents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    })

    return NextResponse.json({ rooms })

  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
