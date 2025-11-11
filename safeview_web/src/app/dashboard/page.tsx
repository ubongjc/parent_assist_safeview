'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalSessions: number
  activeSessions: number
  pendingSessions: number
  sessionsThisMonth: number
  subscription: {
    plan: string
    status: string
    sessionsRemaining: number | null
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [roomsRes, subRes, notifRes] = await Promise.all([
        fetch('/api/room'),
        fetch('/api/subscription'),
        fetch('/api/notifications?unreadOnly=true&limit=5'),
      ])

      const rooms = await roomsRes.json()
      const subscription = await subRes.json()
      const notifs = await notifRes.json()

      // Calculate stats
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const stats: DashboardStats = {
        totalSessions: rooms.rooms?.length || 0,
        activeSessions: rooms.rooms?.filter((r: any) => r.status === 'ACTIVE').length || 0,
        pendingSessions: rooms.rooms?.filter((r: any) => r.status === 'PENDING').length || 0,
        sessionsThisMonth: rooms.rooms?.filter((r: any) =>
          new Date(r.createdAt) >= startOfMonth
        ).length || 0,
        subscription: {
          plan: subscription.plan?.name || 'Free',
          status: subscription.subscription?.status || 'active',
          sessionsRemaining: subscription.usage?.unlimited
            ? null
            : (subscription.usage?.limit || 0) - (subscription.usage?.sessionsThisMonth || 0),
        },
      }

      setStats(stats)
      setRecentSessions(rooms.rooms?.slice(0, 5) || [])
      setNotifications(notifs.notifications || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome back! Here's an overview of your SafeView activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardDescription>Total Sessions</CardDescription>
              <CardTitle className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.totalSessions || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardDescription>Active Sessions</CardDescription>
              <CardTitle className="text-4xl font-bold text-green-600 dark:text-green-400">
                {stats?.activeSessions || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardDescription>Pending Requests</CardDescription>
              <CardTitle className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats?.pendingSessions || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardDescription>This Month</CardDescription>
              <CardTitle className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {stats?.sessionsThisMonth || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sessions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Recent Sessions
              </CardTitle>
              <CardDescription>Your latest help sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No sessions yet</p>
                  <Button>Start New Session</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' :
                          session.status === 'PENDING' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        <div>
                          <p className="font-semibold">
                            {session.inviter?.name || session.inviter?.email}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          session.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          session.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {session.status}
                        </span>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
              <CardHeader>
                <CardTitle className="text-white">Your Plan</CardTitle>
                <CardDescription className="text-blue-100">
                  {stats?.subscription.plan}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.subscription.sessionsRemaining !== null ? (
                  <div className="mb-4">
                    <p className="text-3xl font-bold">
                      {stats?.subscription.sessionsRemaining}
                    </p>
                    <p className="text-blue-100 text-sm">sessions remaining</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-2xl font-bold">∞</p>
                    <p className="text-blue-100 text-sm">Unlimited sessions</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white"
                >
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔔</span>
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No new notifications
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="default">
                  Start New Session
                </Button>
                <Button className="w-full" variant="outline">
                  Schedule Session
                </Button>
                <Button className="w-full" variant="outline">
                  Manage Contacts
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
