import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { endRoomSchema } from '@/lib/validations'
import { RoomStatus, ConsentStatus } from '@prisma/client'

/**
 * @openapi
 * /api/room/end:
 *   post:
 *     summary: End an active assistance session
 *     description: Allows either party to immediately end the remote assistance session
 *     tags:
 *       - Rooms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 description: Optional reason for ending the session
 *     responses:
 *       200:
 *         description: Session ended successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 *       403:
 *         description: Not authorized to end this room
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
    const validation = endRoomSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { roomId, reason } = validation.data

    // Find the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        consents: {
          where: {
            OR: [
              { giverId: userId },
              { requesterId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if user is either inviter or invitee (both can end the session)
    if (room.inviterId !== userId && room.inviteeId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to end this room' },
        { status: 403 }
      )
    }

    // Check if room is already ended
    if (room.status === RoomStatus.ENDED || room.status === RoomStatus.EXPIRED) {
      return NextResponse.json(
        { error: 'Room is already ended' },
        { status: 400 }
      )
    }

    const now = new Date()
    const endedByInvitee = room.inviteeId === userId

    // End the room and revoke consent
    const [updatedRoom, revokedConsent] = await prisma.$transaction([
      prisma.room.update({
        where: { id: roomId },
        data: {
          status: RoomStatus.ENDED,
          endedAt: now,
          metadata: {
            ...((room.metadata as any) || {}),
            endReason: reason,
            endedBy: userId,
            endedByRole: endedByInvitee ? 'invitee' : 'inviter',
          }
        }
      }),
      // Revoke active consent
      room.consents.length > 0 && room.consents[0].status === ConsentStatus.GRANTED
        ? prisma.consent.update({
            where: { id: room.consents[0].id },
            data: {
              status: ConsentStatus.REVOKED,
              revokedAt: now,
            }
          })
        : Promise.resolve(null),
      // Log the action
      prisma.auditLog.create({
        data: {
          userId,
          action: endedByInvitee ? 'session_ended_by_invitee' : 'session_ended_by_inviter',
          resource: 'room',
          resourceId: roomId,
          metadata: {
            reason,
            duration: room.startedAt
              ? Math.floor((now.getTime() - room.startedAt.getTime()) / 1000)
              : 0,
          }
        }
      }),
      // Log helper action
      prisma.helpLog.create({
        data: {
          roomId,
          helperId: room.inviterId,
          action: 'session_ended',
          metadata: {
            endedBy: userId,
            endedByRole: endedByInvitee ? 'invitee' : 'inviter',
            reason,
            duration: room.startedAt
              ? Math.floor((now.getTime() - room.startedAt.getTime()) / 1000)
              : 0,
          }
        }
      })
    ])

    return NextResponse.json({
      room: updatedRoom,
      consent: revokedConsent,
      message: 'Session ended successfully.',
      endedBy: endedByInvitee ? 'invitee' : 'inviter',
    })

  } catch (error) {
    console.error('Error ending room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
