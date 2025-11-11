import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * @openapi
 * /api/auth/session:
 *   get:
 *     summary: Check authentication session status
 *     description: Returns the current session status and basic user information
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 userId:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, sessionId } = await auth()

    if (!userId || !sessionId) {
      return NextResponse.json(
        {
          authenticated: false,
          sessionId: null,
          userId: null,
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
