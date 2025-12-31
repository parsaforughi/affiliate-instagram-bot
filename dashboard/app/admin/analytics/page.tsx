'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

const API_URL = typeof window !== 'undefined' 
  ? (window as any).__API_URL__ || 'https://affiliate-instagram-bot-production.up.railway.app'
  : 'https://affiliate-instagram-bot-production.up.railway.app'

interface Stats {
  totalPages: number
  activePages: number
  totalMessages: number
  todayMessages: number
  totalAutoReplies: number
  aiPages: number
  autoReplyPages: number
  totalConversations: number
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats/overview`)
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Analytics</h1>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Total Pages</div>
              <div className="text-3xl font-bold text-white">{stats?.totalPages || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                {stats?.activePages || 0} active
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Total Messages</div>
              <div className="text-3xl font-bold text-white">{stats?.totalMessages || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                {stats?.todayMessages || 0} today
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Conversations</div>
              <div className="text-3xl font-bold text-white">{stats?.totalConversations || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                Total conversations
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Auto-Replies</div>
              <div className="text-3xl font-bold text-white">{stats?.totalAutoReplies || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                Across all pages
              </div>
            </div>
          </div>

          {/* Mode Distribution */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Mode Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">AI Mode</span>
                    <span className="text-white font-semibold">{stats?.aiPages || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ 
                        width: `${stats?.totalPages ? Math.max((stats.aiPages / stats.totalPages) * 100, 5) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats?.totalPages ? Math.round((stats.aiPages / stats.totalPages) * 100) : 0}% of pages
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Auto-Reply Mode</span>
                    <span className="text-white font-semibold">{stats?.autoReplyPages || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ 
                        width: `${stats?.totalPages ? Math.max((stats.autoReplyPages / stats.totalPages) * 100, 5) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats?.totalPages ? Math.round((stats.autoReplyPages / stats.totalPages) * 100) : 0}% of pages
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Activity Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Active Pages</span>
                  <span className="text-white font-semibold text-xl">
                    {stats?.activePages || 0} / {stats?.totalPages || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Messages Today</span>
                  <span className="text-white font-semibold text-xl">
                    {stats?.todayMessages || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Auto-Replies</span>
                  <span className="text-white font-semibold text-xl">
                    {stats?.totalAutoReplies || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Conversations</span>
                  <span className="text-white font-semibold text-xl">
                    {stats?.totalConversations || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Quick Statistics</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-gray-400 text-sm mb-1">Average Messages per Day</div>
                <div className="text-2xl font-bold text-white">
                  {stats?.totalMessages && stats?.totalPages 
                    ? Math.round(stats.totalMessages / Math.max(stats.totalPages, 1))
                    : 0}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Auto-Replies per Page</div>
                <div className="text-2xl font-bold text-white">
                  {stats?.totalAutoReplies && stats?.totalPages
                    ? Math.round(stats.totalAutoReplies / Math.max(stats.totalPages, 1))
                    : 0}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Conversations per Page</div>
                <div className="text-2xl font-bold text-white">
                  {stats?.totalConversations && stats?.totalPages
                    ? Math.round(stats.totalConversations / Math.max(stats.totalPages, 1))
                    : 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

