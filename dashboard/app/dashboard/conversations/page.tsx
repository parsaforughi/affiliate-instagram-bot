'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = 'http://localhost:3001'

interface Conversation {
  id: string
  username: string
  name: string | null
  bio: string | null
  lastMessage: string
  lastMessageAt: string
  inboundCount: number
  outboundCount: number
  totalMessages: number
  hasUnread: boolean
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(`${API_URL}/api/conversations`)
        const data = await res.json()
        setConversations(data)
      } catch (err) {
        console.error('Failed to fetch conversations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
    const interval = setInterval(fetchConversations, 3000) // Refresh every 3 seconds

    // Also connect to SSE for real-time updates
    const eventSource = new EventSource(`${API_URL}/api/sse/live-messages`)
    
    eventSource.addEventListener('message', (event) => {
      // When new message arrives, refresh conversations
      fetchConversations()
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      clearInterval(interval)
      eventSource.close()
    }
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Conversations</h1>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No conversations yet
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/dashboard/conversations/${encodeURIComponent(conv.id)}`}
                  className="block hover:bg-gray-700 transition p-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-lg">
                          {conv.name || conv.username}
                        </div>
                        {conv.hasUnread && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      {conv.bio && (
                        <div className="text-sm text-gray-400 mb-2">@{conv.username}</div>
                      )}
                      <div className="text-gray-300 mb-2 line-clamp-2">
                        {conv.lastMessage || 'No messages yet'}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>{conv.inboundCount} received</span>
                        <span>{conv.outboundCount} sent</span>
                        <span>{conv.totalMessages} total</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 ml-4">
                      {formatTime(conv.lastMessageAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

