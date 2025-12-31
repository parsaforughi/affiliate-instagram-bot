'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

const API_URL = typeof window !== 'undefined' 
  ? (window as any).__API_URL__ || 'https://affiliate-instagram-bot-production.up.railway.app'
  : 'https://affiliate-instagram-bot-production.up.railway.app'

interface Page {
  pageId: string
  pageName: string
  pageAccessToken: string
  connectedAt: number
  active: boolean
  mode: 'ai' | 'auto_reply'
  autoRepliesCount: number
  hasCustomPrompt: boolean
}

export default function PagesManagement() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [showModeModal, setShowModeModal] = useState(false)

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pages`)
      const data = await res.json()
      if (data.success) {
        setPages(data.pages)
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectPage = () => {
    window.open(`${API_URL}/auth/facebook`, '_blank')
  }

  const handleModeChange = async (pageId: string, mode: 'ai' | 'auto_reply') => {
    try {
      const res = await fetch(`${API_URL}/api/pages/${pageId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await res.json()
      if (data.success) {
        fetchPages()
        setShowModeModal(false)
        setSelectedPage(null)
      }
    } catch (err) {
      console.error('Failed to change mode:', err)
      alert('Failed to change mode')
    }
  }

  const handleDeactivate = async (pageId: string) => {
    if (!confirm('Are you sure you want to deactivate this page?')) return
    
    try {
      const res = await fetch(`${API_URL}/api/pages/${pageId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        fetchPages()
      }
    } catch (err) {
      console.error('Failed to deactivate page:', err)
      alert('Failed to deactivate page')
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Pages Management</h1>
            <button
              onClick={handleConnectPage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
            >
              + Connect New Page
            </button>
          </div>

          {pages.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl font-bold mb-4">No Pages Connected</h3>
              <p className="text-gray-400 mb-6">
                Connect your Instagram Pages to start using the bot
              </p>
              <button
                onClick={handleConnectPage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
              >
                Connect Your First Page
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {pages.map((page) => (
                <div
                  key={page.pageId}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{page.pageName}</h3>
                        {page.active ? (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                            Active
                          </span>
                        ) : (
                          <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                            Inactive
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-sm ${
                          page.mode === 'ai' ? 'bg-blue-600' : 'bg-green-600'
                        } text-white`}>
                          {page.mode === 'ai' ? 'AI Mode' : 'Auto-Reply Mode'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4">ID: {page.pageId}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Auto-Replies: </span>
                          <span className="text-white font-semibold">{page.autoRepliesCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Custom Prompt: </span>
                          <span className="text-white font-semibold">
                            {page.hasCustomPrompt ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Connected: </span>
                          <span className="text-white font-semibold">
                            {new Date(page.connectedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPage(page)
                          setShowModeModal(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                      >
                        Change Mode
                      </button>
                      <button
                        onClick={() => handleDeactivate(page.pageId)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mode Change Modal */}
          {showModeModal && selectedPage && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                <h3 className="text-2xl font-bold mb-4">Change Mode</h3>
                <p className="text-gray-400 mb-6">
                  Select the mode for <strong>{selectedPage.pageName}</strong>
                </p>
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleModeChange(selectedPage.pageId, 'ai')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedPage.mode === 'ai'
                        ? 'border-blue-600 bg-blue-600/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold mb-1">🤖 AI Mode</div>
                      <div className="text-sm text-gray-400">
                        Use OpenAI GPT for intelligent responses
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleModeChange(selectedPage.pageId, 'auto_reply')}
                    className={`w-full p-4 rounded-lg border-2 transition ${
                      selectedPage.mode === 'auto_reply'
                        ? 'border-green-600 bg-green-600/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold mb-1">⚡ Auto-Reply Mode</div>
                      <div className="text-sm text-gray-400">
                        Use predefined replies triggered by keywords
                      </div>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowModeModal(false)
                    setSelectedPage(null)
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

