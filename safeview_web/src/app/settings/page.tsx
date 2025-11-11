'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardSkeleton } from '@/components/ui/skeleton'

interface Settings {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    sessionRequests: boolean
    sessionStarted: boolean
    sessionEnded: boolean
    payments: boolean
    marketing: boolean
  }
  privacy: {
    showOnlineStatus: boolean
    allowContactRequests: boolean
    shareSessionHistory: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    defaultSessionDuration: number
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (section: keyof Settings, key: string, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-8">
        <div className="container mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your account preferences and privacy settings
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔔</span>
                Notifications
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                label="Email Notifications"
                description="Receive notifications via email"
                checked={settings.notifications.email}
                onChange={(checked) => updateSetting('notifications', 'email', checked)}
              />
              <Toggle
                label="Push Notifications"
                description="Receive push notifications in your browser"
                checked={settings.notifications.push}
                onChange={(checked) => updateSetting('notifications', 'push', checked)}
              />
              <Toggle
                label="SMS Notifications"
                description="Receive text message notifications (coming soon)"
                checked={settings.notifications.sms}
                onChange={(checked) => updateSetting('notifications', 'sms', checked)}
                disabled
              />

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <p className="text-sm font-semibold mb-3">Notify me about:</p>
                <div className="space-y-3">
                  <Toggle
                    label="Session Requests"
                    checked={settings.notifications.sessionRequests}
                    onChange={(checked) => updateSetting('notifications', 'sessionRequests', checked)}
                    small
                  />
                  <Toggle
                    label="Session Started"
                    checked={settings.notifications.sessionStarted}
                    onChange={(checked) => updateSetting('notifications', 'sessionStarted', checked)}
                    small
                  />
                  <Toggle
                    label="Session Ended"
                    checked={settings.notifications.sessionEnded}
                    onChange={(checked) => updateSetting('notifications', 'sessionEnded', checked)}
                    small
                  />
                  <Toggle
                    label="Payment Updates"
                    checked={settings.notifications.payments}
                    onChange={(checked) => updateSetting('notifications', 'payments', checked)}
                    small
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                Privacy
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                label="Show Online Status"
                description="Let contacts see when you're online"
                checked={settings.privacy.showOnlineStatus}
                onChange={(checked) => updateSetting('privacy', 'showOnlineStatus', checked)}
              />
              <Toggle
                label="Allow Contact Requests"
                description="Anyone can send you contact requests"
                checked={settings.privacy.allowContactRequests}
                onChange={(checked) => updateSetting('privacy', 'allowContactRequests', checked)}
              />
              <Toggle
                label="Share Session History"
                description="Allow session history to be visible to family members (Family plan only)"
                checked={settings.privacy.shareSessionHistory}
                onChange={(checked) => updateSetting('privacy', 'shareSessionHistory', checked)}
              />
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.preferences.theme}
                  onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Session Duration</label>
                <select
                  value={settings.preferences.defaultSessionDuration}
                  onChange={(e) => updateSetting('preferences', 'defaultSessionDuration', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={fetchSettings} disabled={saving}>
              Reset
            </Button>
            <Button onClick={saveSettings} disabled={saving} className="px-8">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toggle Component
function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  small,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  small?: boolean
}) {
  return (
    <div className={`flex items-start justify-between ${small ? 'py-1' : 'py-2'}`}>
      <div className="flex-1">
        <div className={`font-medium ${small ? 'text-sm' : ''}`}>{label}</div>
        {description && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
