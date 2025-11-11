import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { joinRoomSchema } from '@/lib/validations'
import { RoomStatus, ConsentStatus } from '@prisma/client'

/**
 * @openapi
 * /api/room/join:
 *   post:
 *     summary: Join a room (grant or deny consent)
 *     description: Allows invitee to grant or deny consent to join the assistance session
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
 *               - consentGranted
 *             properties:
 *               roomId:
 *                 type: string
 *               consentGranted:
 *                 type: boolean
 *                 description: Whether the invitee grants consent
 *     responses:
 *       200:
 *         description: Consent processed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 *       403:
 *         description: Not authorized to join this room
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
    const validation = joinRoomSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { roomId, consentGranted } = validation.data

    // Find the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        consents: {
          where: { giverId: userId },
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

    // Check if user is the invitee
    if (room.inviteeId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to join this room' },
        { status: 403 }
      )
    }

    // Check if room is expired
    if (new Date() > room.expiresAt) {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.EXPIRED }
      })

      return NextResponse.json(
        { error: 'Room has expired' },
        { status: 410 }
      )
    }

    const consent = room.consents[0]

    if (!consent) {
      return NextResponse.json(
        { error: 'No consent request found' },
        { status: 404 }
      )
    }

    if (consentGranted) {
      // Grant consent and activate room
      const [updatedConsent, updatedRoom] = await prisma.$transaction([
        prisma.consent.update({
          where: { id: consent.id },
          data: {
            status: ConsentStatus.GRANTED,
            grantedAt: new Date(),
          }
        }),
        prisma.room.update({
          where: { id: roomId },
          data: {
            status: RoomStatus.ACTIVE,
            startedAt: new Date(),
          }
        }),
        prisma.auditLog.create({
          data: {
            userId,
            action: 'consent_granted',
            resource: 'room',
            resourceId: roomId,
          }
        })
      ])

      // Log helper action
      await prisma.helpLog.create({
        data: {
          roomId,
          helperId: room.inviterId,
          action: 'session_started',
          metadata: {
            consentGrantedAt: updatedConsent.grantedAt,
          }
        }
      })

      return NextResponse.json({
        room: updatedRoom,
        consent: updatedConsent,
        message: 'Consent granted. Session is now active.',
      })
    } else {
      // Deny consent
      const [updatedConsent, updatedRoom] = await prisma.$transaction([
        prisma.consent.update({
          where: { id: consent.id },
          data: {
            status: ConsentStatus.DENIED,
          }
        }),
        prisma.room.update({
          where: { id: roomId },
          data: {
            status: RoomStatus.ENDED,
            endedAt: new Date(),
          }
        }),
        prisma.auditLog.create({
          data: {
            userId,
            action: 'consent_denied',
            resource: 'room',
            resourceId: roomId,
          }
        })
      ])

      return NextResponse.json({
        room: updatedRoom,
        consent: updatedConsent,
        message: 'Consent denied. Session ended.',
      })
    }

  } catch (error) {
    console.error('Error joining room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
