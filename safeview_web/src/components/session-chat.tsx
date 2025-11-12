'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChatMessage {
  id: string
  userId: string
  message: string
  type: 'text' | 'system' | 'voice_transcript'
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface SessionChatProps {
  roomId: string
  currentUserId: string
  isActive: boolean
}

export function SessionChat({ roomId, currentUserId, isActive }: SessionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMessages()
    // In a real app, set up WebSocket connection for real-time messages
    const interval = setInterval(fetchMessages, 3000) // Poll for new messages
    return () => clearInterval(interval)
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/chat/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
        inputRef.current?.focus()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Card className="flex flex-col h-full max-h-[600px]">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>💬</span>
          Session Chat
          {isActive && (
            <span className="flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.userId === currentUserId
              const isSystem = msg.type === 'system'

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      {msg.message}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isOwn
                        ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm'
                    } px-4 py-2 shadow-sm`}
                  >
                    {!isOwn && (
                      <div className="text-xs font-semibold mb-1 opacity-75">
                        {msg.user.name || msg.user.email}
                      </div>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {!isActive ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            Chat is only available during active sessions
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={2000}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              {sending ? '...' : 'Send'}
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
