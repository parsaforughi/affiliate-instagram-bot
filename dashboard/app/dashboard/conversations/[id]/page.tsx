'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = 'http://localhost:3001'

interface Message {
  id: string
  conversationId: string
  from: 'user' | 'bot'
  text: string
  createdAt: string
}

interface Conversation {
  id: string
  username: string
  name: string | null
  bio: string | null
  messages: Message[]
  inboundCount: number
  outboundCount: number
  totalMessages: number
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = decodeURIComponent(params.id as string)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const res = await fetch(`${API_URL}/api/conversations/${encodeURIComponent(conversationId)}`)
        if (!res.ok) {
          throw new Error('Conversation not found')
        }
        const data = await res.json()
        setConversation(data)
      } catch (err) {
        console.error('Failed to fetch conversation:', err)
        router.push('/dashboard/conversations')
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
    const interval = setInterval(fetchConversation, 2000) // Refresh every 2 seconds

    // Connect to SSE for real-time updates
    const eventSource = new EventSource(`${API_URL}/api/sse/live-messages`)
    
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      if (data.message && data.message.conversationId === conversationId) {
        // New message for this conversation, refresh
        fetchConversation()
      }
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      clearInterval(interval)
      eventSource.close()
    }
  }, [conversationId, router])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading conversation...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Conversation not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/conversations"
              className="text-blue-400 hover:text-blue-300 mb-2 inline-block"
            >
              ← Back to Conversations
            </Link>
            <h1 className="text-2xl font-bold">
              {conversation.name || conversation.username}
            </h1>
            {conversation.bio && (
              <div className="text-sm text-gray-400 mt-1">@{conversation.username}</div>
            )}
          </div>
          <div className="text-sm text-gray-400">
            {conversation.inboundCount} received • {conversation.outboundCount} sent
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              No messages in this conversation yet
            </div>
          ) : (
            conversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.from === 'bot' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.from === 'bot'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.text}</div>
                  <div
                    className={`text-xs mt-2 ${
                      message.from === 'bot' ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}

