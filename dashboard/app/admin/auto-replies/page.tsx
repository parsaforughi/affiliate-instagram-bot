'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

const API_URL = typeof window !== 'undefined' 
  ? (window as any).__API_URL__ || 'https://affiliate-instagram-bot-production.up.railway.app'
  : 'https://affiliate-instagram-bot-production.up.railway.app'

interface Page {
  pageId: string
  pageName: string
}

interface AutoReply {
  id: string
  keyword: string
  reply: string
  hashtags: string[]
  createdAt: number
}

export default function AutoRepliesManagement() {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string>('')
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingReply, setEditingReply] = useState<AutoReply | null>(null)
  const [formData, setFormData] = useState({
    keyword: '',
    reply: '',
    hashtags: ''
  })

  useEffect(() => {
    fetchPages()
  }, [])

  useEffect(() => {
    if (selectedPageId) {
      fetchAutoReplies(selectedPageId)
    }
  }, [selectedPageId])

  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pages`)
      const data = await res.json()
      if (data.success) {
        setPages(data.pages)
        if (data.pages.length > 0 && !selectedPageId) {
          setSelectedPageId(data.pages[0].pageId)
        }
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAutoReplies = async (pageId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/pages/${pageId}/auto-replies`)
      const data = await res.json()
      if (data.success) {
        setAutoReplies(data.replies)
      }
    } catch (err) {
      console.error('Failed to fetch auto-replies:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPageId) return

    const hashtags = formData.hashtags
      .split(',')
      .map(h => h.trim())
      .filter(h => h)

    try {
      const url = editingReply
        ? `${API_URL}/api/pages/${selectedPageId}/auto-replies/${editingReply.id}`
        : `${API_URL}/api/pages/${selectedPageId}/auto-replies`
      
      const method = editingReply ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: formData.keyword,
          reply: formData.reply,
          hashtags
        })
      })

      const data = await res.json()
      if (data.success) {
        fetchAutoReplies(selectedPageId)
        setShowAddModal(false)
        setEditingReply(null)
        setFormData({ keyword: '', reply: '', hashtags: '' })
      }
    } catch (err) {
      console.error('Failed to save auto-reply:', err)
      alert('Failed to save auto-reply')
    }
  }

  const handleDelete = async (replyId: string) => {
    if (!confirm('Are you sure you want to delete this auto-reply?')) return
    if (!selectedPageId) return

    try {
      const res = await fetch(`${API_URL}/api/pages/${selectedPageId}/auto-replies/${replyId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        fetchAutoReplies(selectedPageId)
      }
    } catch (err) {
      console.error('Failed to delete auto-reply:', err)
      alert('Failed to delete auto-reply')
    }
  }

  const handleEdit = (reply: AutoReply) => {
    setEditingReply(reply)
    setFormData({
      keyword: reply.keyword,
      reply: reply.reply,
      hashtags: reply.hashtags.join(', ')
    })
    setShowAddModal(true)
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

  const selectedPage = pages.find(p => p.pageId === selectedPageId)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Auto-Replies Management</h1>
            {selectedPageId && (
              <button
                onClick={() => {
                  setEditingReply(null)
                  setFormData({ keyword: '', reply: '', hashtags: '' })
                  setShowAddModal(true)
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
              >
                + Add Auto-Reply
              </button>
            )}
          </div>

          {/* Page Selector */}
          {pages.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Page:</label>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                {pages.map((page) => (
                  <option key={page.pageId} value={page.pageId}>
                    {page.pageName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!selectedPageId ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl font-bold mb-4">No Pages Available</h3>
              <p className="text-gray-400">
                Please connect a page first
              </p>
            </div>
          ) : (
            <>
              {selectedPage && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
                  <p className="text-gray-400">
                    Managing auto-replies for: <strong className="text-white">{selectedPage.pageName}</strong>
                  </p>
                </div>
              )}

              {autoReplies.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                  <div className="text-6xl mb-4">⚡</div>
                  <h3 className="text-2xl font-bold mb-4">No Auto-Replies</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first auto-reply to get started
                  </p>
                  <button
                    onClick={() => {
                      setEditingReply(null)
                      setFormData({ keyword: '', reply: '', hashtags: '' })
                      setShowAddModal(true)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
                  >
                    Add Auto-Reply
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {autoReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold">
                              Keyword: {reply.keyword}
                            </span>
                            {reply.hashtags.length > 0 && (
                              <div className="flex gap-2">
                                {reply.hashtags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-gray-300 mb-2">{reply.reply}</p>
                          <p className="text-gray-500 text-sm">
                            Created: {new Date(reply.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(reply)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Add/Edit Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-gray-700">
                <h3 className="text-2xl font-bold mb-4">
                  {editingReply ? 'Edit Auto-Reply' : 'Add Auto-Reply'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Keyword *</label>
                    <input
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="e.g., سلام"
                      required
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      The bot will trigger this reply when the message contains this keyword
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reply *</label>
                    <textarea
                      value={formData.reply}
                      onChange={(e) => setFormData({ ...formData, reply: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      rows={4}
                      placeholder="Enter the reply message..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hashtags (optional)</label>
                    <input
                      type="text"
                      value={formData.hashtags}
                      onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      placeholder="e.g., hello, hi, سلام (comma-separated)"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Additional triggers using hashtags (without #)
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      {editingReply ? 'Update' : 'Add'} Auto-Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false)
                        setEditingReply(null)
                        setFormData({ keyword: '', reply: '', hashtags: '' })
                      }}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

