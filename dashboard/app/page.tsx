'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = typeof window !== 'undefined' 
  ? (window as any).__API_URL__ || 'http://localhost:3001'
  : 'http://localhost:3001'

interface Stats {
  totalConversations: number
  totalReceived: number
  totalSent: number
  todayReceived: number
  todaySent: number
  botStatus: {
    running: boolean
    paused: boolean
  }
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stats`)
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Affiliate Bot Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Conversations</div>
            <div className="text-3xl font-bold">{stats?.totalConversations || 0}</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Messages Today</div>
            <div className="text-3xl font-bold">
              {(stats?.todayReceived || 0) + (stats?.todaySent || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {stats?.todayReceived || 0} received, {stats?.todaySent || 0} sent
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Messages</div>
            <div className="text-3xl font-bold">
              {(stats?.totalReceived || 0) + (stats?.totalSent || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {stats?.totalReceived || 0} received, {stats?.totalSent || 0} sent
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Bot Status</div>
            <div className="text-3xl font-bold">
              {stats?.botStatus.paused ? (
                <span className="text-yellow-500">Paused</span>
              ) : stats?.botStatus.running ? (
                <span className="text-green-500">Running</span>
              ) : (
                <span className="text-red-500">Stopped</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/conversations"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              View All Conversations
            </Link>
            <Link
              href="/dashboard/logs"
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition"
            >
              View Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

