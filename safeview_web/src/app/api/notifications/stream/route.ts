import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * Server-Sent Events endpoint for real-time notifications
 * Keeps connection open and streams new notifications as they arrive
 */
export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Set up SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      )

      // Poll for new notifications every 2 seconds
      const interval = setInterval(async () => {
        try {
          // Get unread notifications
          const notifications = await prisma.notification.findMany({
            where: {
              userId,
              isRead: false,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })

          // Get active sessions count
          const activeSessions = await prisma.room.count({
            where: {
              OR: [{ inviterId: userId }, { inviteeId: userId }],
              status: 'ACTIVE',
            },
          })

          // Get pending sessions count
          const pendingSessions = await prisma.room.count({
            where: {
              inviteeId: userId,
              status: 'PENDING',
            },
          })

          // Send data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'update',
                notifications,
                unreadCount: notifications.length,
                activeSessions,
                pendingSessions,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          )
        } catch (error) {
          console.error('SSE error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch updates' })}\n\n`
            )
          )
        }
      }, 2000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
