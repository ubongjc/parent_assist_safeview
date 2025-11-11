import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addContactSchema = z.object({
  contactEmail: z.string().email(),
  nickname: z.string().optional(),
  group: z.string().optional(),
  isEmergency: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

/**
 * @openapi
 * /api/contacts:
 *   get:
 *     summary: Get user's contacts
 *     description: Returns all contacts for the authenticated user
 *     tags:
 *       - Contacts
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, BLOCKED]
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of contacts
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
    const group = searchParams.get('group')

    const where: any = {
      OR: [
        { userId },
        { contactId: userId, status: 'ACCEPTED' }, // Show accepted contacts where user is the recipient
      ],
    }

    if (status) {
      where.status = status
    }

    if (group) {
      where.group = group
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { isFavorite: 'desc' },
        { isEmergency: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Transform to user-friendly format
    const transformedContacts = contacts.map(c => {
      const isInitiator = c.userId === userId
      const contactUser = isInitiator ? c.contact : c.user

      return {
        id: c.id,
        userId: contactUser.id,
        email: contactUser.email,
        name: contactUser.name,
        role: (contactUser as any).role,
        nickname: c.nickname,
        group: c.group,
        status: c.status,
        isEmergency: c.isEmergency,
        isFavorite: c.isFavorite,
        createdAt: c.createdAt,
        isInitiator,
      }
    })

    return NextResponse.json({ contacts: transformedContacts })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/contacts:
 *   post:
 *     summary: Add a new contact
 *     description: Send a contact request to another user
 *     tags:
 *       - Contacts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactEmail
 *             properties:
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               nickname:
 *                 type: string
 *               group:
 *                 type: string
 *               isEmergency:
 *                 type: boolean
 *               isFavorite:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Contact request created
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = addContactSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { contactEmail, nickname, group, isEmergency, isFavorite } = validation.data

    // Cannot add yourself
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (currentUser?.email === contactEmail) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a contact' },
        { status: 400 }
      )
    }

    // Find the user to add
    const contactUser = await prisma.user.findUnique({
      where: { email: contactEmail },
    })

    if (!contactUser) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      )
    }

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        OR: [
          { userId, contactId: contactUser.id },
          { userId: contactUser.id, contactId: userId },
        ],
      },
    })

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact relationship already exists' },
        { status: 400 }
      )
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        userId,
        contactId: contactUser.id,
        status: 'PENDING',
        nickname,
        group,
        isEmergency: isEmergency || false,
        isFavorite: isFavorite || false,
      },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // Create notification for the contact
    await prisma.notification.create({
      data: {
        userId: contactUser.id,
        type: 'CONTACT_REQUEST',
        title: 'New Contact Request',
        message: `${currentUser?.name || currentUser?.email} wants to add you as a contact`,
        data: {
          contactId: contact.id,
          fromUserId: userId,
        },
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'contact_request_sent',
        resource: 'contact',
        resourceId: contact.id,
        metadata: {
          contactEmail,
          contactId: contactUser.id,
        },
      },
    })

    return NextResponse.json(
      {
        contact: {
          id: contact.id,
          userId: contact.contact.id,
          email: contact.contact.email,
          name: contact.contact.name,
          role: contact.contact.role,
          nickname: contact.nickname,
          group: contact.group,
          status: contact.status,
          isEmergency: contact.isEmergency,
          isFavorite: contact.isFavorite,
        },
        message: 'Contact request sent successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
