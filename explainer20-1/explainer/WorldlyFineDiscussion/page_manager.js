const fs = require('fs');
const path = require('path');
const { InstagramGraphAPI } = require('./instagram_api_client.js');

class PageManager {
  constructor() {
    this.pagesFile = path.join(__dirname, 'connected_pages.json');
    this.pages = this.loadPages();
  }

  loadPages() {
    try {
      if (fs.existsSync(this.pagesFile)) {
        return JSON.parse(fs.readFileSync(this.pagesFile, 'utf8'));
      }
    } catch (err) {
      console.error('Error loading pages:', err);
    }
    return {};
  }

  savePages() {
    try {
      fs.writeFileSync(this.pagesFile, JSON.stringify(this.pages, null, 2));
    } catch (err) {
      console.error('Error saving pages:', err);
    }
  }

  // اضافه کردن یک Page
  addPage(pageId, pageAccessToken, pageName) {
    this.pages[pageId] = {
      pageId,
      pageAccessToken,
      pageName,
      connectedAt: Date.now(),
      active: true
    };
    this.savePages();
    console.log(`✅ Page ${pageName} (${pageId}) added successfully`);
  }

  // دریافت API Client برای یک Page
  getAPIClient(pageId) {
    const page = this.pages[pageId];
    if (!page || !page.active) {
      return null;
    }
    return new InstagramGraphAPI(page.pageAccessToken, pageId);
  }

  // دریافت همه Pages فعال
  getActivePages() {
    return Object.values(this.pages).filter(p => p.active);
  }

  // دریافت اولین Page فعال (برای fallback)
  getFirstActivePage() {
    const activePages = this.getActivePages();
    return activePages.length > 0 ? activePages[0] : null;
  }

  // غیرفعال کردن یک Page
  deactivatePage(pageId) {
    if (this.pages[pageId]) {
      this.pages[pageId].active = false;
      this.savePages();
    }
  }

  // فعال کردن یک Page
  activatePage(pageId) {
    if (this.pages[pageId]) {
      this.pages[pageId].active = true;
      this.savePages();
    }
  }
}

module.exports = { PageManager };

