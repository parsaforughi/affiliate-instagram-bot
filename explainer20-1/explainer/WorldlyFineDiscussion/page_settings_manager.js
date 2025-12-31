const fs = require('fs');
const path = require('path');

class PageSettingsManager {
  constructor() {
    this.settingsFile = path.join(__dirname, 'page_settings.json');
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        return JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
      }
    } catch (err) {
      console.error('Error loading page settings:', err);
    }
    return {};
  }

  saveSettings() {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('Error saving page settings:', err);
    }
  }

  // دریافت تنظیمات یک Page
  getSettings(pageId) {
    if (!this.settings[pageId]) {
      // تنظیمات پیش‌فرض
      this.settings[pageId] = {
        pageId,
        mode: 'ai', // 'ai' or 'auto_reply'
        aiPrompt: null, // پرامپت سفارشی (null = استفاده از پرامپت پیش‌فرض)
        autoReplies: [], // لیست پاسخ‌های خودکار
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.saveSettings();
    }
    return this.settings[pageId];
  }

  // تغییر حالت (AI یا Auto-Reply)
  setMode(pageId, mode) {
    if (mode !== 'ai' && mode !== 'auto_reply') {
      throw new Error('Mode must be "ai" or "auto_reply"');
    }
    const settings = this.getSettings(pageId);
    settings.mode = mode;
    settings.updatedAt = Date.now();
    this.saveSettings();
    return settings;
  }

  // تنظیم پرامپت سفارشی برای AI Mode
  setAIPrompt(pageId, prompt) {
    const settings = this.getSettings(pageId);
    settings.aiPrompt = prompt;
    settings.updatedAt = Date.now();
    this.saveSettings();
    return settings;
  }

  // اضافه کردن پاسخ خودکار
  addAutoReply(pageId, keyword, reply, hashtags = []) {
    const settings = this.getSettings(pageId);
    
    // حذف پاسخ قبلی با همین keyword
    settings.autoReplies = settings.autoReplies.filter(r => r.keyword !== keyword.toLowerCase());
    
    // اضافه کردن پاسخ جدید
    settings.autoReplies.push({
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyword: keyword.toLowerCase(),
      reply,
      hashtags: hashtags.map(h => h.toLowerCase().replace('#', '')),
      createdAt: Date.now()
    });
    
    settings.updatedAt = Date.now();
    this.saveSettings();
    return settings;
  }

  // ویرایش پاسخ خودکار
  updateAutoReply(pageId, replyId, keyword, reply, hashtags = []) {
    const settings = this.getSettings(pageId);
    const replyIndex = settings.autoReplies.findIndex(r => r.id === replyId);
    
    if (replyIndex === -1) {
      throw new Error('Auto-reply not found');
    }
    
    settings.autoReplies[replyIndex] = {
      ...settings.autoReplies[replyIndex],
      keyword: keyword.toLowerCase(),
      reply,
      hashtags: hashtags.map(h => h.toLowerCase().replace('#', '')),
      updatedAt: Date.now()
    };
    
    settings.updatedAt = Date.now();
    this.saveSettings();
    return settings;
  }

  // حذف پاسخ خودکار
  removeAutoReply(pageId, replyId) {
    const settings = this.getSettings(pageId);
    settings.autoReplies = settings.autoReplies.filter(r => r.id !== replyId);
    settings.updatedAt = Date.now();
    this.saveSettings();
    return settings;
  }

  // دریافت لیست پاسخ‌های خودکار
  getAutoReplies(pageId) {
    const settings = this.getSettings(pageId);
    return settings.autoReplies || [];
  }

  // جستجوی پاسخ خودکار بر اساس کلمه کلیدی یا هشتگ
  findAutoReply(pageId, message) {
    const settings = this.getSettings(pageId);
    const messageLower = message.toLowerCase();
    
    // جستجو بر اساس keyword
    for (const reply of settings.autoReplies) {
      if (messageLower.includes(reply.keyword)) {
        return reply;
      }
      
      // جستجو بر اساس hashtag
      for (const hashtag of reply.hashtags) {
        if (messageLower.includes(`#${hashtag}`) || messageLower.includes(hashtag)) {
          return reply;
        }
      }
    }
    
    return null;
  }

  // دریافت همه تنظیمات (برای admin)
  getAllSettings() {
    return this.settings;
  }
}

module.exports = { PageSettingsManager };

