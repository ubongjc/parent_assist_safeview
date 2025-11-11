"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ActiveSessionProps {
  roomId: string
  helperName: string
  startedAt: Date
  expiresAt: Date
  onEnd: (roomId: string, reason?: string) => Promise<void>
}

export function ActiveSession({
  roomId,
  helperName,
  startedAt,
  expiresAt,
  onEnd,
}: ActiveSessionProps) {
  const [loading, setLoading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setDuration(Math.floor((now - startedAt.getTime()) / 1000))
      setTimeRemaining(Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)))
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, expiresAt])

  const handleEnd = async () => {
    if (!confirm("Are you sure you want to end this assistance session?")) {
      return
    }

    setLoading(true)
    try {
      await onEnd(roomId, "User ended session")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isExpiringSoon = timeRemaining < 300 // Less than 5 minutes

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Big Prominent End Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          variant="destructive"
          size="xl"
          onClick={handleEnd}
          disabled={loading}
          className="shadow-2xl hover:scale-105 transition-transform"
        >
          {loading ? "Ending..." : "🛑 END SESSION"}
        </Button>
      </div>

      {/* Session Info Card */}
      <Card className="border-2 border-green-500">
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="text-2xl text-green-900 dark:text-green-100">
            🟢 Active Assistance Session
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Helper</p>
              <p className="text-lg font-semibold">{helperName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Session Duration</p>
              <p className="text-lg font-semibold font-mono">{formatTime(duration)}</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            isExpiringSoon
              ? 'bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-800'
              : 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800'
          }`}>
            <p className="text-sm font-medium mb-1">
              {isExpiringSoon ? '⚠️ Session Expiring Soon' : 'Time Remaining'}
            </p>
            <p className={`text-2xl font-bold font-mono ${
              isExpiringSoon ? 'text-orange-900 dark:text-orange-100' : 'text-blue-900 dark:text-blue-100'
            }`}>
              {formatTime(timeRemaining)}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-red-900 dark:text-red-100">
              You are in control
            </h4>
            <p className="text-sm text-red-800 dark:text-red-200">
              Click the <strong>"END SESSION"</strong> button at any time to immediately
              stop screen sharing and revoke access. You don't need to give a reason.
            </p>
          </div>

          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={handleEnd}
              disabled={loading}
              className="w-full max-w-md"
            >
              {loading ? "Ending Session..." : "End Session"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visual indicator that session is being recorded/logged */}
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p>
              Session is being logged for your security and protection.
              All helper actions are recorded.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
