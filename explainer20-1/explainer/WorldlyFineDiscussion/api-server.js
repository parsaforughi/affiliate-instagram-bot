// Integrated API Server for Affiliate Bot
// This server runs together with the bot and shares the same data

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

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

  // Health check
  app.get('/api/health', (req, res) => {
    const { messagesStore } = getMessagesStore();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bot: botStatus,
      conversations: Object.keys(messagesStore).length,
      messageClients: messageSSEClients.size,
      logClients: logSSEClients.size
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

