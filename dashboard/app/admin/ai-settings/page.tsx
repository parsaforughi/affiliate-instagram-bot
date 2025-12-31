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

interface Settings {
  pageId: string
  mode: string
  aiPrompt: string | null
  autoReplies: any[]
}

export default function AISettings() {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string>('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPages()
  }, [])

  useEffect(() => {
    if (selectedPageId) {
      fetchSettings(selectedPageId)
    }
  }, [selectedPageId])

  const fetchPages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pages`)
      const data = await res.json()
      if (data.success) {
        setPages(data.pages.filter((p: Page) => p.pageId))
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

  const fetchSettings = async (pageId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/pages/${pageId}/settings`)
      const data = await res.json()
      if (data.success) {
        setSettings(data.settings)
        setPrompt(data.settings.aiPrompt || '')
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const handleSave = async () => {
    if (!selectedPageId) return
    setSaving(true)

    try {
      const res = await fetch(`${API_URL}/api/pages/${selectedPageId}/ai-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt || null })
      })

      const data = await res.json()
      if (data.success) {
        alert('Prompt saved successfully!')
        fetchSettings(selectedPageId)
      } else {
        alert('Failed to save prompt')
      }
    } catch (err) {
      console.error('Failed to save prompt:', err)
      alert('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default prompt?')) {
      setPrompt('')
      handleSave()
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

  const selectedPage = pages.find(p => p.pageId === selectedPageId)
  const defaultPrompt = `تو یک دستیار فروشگاه لوکسیرانا هستی. همیشه مودب و حرفه‌ای باش...`

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">AI Settings</h1>

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
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Custom AI Prompt</h2>
                    {selectedPage && (
                      <span className="text-sm text-gray-400">
                        {selectedPage.pageName}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-400 mb-4 text-sm">
                    Customize the AI prompt for this page. Leave empty to use the default prompt.
                  </p>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-sm"
                    rows={20}
                    placeholder={defaultPrompt}
                  />

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
                    >
                      {saving ? 'Saving...' : 'Save Prompt'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">💡 Tips</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• Use clear instructions</li>
                    <li>• Define the bot's personality</li>
                    <li>• Include brand guidelines</li>
                    <li>• Specify response style</li>
                    <li>• Add product information</li>
                  </ul>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">📝 Default Prompt</h3>
                  <p className="text-sm text-gray-400">
                    If you leave the prompt empty, the system will use the default prompt which includes:
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-400 list-disc list-inside">
                    <li>Brand information</li>
                    <li>Product knowledge</li>
                    <li>Response guidelines</li>
                    <li>Affiliate program details</li>
                  </ul>
                </div>

                {settings && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-bold mb-4">ℹ️ Current Settings</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Mode: </span>
                        <span className="text-white font-semibold">
                          {settings.mode === 'ai' ? 'AI Mode' : 'Auto-Reply Mode'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Custom Prompt: </span>
                        <span className="text-white font-semibold">
                          {settings.aiPrompt ? 'Yes' : 'No (Using Default)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Auto-Replies: </span>
                        <span className="text-white font-semibold">
                          {settings.autoReplies.length}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

