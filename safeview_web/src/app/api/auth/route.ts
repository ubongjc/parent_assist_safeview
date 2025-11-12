import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * @openapi
 * /api/auth:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the current user's authentication status and profile information
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [HELPER, ELDER, ADMIN]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          message: 'Not authenticated'
        },
        { status: 401 }
      )
    }

    // Get Clerk user details
    const clerkUser = await currentUser()

    if (!clerkUser) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          message: 'User not found'
        },
        { status: 401 }
      )
    }

    // Try to find user in our database
    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // If user doesn't exist in our database, create them
    if (!dbUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''
      const name = clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.firstName || clerkUser.lastName || email

      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email,
          name,
          role: 'ELDER', // Default role
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      // Log user creation
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: 'user_created',
          resource: 'user',
          resourceId: dbUser.id,
          metadata: {
            email: dbUser.email,
            role: dbUser.role,
          }
        }
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
      session: {
        userId: userId,
        expiresAt: null, // Clerk manages session expiration
      }
    })

  } catch (error) {
    console.error('Error fetching auth status:', error)
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * @openapi
 * /api/auth:
 *   put:
 *     summary: Update current user profile
 *     description: Updates the authenticated user's profile information
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's display name
 *               role:
 *                 type: string
 *                 enum: [HELPER, ELDER, ADMIN]
 *                 description: User's role (ADMIN only can change to ADMIN)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authenticated
 *       400:
 *         description: Invalid input
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, role } = body

    // Get current user to check permissions
    const currentUserData = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!currentUserData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Only admins can set role to ADMIN
    if (role === 'ADMIN' && currentUserData.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions to set ADMIN role' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined && ['HELPER', 'ELDER', 'ADMIN'].includes(role)) {
      updateData.role = role
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'user_updated',
        resource: 'user',
        resourceId: userId,
        metadata: {
          changes: updateData,
        }
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
