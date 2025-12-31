const { PageSettingsManager } = require('./page_settings_manager.js');

class AutoReplyManager {
  constructor() {
    this.settingsManager = new PageSettingsManager();
  }

  // بررسی و ارسال پاسخ خودکار
  async processMessage(pageId, message, apiClient, senderId) {
    const reply = this.settingsManager.findAutoReply(pageId, message);
    
    if (reply) {
      console.log(`🤖 [${pageId}] Auto-reply triggered: "${reply.keyword}"`);
      await apiClient.sendTextMessage(senderId, reply.reply);
      return { success: true, type: 'auto_reply', reply };
    }
    
    return { success: false, type: 'no_match' };
  }

  // دریافت لیست پاسخ‌های خودکار برای یک Page
  getAutoReplies(pageId) {
    return this.settingsManager.getAutoReplies(pageId);
  }

  // اضافه کردن پاسخ خودکار
  addAutoReply(pageId, keyword, reply, hashtags = []) {
    return this.settingsManager.addAutoReply(pageId, keyword, reply, hashtags);
  }

  // ویرایش پاسخ خودکار
  updateAutoReply(pageId, replyId, keyword, reply, hashtags = []) {
    return this.settingsManager.updateAutoReply(pageId, replyId, keyword, reply, hashtags);
  }

  // حذف پاسخ خودکار
  removeAutoReply(pageId, replyId) {
    return this.settingsManager.removeAutoReply(pageId, replyId);
  }
}

module.exports = { AutoReplyManager };

