'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            Instagram Bot Platform
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            یک پلتفرم کامل برای مدیریت و خودکارسازی پاسخ‌های اینستاگرام
            با قابلیت‌های AI و Auto-Reply
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/admin"
              className="bg-white text-purple-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition"
            >
              ورود به داشبورد
            </Link>
            <Link
              href="/admin"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-purple-900 transition"
            >
              شروع کنید
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-white mb-4">AI Mode</h3>
            <p className="text-gray-300">
              پاسخ‌های هوشمند با استفاده از OpenAI GPT. پرامپت سفارشی برای هر Page
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-4">Auto-Reply</h3>
            <p className="text-gray-300">
              پاسخ‌های از پیش آماده با تریگر Keyword یا Hashtag
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-white mb-4">Analytics</h3>
            <p className="text-gray-300">
              آمار و گزارش‌های کامل از تمام فعالیت‌ها و مکالمات
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-12">چطور کار می‌کند؟</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-300 mb-2">1</div>
              <h4 className="text-xl font-semibold text-white mb-2">اتصال Page</h4>
              <p className="text-gray-300 text-sm">
                Page اینستاگرام خود را متصل کنید
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-300 mb-2">2</div>
              <h4 className="text-xl font-semibold text-white mb-2">انتخاب حالت</h4>
              <p className="text-gray-300 text-sm">
                AI Mode یا Auto-Reply را انتخاب کنید
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-300 mb-2">3</div>
              <h4 className="text-xl font-semibold text-white mb-2">تنظیمات</h4>
              <p className="text-gray-300 text-sm">
                پرامپت یا Auto-Replies را تنظیم کنید
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl font-bold text-purple-300 mb-2">4</div>
              <h4 className="text-xl font-semibold text-white mb-2">شروع</h4>
              <p className="text-gray-300 text-sm">
                Bot به صورت خودکار پاسخ می‌دهد
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              آماده شروع هستید؟
            </h2>
            <p className="text-gray-300 mb-8">
              همین حالا شروع کنید و Page خود را متصل کنید
            </p>
            <Link
              href="/admin"
              className="bg-white text-purple-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition inline-block"
            >
              ورود به داشبورد
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

