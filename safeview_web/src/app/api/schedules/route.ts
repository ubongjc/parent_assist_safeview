import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createScheduleSchema = z.object({
  elderId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledFor: z.string().datetime(),
  durationMinutes: z.number().min(5).max(240).default(60),
})

/**
 * @openapi
 * /api/schedules:
 *   get:
 *     summary: Get scheduled sessions
 *     description: Returns all scheduled sessions for the user
 *     tags:
 *       - Schedules
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, CONFIRMED, CANCELED, COMPLETED]
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of schedules
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
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    const where: any = {
      OR: [{ helperId: userId }, { elderId: userId }],
    }

    if (status) {
      where.status = status
    }

    if (upcoming) {
      where.scheduledFor = { gte: new Date() }
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        helper: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        elder: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/schedules:
 *   post:
 *     summary: Create a scheduled session
 *     description: Schedule a future assistance session
 *     tags:
 *       - Schedules
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - elderId
 *               - title
 *               - scheduledFor
 *             properties:
 *               elderId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: number
 *                 default: 60
 *     responses:
 *       201:
 *         description: Schedule created
 *       400:
 *         description: Invalid input
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createScheduleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { elderId, title, description, scheduledFor, durationMinutes } = validation.data

    // Verify elder exists
    const elder = await prisma.user.findUnique({
      where: { id: elderId },
    })

    if (!elder) {
      return NextResponse.json({ error: 'Elder not found' }, { status: 404 })
    }

    // Check if time is in the future
    const scheduleTime = new Date(scheduledFor)
    if (scheduleTime <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        helperId: userId,
        elderId,
        title,
        description,
        scheduledFor: scheduleTime,
        durationMinutes,
        status: 'SCHEDULED',
      },
      include: {
        helper: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        elder: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Create notification for elder
    await prisma.notification.create({
      data: {
        userId: elderId,
        type: 'SESSION_REQUEST',
        title: 'Session Scheduled',
        message: `${schedule.helper.name || schedule.helper.email} scheduled a help session: ${title}`,
        data: {
          scheduleId: schedule.id,
          scheduledFor: scheduleTime.toISOString(),
        },
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'schedule_created',
        resource: 'schedule',
        resourceId: schedule.id,
        metadata: {
          elderId,
          scheduledFor: scheduleTime.toISOString(),
          title,
        },
      },
    })

    return NextResponse.json(
      {
        schedule,
        message: 'Session scheduled successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
