'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/pages', label: 'Pages', icon: '📄' },
  { href: '/admin/auto-replies', label: 'Auto-Replies', icon: '⚡' },
  { href: '/admin/ai-settings', label: 'AI Settings', icon: '🤖' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/conversations', label: 'Conversations', icon: '💬' },
  { href: '/dashboard/logs', label: 'Logs', icon: '📝' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-800 min-h-screen p-4">
      <div className="mb-8">
        <Link href="/home" className="text-2xl font-bold text-white">
          Bot Platform
        </Link>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

