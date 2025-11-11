'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Activity {
  id: string
  type: 'session_start' | 'session_end' | 'contact_added' | 'rating_received' | 'schedule_created'
  title: string
  description: string
  timestamp: Date
  icon: string
  color: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      // In a real app, this would fetch from /api/activity
      // For now, showing mock data
      await new Promise((resolve) => setTimeout(resolve, 500))

      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'session_start',
          title: 'Session Started',
          description: 'Help session with Mom - Email Setup',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          icon: '🎯',
          color: 'text-green-600 dark:text-green-400',
        },
        {
          id: '2',
          type: 'contact_added',
          title: 'New Contact',
          description: 'Sarah accepted your contact request',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          icon: '👥',
          color: 'text-blue-600 dark:text-blue-400',
        },
        {
          id: '3',
          type: 'rating_received',
          title: 'Session Rated',
          description: 'You received a 5-star rating!',
          timestamp: new Date(Date.now() - 1000 * 60 * 240),
          icon: '⭐',
          color: 'text-yellow-600 dark:text-yellow-400',
        },
      ]

      setActivities(mockActivities)
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-3/4" />
                  <Skeleton variant="text" className="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">🌟</div>
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />

            {/* Activities */}
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 group">
                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                      {activity.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${activity.color}`}>
                            {activity.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
