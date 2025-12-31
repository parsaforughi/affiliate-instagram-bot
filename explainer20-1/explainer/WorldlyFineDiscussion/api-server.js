// Integrated API Server for Affiliate Bot
// This server runs together with the bot and shares the same data

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const fetch = require('node-fetch');
const { PageManager } = require('./page_manager.js');
const { InstagramGraphAPI } = require('./instagram_api_client.js');
const { PageSettingsManager } = require('./page_settings_manager.js');
const { AutoReplyManager } = require('./auto_reply_manager.js');

// Create Express app
const app = express();
// Enable CORS for all origins (needed for Railway dashboard to connect)
app.use(cors({
  origin: '*', // Allow all origins (Railway dashboard)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// Track SSE clients
const messageSSEClients = new Set();
const logSSEClients = new Set();

// In-memory log store
let logStore = [];

// Bot status (shared with main.js)
let botStatus = { running: true, paused: false };

// Export function to start API server
function startAPIServer(userContextManager, messageCache, port = 3001) {
  // Render uses PORT, fallback to API_PORT, then default
  const PORT = process.env.PORT || process.env.API_PORT || port;
  const BOT_STATUS_FILE = path.join(__dirname, '.bot-status.json');
  const PROMPT_CONFIG_PATH = path.join(__dirname, 'prompt_config.json');

  // Load bot status
  function loadBotStatus() {
    try {
      if (fs.existsSync(BOT_STATUS_FILE)) {
        botStatus = JSON.parse(fs.readFileSync(BOT_STATUS_FILE, 'utf-8'));
      }
    } catch (err) {
      console.log('⚠️ Could not load bot status, using defaults');
    }
  }

  // Save bot status
  function saveBotStatus() {
    try {
      fs.writeFileSync(BOT_STATUS_FILE, JSON.stringify(botStatus, null, 2));
    } catch (err) {
      console.error('⚠️ Could not save bot status:', err.message);
    }
  }

  // Get data from UserContextManager (real-time, shared with bot)
  function getMessagesStore() {
    const messagesStore = {};
    const conversationsMeta = {};
    const contexts = userContextManager.contexts;

    for (const [username, context] of Object.entries(contexts)) {
      const conversationId = username;
      messagesStore[conversationId] = [];
      conversationsMeta[conversationId] = {
        username: username,
        bio: context.bio || null,
        name: context.name || null,
        firstSeen: context.firstSeen || null,
        lastSeen: context.lastSeen || null,
      };

      if (context.messageHistory && Array.isArray(context.messageHistory)) {
        context.messageHistory.forEach((msg, index) => {
          messagesStore[conversationId].push({
            id: `${conversationId}_${index}_${msg.timestamp}`,
            conversationId: conversationId,
            from: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content,
            createdAt: new Date(msg.timestamp).toISOString(),
            timestamp: msg.timestamp
          });
        });
      }
    }

    return { messagesStore, conversationsMeta };
  }

  // Initialize
  loadBotStatus();

  // Initialize Page Manager
  const pageManager = new PageManager();
  const pageSettingsManager = new PageSettingsManager();
  const autoReplyManager = new AutoReplyManager();
  const APP_ID = process.env.APP_ID;
  const APP_SECRET = process.env.APP_SECRET;
  const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'luxirana_webhook_2024';

  // Auto-add default page if token provided
  if (process.env.INSTAGRAM_PAGE_ACCESS_TOKEN && process.env.INSTAGRAM_PAGE_ID) {
    const existingPage = pageManager.pages[process.env.INSTAGRAM_PAGE_ID];
    if (!existingPage) {
      pageManager.addPage(
        process.env.INSTAGRAM_PAGE_ID,
        process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
        'Default Page'
      );
      console.log('✅ Default page added from environment variables');
    }
  }

  // ============================================
  // OAUTH ROUTES (برای اتصال Pages)
  // ============================================

  // صفحه Login برای اتصال Page
  app.get('/auth/facebook', (req, res) => {
    if (!APP_ID) {
      return res.status(500).send('APP_ID not configured');
    }
    
    const redirectURI = `${req.protocol}://${req.get('host')}/auth/facebook/callback`;
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_manage_messages';
    const authURL = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(redirectURI)}&scope=${scope}&response_type=code`;
    
    res.redirect(authURL);
  });

  // Callback برای دریافت Token
  app.get('/auth/facebook/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    if (!APP_ID || !APP_SECRET) {
      return res.status(500).send('APP_ID or APP_SECRET not configured');
    }

    try {
      const redirectURI = `${req.protocol}://${req.get('host')}/auth/facebook/callback`;
      
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(redirectURI)}&code=${code}`
      );
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        return res.status(400).send(`Error: ${tokenData.error.message}`);
      }

      const userAccessToken = tokenData.access_token;

      // Get long-lived token
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${userAccessToken}`
      );
      const longLivedData = await longLivedResponse.json();
      
      const longLivedToken = longLivedData.access_token || userAccessToken;

      // Get user's pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
      );
      const pagesData = await pagesResponse.json();
      
      if (pagesData.error) {
        return res.status(400).send(`Error: ${pagesData.error.message}`);
      }

      // Save all pages
      const connectedPages = [];
      if (pagesData.data && pagesData.data.length > 0) {
        pagesData.data.forEach(page => {
          pageManager.addPage(
            page.id,
            page.access_token,
            page.name || `Page ${page.id}`
          );
          connectedPages.push({ id: page.id, name: page.name || `Page ${page.id}` });
        });
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Success - Pages Connected</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            h1 { color: #25D366; }
            ul { text-align: left; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>✅ Pages Connected Successfully!</h1>
          <p>Connected ${connectedPages.length} page(s):</p>
          <ul>
            ${connectedPages.map(p => `<li>${p.name} (${p.id})</li>`).join('')}
          </ul>
          <p><a href="/">Back to Dashboard</a></p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth error:', error);
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  // ============================================
  // WEBHOOK ROUTES
  // ============================================

  // Webhook verification
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  });

  // Webhook message receiver
  app.post('/webhook', async (req, res) => {
    const body = req.body;
    
    if (body.object === 'instagram') {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];
      
      if (messaging) {
        const senderId = messaging.sender?.id;
        const pageId = entry.id; // Page ID that received the message
        const message = messaging.message;
        
        if (message && message.text) {
          console.log(`📨 [${pageId}] Received message from ${senderId}: ${message.text}`);
          
          // Process message with bot logic (async, don't wait)
          processIncomingMessage(pageId, senderId, message.text, userContextManager).catch(error => {
            console.error('Error processing message:', error);
          });
        }
      }
    }
    
    res.sendStatus(200);
  });

  // ============================================
  // MESSAGE PROCESSOR (برای Webhook)
  // ============================================

  async function processIncomingMessage(pageId, senderId, messageText, userContextManager) {
    // Get API client for this page
    const apiClient = pageManager.getAPIClient(pageId);
    if (!apiClient) {
      console.error(`❌ No API client found for page ${pageId}`);
      return;
    }

    // Get user info (username) from API
    const userInfo = await apiClient.getUserInfo(senderId);
    const username = userInfo?.username || senderId;
    
    // Get page settings
    const settings = pageSettingsManager.getSettings(pageId);
    
    // Check mode and process accordingly
    if (settings.mode === 'auto_reply') {
      // Try auto-reply first
      const autoReplyResult = await autoReplyManager.processMessage(
        pageId, 
        messageText, 
        apiClient, 
        senderId
      );
      
      if (autoReplyResult.success) {
        // Auto-reply sent successfully
        userContextManager.addMessage(username, 'assistant', autoReplyResult.reply.reply);
        return;
      }
      
      // No auto-reply matched, fallback to AI
      console.log(`⚠️ [${pageId}] No auto-reply matched, falling back to AI`);
    }
    
    // AI Mode or Auto-Reply fallback
    const context = userContextManager.getContext(username);
    userContextManager.addMessage(username, 'user', messageText);
    
    try {
      // Dynamic import to avoid circular dependency
      const mainModule = require('./main.js');
      const askGPT = mainModule.askGPT || (() => {
        console.error('askGPT function not found in main.js');
        return Promise.resolve({ responses: [{ message: 'Bot is processing...' }] });
      });

      // Use custom prompt if available
      const customPrompt = settings.aiPrompt || null;

      // Modify askGPT call to use custom prompt (you'll need to update askGPT function)
      const response = await askGPT(messageText, userContextManager, username, false, customPrompt);
      
      // Send responses
      if (response.responses && response.responses.length > 0) {
        for (const resp of response.responses) {
          // Send text message
          if (resp.message) {
            await apiClient.sendTextMessage(senderId, resp.message);
            userContextManager.addMessage(username, 'assistant', resp.message);
          }
          
          // Send product cards if needed
          if (resp.sendProductInfo && resp.product) {
            await apiClient.sendProductCard(senderId, resp.product);
          } else if (resp.sendProductInfo && resp.products && resp.products.length > 0) {
            await apiClient.sendMultipleProductCards(senderId, resp.products);
          }
        }
      }
    } catch (error) {
      console.error('Error processing message with OpenAI:', error);
      // Send error message to user
      await apiClient.sendTextMessage(senderId, 'متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.');
    }
  }

  // ============================================
  // API ROUTES
  // ============================================

  // Privacy Policy Page (English - Required for Meta App Review)
  app.get('/privacy', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Luxirana</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #E1306C;
      margin-bottom: 30px;
      font-size: 28px;
    }
    h2 {
      color: #262626;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 20px;
    }
    p {
      margin-bottom: 15px;
      text-align: left;
    }
    ul {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin-bottom: 10px;
    }
    .last-updated {
      color: #8e8e8e;
      font-size: 14px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: ${new Date().toLocaleDateString('en-US')}</p>
    
    <h2>1. Information We Collect</h2>
    <p>Luxirana Instagram Messenger Bot collects the following information to provide better services:</p>
    <ul>
      <li>Instagram username</li>
      <li>Sent and received messages</li>
      <li>Conversation dates and times</li>
      <li>Profile information (if accessible)</li>
    </ul>
    
    <h2>2. How We Use Information</h2>
    <p>Collected information is used solely for the following purposes:</p>
    <ul>
      <li>Providing personalized responses</li>
      <li>Improving service quality</li>
      <li>Sending relevant product information</li>
      <li>Managing conversations and records</li>
    </ul>
    
    <h2>3. Information Protection</h2>
    <p>We protect all your information using standard security methods. Your information is stored on secure servers and is not sold or transferred to any third parties.</p>
    
    <h2>4. Access to Information</h2>
    <p>You can request deletion of your information at any time by sending us a direct message.</p>
    
    <h2>5. Changes to This Policy</h2>
    <p>We reserve the right to change this privacy policy at any time. Changes will be published on this page.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions or concerns, you can contact us via direct message on Instagram.</p>
  </div>
</body>
</html>
    `);
  });

  // Terms of Service Page (English - Required for Meta App Review)
  app.get('/terms', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Luxirana</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #E1306C;
      margin-bottom: 30px;
      font-size: 28px;
    }
    h2 {
      color: #262626;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 20px;
    }
    p {
      margin-bottom: 15px;
      text-align: left;
    }
    ul {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin-bottom: 10px;
    }
    .last-updated {
      color: #8e8e8e;
      font-size: 14px;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Terms of Service</h1>
    <p class="last-updated">Last Updated: ${new Date().toLocaleDateString('en-US')}</p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By using the Luxirana Instagram Messenger Bot, you agree to these terms.</p>
    
    <h2>2. Use of Services</h2>
    <p>You agree to:</p>
    <ul>
      <li>Use the services legally and in accordance with applicable laws</li>
      <li>Refrain from sending offensive, illegal, or harmful content</li>
      <li>Not use the bot for unauthorized commercial or advertising purposes</li>
    </ul>
    
    <h2>3. Limitation of Liability</h2>
    <p>We make every effort to provide quality services, but we are not responsible for:</p>
    <ul>
      <li>Technical errors or temporary service interruptions</li>
      <li>Information provided by the bot is for guidance purposes only</li>
      <li>Product prices and availability may change</li>
    </ul>
    
    <h2>4. Intellectual Property</h2>
    <p>All bot content, including texts, logos, and designs, belongs to Luxirana and unauthorized use is prohibited.</p>
    
    <h2>5. Changes to Services</h2>
    <p>We reserve the right to change, suspend, or discontinue services at any time.</p>
    
    <h2>6. Service Termination</h2>
    <p>You may stop using the services at any time. We may also revoke your access if you violate these terms.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions, please contact us via direct message on Instagram.</p>
  </div>
</body>
</html>
    `);
  });

  // ============================================
  // PAGE MANAGEMENT API
  // ============================================

  // لیست Pages متصل شده
  app.get('/api/pages', (req, res) => {
    const pages = pageManager.getActivePages();
    // Add settings for each page
    const pagesWithSettings = pages.map(page => {
      const settings = pageSettingsManager.getSettings(page.pageId);
      return {
        ...page,
        mode: settings.mode,
        autoRepliesCount: settings.autoReplies.length,
        hasCustomPrompt: !!settings.aiPrompt
      };
    });
    res.json({ success: true, pages: pagesWithSettings });
  });

  // دریافت اطلاعات یک Page
  app.get('/api/pages/:pageId', (req, res) => {
    const { pageId } = req.params;
    const page = pageManager.pages[pageId];
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    const settings = pageSettingsManager.getSettings(pageId);
    res.json({ success: true, page: { ...page, settings } });
  });

  // حذف/غیرفعال کردن یک Page
  app.delete('/api/pages/:pageId', (req, res) => {
    const { pageId } = req.params;
    pageManager.deactivatePage(pageId);
    res.json({ success: true, message: 'Page deactivated' });
  });

  // فعال کردن یک Page
  app.post('/api/pages/:pageId/activate', (req, res) => {
    const { pageId } = req.params;
    pageManager.activatePage(pageId);
    res.json({ success: true, message: 'Page activated' });
  });

  // ============================================
  // PAGE SETTINGS API
  // ============================================

  // دریافت تنظیمات یک Page
  app.get('/api/pages/:pageId/settings', (req, res) => {
    const { pageId } = req.params;
    const settings = pageSettingsManager.getSettings(pageId);
    res.json({ success: true, settings });
  });

  // تغییر حالت (AI یا Auto-Reply)
  app.post('/api/pages/:pageId/mode', (req, res) => {
    const { pageId } = req.params;
    const { mode } = req.body;
    
    if (!mode || (mode !== 'ai' && mode !== 'auto_reply')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mode must be "ai" or "auto_reply"' 
      });
    }
    
    try {
      const settings = pageSettingsManager.setMode(pageId, mode);
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // تنظیم پرامپت سفارشی برای AI Mode
  app.post('/api/pages/:pageId/ai-prompt', (req, res) => {
    const { pageId } = req.params;
    const { prompt } = req.body;
    
    if (prompt === undefined || prompt === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    try {
      const settings = pageSettingsManager.setAIPrompt(pageId, prompt);
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // AUTO-REPLY API
  // ============================================

  // دریافت لیست پاسخ‌های خودکار
  app.get('/api/pages/:pageId/auto-replies', (req, res) => {
    const { pageId } = req.params;
    const replies = autoReplyManager.getAutoReplies(pageId);
    res.json({ success: true, replies });
  });

  // اضافه کردن پاسخ خودکار
  app.post('/api/pages/:pageId/auto-replies', (req, res) => {
    const { pageId } = req.params;
    const { keyword, reply, hashtags } = req.body;
    
    if (!keyword || !reply) {
      return res.status(400).json({ 
        success: false, 
        error: 'Keyword and reply are required' 
      });
    }
    
    try {
      const settings = autoReplyManager.addAutoReply(
        pageId, 
        keyword, 
        reply, 
        hashtags || []
      );
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ویرایش پاسخ خودکار
  app.put('/api/pages/:pageId/auto-replies/:replyId', (req, res) => {
    const { pageId, replyId } = req.params;
    const { keyword, reply, hashtags } = req.body;
    
    if (!keyword || !reply) {
      return res.status(400).json({ 
        success: false, 
        error: 'Keyword and reply are required' 
      });
    }
    
    try {
      const settings = autoReplyManager.updateAutoReply(
        pageId, 
        replyId, 
        keyword, 
        reply, 
        hashtags || []
      );
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // حذف پاسخ خودکار
  app.delete('/api/pages/:pageId/auto-replies/:replyId', (req, res) => {
    const { pageId, replyId } = req.params;
    
    try {
      const settings = autoReplyManager.removeAutoReply(pageId, replyId);
      res.json({ success: true, settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // STATISTICS API
  // ============================================

  // آمار کلی
  app.get('/api/stats/overview', (req, res) => {
    const { messagesStore } = getMessagesStore();
    const pages = pageManager.getActivePages();
    const allSettings = pageSettingsManager.getAllSettings();
    
    let totalAutoReplies = 0;
    let totalAIPages = 0;
    let totalAutoReplyPages = 0;
    
    pages.forEach(page => {
      const settings = allSettings[page.pageId] || pageSettingsManager.getSettings(page.pageId);
      totalAutoReplies += settings.autoReplies.length;
      if (settings.mode === 'ai') totalAIPages++;
      if (settings.mode === 'auto_reply') totalAutoReplyPages++;
    });
    
    let totalMessages = 0;
    let todayMessages = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const conversationId in messagesStore) {
      const messages = messagesStore[conversationId];
      totalMessages += messages.length;
      messages.forEach(msg => {
        const msgDate = new Date(msg.createdAt);
        if (msgDate >= today) todayMessages++;
      });
    }
    
    res.json({
      success: true,
      stats: {
        totalPages: pages.length,
        activePages: pages.filter(p => p.active).length,
        totalMessages,
        todayMessages,
        totalAutoReplies,
        aiPages: totalAIPages,
        autoReplyPages: totalAutoReplyPages,
        totalConversations: Object.keys(messagesStore).length
      }
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    const { messagesStore } = getMessagesStore();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bot: botStatus,
      conversations: Object.keys(messagesStore).length,
      messageClients: messageSSEClients.size,
      logClients: logSSEClients.size,
      connectedPages: pageManager.getActivePages().length
    });
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    const { messagesStore } = getMessagesStore();
    let totalReceived = 0;
    let totalSent = 0;
    let todayReceived = 0;
    let todaySent = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const conversationId in messagesStore) {
      const messages = messagesStore[conversationId];
      
      messages.forEach(msg => {
        const msgDate = new Date(msg.createdAt);
        
        if (msg.from === 'user') {
          totalReceived++;
          if (msgDate >= today) todayReceived++;
        } else {
          totalSent++;
          if (msgDate >= today) todaySent++;
        }
      });
    }

    res.json({
      totalConversations: Object.keys(messagesStore).length,
      totalReceived,
      totalSent,
      todayReceived,
      todaySent,
      botStatus: botStatus
    });
  });

  // List all conversations
  app.get('/api/conversations', (req, res) => {
    const { messagesStore, conversationsMeta } = getMessagesStore();
    const conversations = [];

    for (const conversationId in messagesStore) {
      const messages = messagesStore[conversationId];
      const meta = conversationsMeta[conversationId] || {};
      
      if (messages.length === 0) continue;

      let inboundCount = 0;
      let outboundCount = 0;
      let lastMessageAt = null;
      let lastMessage = null;
      let hasUnread = false;

      messages.forEach(msg => {
        if (msg.from === 'user') {
          inboundCount++;
        } else {
          outboundCount++;
        }
        
        if (!lastMessageAt || new Date(msg.createdAt) > new Date(lastMessageAt)) {
          lastMessageAt = msg.createdAt;
          lastMessage = msg.text;
        }
      });

      conversations.push({
        id: conversationId,
        userId: conversationId,
        username: meta.username || conversationId,
        name: meta.name || null,
        bio: meta.bio || null,
        lastMessage: lastMessage || '',
        lastMessageAt: lastMessageAt || new Date().toISOString(),
        inboundCount,
        outboundCount,
        totalMessages: messages.length,
        hasUnread: hasUnread,
        firstSeen: meta.firstSeen || null,
        lastSeen: meta.lastSeen || null
      });
    }

    // Sort by lastMessageAt descending
    conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json(conversations);
  });

  // Get single conversation details
  app.get('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    const conversationId = id;
    const { messagesStore, conversationsMeta } = getMessagesStore();

    const messages = messagesStore[conversationId] || [];
    const meta = conversationsMeta[conversationId] || {};

    if (messages.length === 0 && !meta.username) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    let inboundCount = 0;
    let outboundCount = 0;

    messages.forEach(msg => {
      if (msg.from === 'user') {
        inboundCount++;
      } else {
        outboundCount++;
      }
    });

    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.json({
      id: conversationId,
      username: meta.username || conversationId,
      name: meta.name || null,
      bio: meta.bio || null,
      messages: sortedMessages,
      inboundCount,
      outboundCount,
      totalMessages: messages.length,
      firstSeen: meta.firstSeen || null,
      lastSeen: meta.lastSeen || null
    });
  });

  // Get messages for a conversation
  app.get('/api/messages', (req, res) => {
    const { conversationId } = req.query;
    const { messagesStore } = getMessagesStore();

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const messages = messagesStore[conversationId] || [];
    
    // Return messages in ascending order by createdAt
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.json(sortedMessages);
  });

  // Receive message events from bot
  app.post('/api/events/message', (req, res) => {
    const { conversationId, id, from, text, createdAt, username } = req.body;

    // Validate required fields
    if (!conversationId || !id || !from || !text || !createdAt) {
      return res.status(400).json({
        error: 'Missing required fields: conversationId, id, from, text, createdAt'
      });
    }

    // Validate 'from' field
    if (!['user', 'bot'].includes(from)) {
      return res.status(400).json({
        error: 'Invalid "from" value. Must be "user" or "bot"'
      });
    }

    // Create new message object
    const newMessage = {
      id,
      conversationId,
      from,
      text,
      createdAt: new Date(createdAt).toISOString(),
      timestamp: new Date(createdAt).getTime()
    };

    // Broadcast to all connected SSE clients
    broadcastToMessageSSEClients(newMessage);

    // Send HTTP response
    return res.status(200).json({ ok: true });
  });

  // Receive log events
  app.post('/api/events/log', (req, res) => {
    const { level, message, source } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const logEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      level: level || 'info',
      message: String(message),
      source: source || 'bot',
      timestamp: new Date().toISOString()
    };

    logStore.push(logEntry);
    if (logStore.length > 500) {
      logStore.shift(); // Remove oldest log, keep last 500
    }

    // Broadcast to log SSE clients
    broadcastToLogSSEClients(logEntry);

    res.status(200).json({ ok: true });
  });

  // Bot status
  app.get('/api/bot/status', (req, res) => {
    res.json({ status: botStatus });
  });

  // Pause bot (sets flag, bot should check this)
  app.post('/api/bot/pause', (req, res) => {
    botStatus.paused = true;
    saveBotStatus();
    res.json({ ok: true, status: botStatus });
  });

  // Resume bot
  app.post('/api/bot/resume', (req, res) => {
    botStatus.paused = false;
    saveBotStatus();
    res.json({ ok: true, status: botStatus });
  });

  // Stop bot
  app.post('/api/bot/stop', (req, res) => {
    botStatus.running = false;
    botStatus.paused = true;
    saveBotStatus();
    res.json({ ok: true, status: botStatus, message: 'Bot stopped. Restart required to resume.' });
  });

  // ============================================
  // SETTINGS ENDPOINTS
  // ============================================

  // Get system prompt
  app.get('/api/settings/prompt', (req, res) => {
    try {
      let prompt = '';
      if (fs.existsSync(PROMPT_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, 'utf-8'));
        prompt = config.prompt || config.systemPrompt || '';
      }
      
      // Fallback to reading from SYSTEM_PROMPT.md
      const promptMdPath = path.join(__dirname, 'SYSTEM_PROMPT.md');
      if (!prompt && fs.existsSync(promptMdPath)) {
        const mdContent = fs.readFileSync(promptMdPath, 'utf-8');
        const lines = mdContent.split('\n');
        const startIdx = lines.findIndex(line => line.includes('Seylane Intelligent Personality'));
        if (startIdx !== -1) {
          prompt = lines.slice(startIdx).join('\n').replace(/^#.*\n/, '').trim();
        }
      }
      
      res.json({ prompt });
    } catch (err) {
      console.error('Error reading prompt:', err);
      res.status(500).json({ error: 'Failed to read prompt' });
    }
  });

  // Update system prompt
  app.post('/api/settings/prompt', (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }
      
      // Save to config file
      let config = {};
      if (fs.existsSync(PROMPT_CONFIG_PATH)) {
        config = JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, 'utf-8'));
      }
      
      config.prompt = prompt;
      config.systemPrompt = prompt; // For compatibility
      config.updatedAt = new Date().toISOString();
      
      fs.writeFileSync(PROMPT_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      
      res.json({ success: true, message: 'Prompt updated. Bot restart required for changes to take effect.' });
    } catch (err) {
      console.error('Error saving prompt:', err);
      res.status(500).json({ error: 'Failed to save prompt' });
    }
  });

  // Get GPT model
  app.get('/api/settings/model', (req, res) => {
    try {
      let model = 'gpt-5.1';
      if (fs.existsSync(PROMPT_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, 'utf-8'));
        model = config.model || model;
      }
      
      res.json({ model });
    } catch (err) {
      console.error('Error reading model:', err);
      res.status(500).json({ error: 'Failed to read model' });
    }
  });

  // Update GPT model
  app.post('/api/settings/model', (req, res) => {
    try {
      const { model } = req.body;
      
      if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: 'Model is required' });
      }
      
      // Load existing config or create new
      let config = {};
      if (fs.existsSync(PROMPT_CONFIG_PATH)) {
        config = JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, 'utf-8'));
      }
      
      // Update model
      config.model = model;
      config.modelUpdatedAt = new Date().toISOString();
      
      fs.writeFileSync(PROMPT_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      
      res.json({ success: true, message: 'Model updated. Bot restart required for changes to take effect.' });
    } catch (err) {
      console.error('Error saving model:', err);
      res.status(500).json({ error: 'Failed to save model' });
    }
  });

  // ============================================
  // SSE ENDPOINTS
  // ============================================

  // Live messages SSE
  app.get('/api/sse/live-messages', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Register client
    messageSSEClients.add(res);
    console.log(`✅ Message SSE client connected. Total: ${messageSSEClients.size}`);

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) {
        res.write(`:heartbeat\n\n`);
      }
    }, 25000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      messageSSEClients.delete(res);
      console.log(`❌ Message SSE client disconnected. Total: ${messageSSEClients.size}`);
      if (!res.writableEnded) res.end();
    });

    res.on('error', () => {
      clearInterval(heartbeat);
      messageSSEClients.delete(res);
    });
  });

  // Logs SSE
  app.get('/api/sse/logs', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send existing logs
    logStore.slice(-100).forEach(log => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    // Register client
    logSSEClients.add(res);
    console.log(`✅ Log SSE client connected. Total: ${logSSEClients.size}`);

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (!res.destroyed && !res.writableEnded) {
        res.write(`:heartbeat\n\n`);
      }
    }, 25000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      logSSEClients.delete(res);
      console.log(`❌ Log SSE client disconnected. Total: ${logSSEClients.size}`);
      if (!res.writableEnded) res.end();
    });

    res.on('error', () => {
      clearInterval(heartbeat);
      logSSEClients.delete(res);
    });
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function broadcastToMessageSSEClients(message) {
    const eventData = {
      type: 'message',
      message: message
    };

    const clientsToRemove = [];

    messageSSEClients.forEach(client => {
      if (!client.destroyed && !client.writableEnded) {
        try {
          client.write(`event: message\n`);
          client.write(`data: ${JSON.stringify(eventData)}\n\n`);
        } catch (error) {
          clientsToRemove.push(client);
        }
      } else {
        clientsToRemove.push(client);
      }
    });

    clientsToRemove.forEach(client => messageSSEClients.delete(client));
  }

  function broadcastToLogSSEClients(logEntry) {
    const clientsToRemove = [];

    logSSEClients.forEach(client => {
      if (!client.destroyed && !client.writableEnded) {
        try {
          client.write(`event: log\n`);
          client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        } catch (error) {
          clientsToRemove.push(client);
        }
      } else {
        clientsToRemove.push(client);
      }
    });

    clientsToRemove.forEach(client => logSSEClients.delete(client));
  }

  // ============================================
  // START SERVER
  // ============================================
  try {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Dashboard API Server running on http://0.0.0.0:${PORT}`);
      console.log(`\n📊 Available Endpoints:`);
      console.log(`   GET  /api/health - Health check`);
      console.log(`   GET  /api/stats - Statistics`);
      console.log(`   GET  /api/conversations - List conversations`);
      console.log(`   GET  /api/conversations/:id - Get conversation details`);
      console.log(`   GET  /api/messages?conversationId=xxx - Get messages`);
      console.log(`   POST /api/events/message - Receive message events`);
      console.log(`   POST /api/events/log - Receive log events`);
      console.log(`   GET  /api/sse/live-messages - Live messages (SSE)`);
      console.log(`   GET  /api/sse/logs - Live logs (SSE)`);
      console.log(`   GET  /api/bot/status - Bot status`);
      console.log(`   POST /api/bot/pause - Pause bot`);
      console.log(`   POST /api/bot/resume - Resume bot`);
      console.log(`   POST /api/bot/stop - Stop bot`);
      console.log(`   GET  /api/settings/prompt - Get system prompt`);
      console.log(`   POST /api/settings/prompt - Update system prompt`);
      console.log(`   GET  /api/settings/model - Get GPT model`);
      console.log(`   POST /api/settings/model - Update GPT model\n`);
    });

    // Handle server errors gracefully (async errors)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Please stop the process using port ${PORT} or set API_PORT to a different port.`);
        console.error(`   To find what's using the port: lsof -ti:${PORT}`);
        console.error(`   To kill it: kill -9 $(lsof -ti:${PORT})\n`);
        server = null; // Mark server as failed
      } else {
        console.error(`\n❌ API Server error: ${err.message}\n`);
        server = null; // Mark server as failed
      }
    });
  } catch (err) {
    // Handle synchronous errors (shouldn't happen with listen, but just in case)
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Please stop the process using port ${PORT} or set API_PORT to a different port.\n`);
      server = null;
    } else {
      console.error(`\n❌ Failed to start API server: ${err.message}\n`);
      server = null;
    }
  }

  // Export functions for external use (only if server started successfully)
  if (!server) {
    return null; // Server didn't start, return null so bot can continue
  }
  
  return {
    broadcastMessage: broadcastToMessageSSEClients,
    broadcastLog: broadcastToLogSSEClients,
    getBotStatus: () => botStatus,
    setBotStatus: (status) => { botStatus = { ...botStatus, ...status }; saveBotStatus(); },
    server: server // Expose server for cleanup if needed
  };
}

module.exports = { startAPIServer };

