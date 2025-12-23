import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Affiliate Bot Dashboard',
  description: 'Real-time monitoring dashboard for Instagram affiliate bot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100">{children}</body>
    </html>
  )
}

