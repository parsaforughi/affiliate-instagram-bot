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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    fetchStats()
    const interval = setInterval(fetchStats, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

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
          <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Total Pages</div>
              <div className="text-3xl font-bold text-white">{stats?.totalPages || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                {stats?.activePages || 0} active
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Messages Today</div>
              <div className="text-3xl font-bold text-white">{stats?.todayMessages || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                {stats?.totalMessages || 0} total
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Auto-Replies</div>
              <div className="text-3xl font-bold text-white">{stats?.totalAutoReplies || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                Across all pages
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Conversations</div>
              <div className="text-3xl font-bold text-white">{stats?.totalConversations || 0}</div>
              <div className="text-sm text-gray-500 mt-2">
                Total conversations
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
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats?.totalPages ? (stats.aiPages / stats.totalPages) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">Auto-Reply Mode</span>
                    <span className="text-white font-semibold">{stats?.autoReplyPages || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats?.totalPages ? (stats.autoReplyPages / stats.totalPages) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href="/admin/pages"
                  className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition text-center"
                >
                  Manage Pages
                </a>
                <a
                  href="/admin/auto-replies"
                  className="block bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition text-center"
                >
                  Manage Auto-Replies
                </a>
                <a
                  href="/admin/ai-settings"
                  className="block bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition text-center"
                >
                  AI Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

