import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  relationship: z.string().optional(),
  priority: z.number().min(1).max(10).default(1),
}).refine(data => data.phone || data.email, {
  message: 'At least one contact method (phone or email) is required',
})

/**
 * @openapi
 * /api/emergency-contacts:
 *   get:
 *     summary: Get emergency contacts
 *     description: Returns all emergency contacts for the user
 *     tags:
 *       - Emergency Contacts
 *     responses:
 *       200:
 *         description: List of emergency contacts
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emergencyContacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priority: 'asc' },
    })

    return NextResponse.json({ emergencyContacts })
  } catch (error) {
    console.error('Error fetching emergency contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/emergency-contacts:
 *   post:
 *     summary: Add emergency contact
 *     description: Add a new emergency contact
 *     tags:
 *       - Emergency Contacts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               relationship:
 *                 type: string
 *               priority:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 1
 *     responses:
 *       201:
 *         description: Emergency contact created
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = emergencyContactSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const emergencyContact = await prisma.emergencyContact.create({
      data: {
        userId,
        ...validation.data,
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'emergency_contact_added',
        resource: 'emergency_contact',
        resourceId: emergencyContact.id,
        metadata: {
          name: emergencyContact.name,
        },
      },
    })

    return NextResponse.json(
      {
        emergencyContact,
        message: 'Emergency contact added successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating emergency contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
