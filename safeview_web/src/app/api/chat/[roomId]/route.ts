import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  type: z.enum(['text', 'system', 'voice_transcript']).default('text'),
  metadata: z.record(z.any()).optional(),
})

/**
 * @openapi
 * /api/chat/{roomId}:
 *   get:
 *     summary: Get chat messages for a room
 *     description: Returns all chat messages for a session
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 100
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of messages
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a participant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth()
    const { roomId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is part of the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.inviterId !== userId && room.inviteeId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const before = searchParams.get('before')

    const where: any = { roomId }
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      messages: messages.reverse(), // Oldest first
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/chat/{roomId}:
 *   post:
 *     summary: Send a chat message
 *     description: Send a message in a session
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               type:
 *                 type: string
 *                 enum: [text, system, voice_transcript]
 *                 default: text
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth()
    const { roomId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is part of the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        inviter: {
          select: { id: true, name: true, email: true },
        },
        invitee: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.inviterId !== userId && room.inviteeId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Room must be active
    if (room.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Room is not active. Chat is only available during active sessions.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = sendMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { message, type, metadata } = validation.data

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        roomId,
        userId,
        message,
        type,
        metadata,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Notify the other party
    const otherUserId = room.inviterId === userId ? room.inviteeId : room.inviterId
    const otherUser = room.inviterId === userId ? room.invitee : room.inviter

    await prisma.notification.create({
      data: {
        userId: otherUserId,
        type: 'SESSION_STARTED', // Using existing enum, can add CHAT_MESSAGE later
        title: 'New message',
        message: `${chatMessage.user.name || chatMessage.user.email}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        data: {
          roomId,
          messageId: chatMessage.id,
        },
      },
    })

    // Log the action
    await prisma.helpLog.create({
      data: {
        roomId,
        helperId: room.inviterId,
        action: 'message_sent',
        metadata: {
          senderId: userId,
          messageLength: message.length,
          type,
        },
      },
    })

    return NextResponse.json(
      {
        message: chatMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
