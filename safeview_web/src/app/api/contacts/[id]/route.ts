import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { updateContactSchema } from '@/lib/validations'

/**
 * @openapi
 * /api/contacts/{id}:
 *   put:
 *     summary: Update contact
 *     description: Accept/reject contact request or update contact settings
 *     tags:
 *       - Contacts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, BLOCKED]
 *               nickname:
 *                 type: string
 *               group:
 *                 type: string
 *               isEmergency:
 *                 type: boolean
 *               isFavorite:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contact updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateContactSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Find the contact
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        user: true,
        contact: true,
      },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check permissions
    if (contact.userId !== userId && contact.contactId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updateData = validation.data

    // Only the recipient can accept/block
    if (updateData.status && contact.contactId !== userId) {
      return NextResponse.json(
        { error: 'Only the recipient can accept or block contact requests' },
        { status: 403 }
      )
    }

    // Update contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
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
    })

    // If status changed to ACCEPTED, notify the initiator
    if (updateData.status === 'ACCEPTED' && contact.status !== 'ACCEPTED') {
      await prisma.notification.create({
        data: {
          userId: contact.userId,
          type: 'CONTACT_REQUEST',
          title: 'Contact Request Accepted',
          message: `${contact.contact.name || contact.contact.email} accepted your contact request`,
          data: {
            contactId: contact.id,
          },
        },
      })
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: updateData.status ? `contact_${updateData.status.toLowerCase()}` : 'contact_updated',
        resource: 'contact',
        resourceId: contact.id,
        metadata: updateData,
      },
    })

    return NextResponse.json({
      contact: updatedContact,
      message: 'Contact updated successfully',
    })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/contacts/{id}:
 *   delete:
 *     summary: Remove contact
 *     description: Delete a contact relationship
 *     tags:
 *       - Contacts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Contact not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    if (contact.userId !== userId && contact.contactId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.contact.delete({
      where: { id },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'contact_deleted',
        resource: 'contact',
        resourceId: id,
      },
    })

    return NextResponse.json({
      message: 'Contact removed successfully',
    })
  } catch (error) {
    console.error('Error removing contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
