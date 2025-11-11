"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ConsentRequestProps {
  roomId: string
  requesterName: string
  requesterEmail?: string
  message?: string
  expiresAt: Date
  onGrant: (roomId: string) => Promise<void>
  onDeny: (roomId: string) => Promise<void>
}

export function ConsentRequest({
  roomId,
  requesterName,
  requesterEmail,
  message,
  expiresAt,
  onGrant,
  onDeny,
}: ConsentRequestProps) {
  const [loading, setLoading] = useState(false)

  const handleGrant = async () => {
    setLoading(true)
    try {
      await onGrant(roomId)
    } finally {
      setLoading(false)
    }
  }

  const handleDeny = async () => {
    setLoading(true)
    try {
      await onDeny(roomId)
    } finally {
      setLoading(false)
    }
  }

  const timeRemaining = Math.max(0, expiresAt.getTime() - Date.now())
  const minutesRemaining = Math.floor(timeRemaining / 60000)

  return (
    <Card className="w-full max-w-2xl mx-auto border-2">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-2xl">Remote Assistance Request</CardTitle>
        <CardDescription className="text-base">
          Someone wants to help you with your device
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <p className="text-lg">
            <span className="font-semibold">{requesterName}</span>
            {requesterEmail && (
              <span className="text-muted-foreground"> ({requesterEmail})</span>
            )}
            {" "}is requesting permission to view and assist with your screen.
          </p>

          {message && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-1">Message:</p>
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">What this allows:</h4>
          <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
            <li>✓ View your screen in real-time</li>
            <li>✓ Provide guidance and support</li>
            <li>✓ Auto-redact sensitive information like passwords</li>
          </ul>
        </div>

        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">Your safety:</h4>
          <ul className="text-sm space-y-1 text-green-800 dark:text-green-200">
            <li>✓ You can end the session at ANY time</li>
            <li>✓ Session automatically expires in {minutesRemaining} minutes</li>
            <li>✓ All actions are logged for your security</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3 justify-end bg-muted/30 pt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={handleDeny}
          disabled={loading}
          className="min-w-32"
        >
          Deny
        </Button>
        <Button
          size="lg"
          onClick={handleGrant}
          disabled={loading}
          className="min-w-32 bg-green-600 hover:bg-green-700"
        >
          {loading ? "Processing..." : "Grant Access"}
        </Button>
      </CardFooter>
    </Card>
  )
}
