const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.API_PORT || 3001;
const BOT_STATUS_FILE = path.join(__dirname, '.bot-status.json');

// Paths to bot data
const USER_CONTEXTS_PATH = path.join(
  __dirname,
  '../explainer20-1/explainer/WorldlyFineDiscussion/user_contexts.json'
);
const MESSAGE_CACHE_PATH = path.join(
  __dirname,
  '../explainer20-1/explainer/WorldlyFineDiscussion/message_cache.json'
);
const PROMPT_CONFIG_PATH = path.join(
  __dirname,
  '../explainer20-1/explainer/WorldlyFineDiscussion/prompt_config.json'
);
const MAIN_JS_PATH = path.join(
  __dirname,
  '../explainer20-1/explainer/WorldlyFineDiscussion/main.js'
);

// In-memory stores
let messagesStore = {};
let conversationsMeta = {};
let logStore = [];
let botStatus = { running: true, paused: false };

// Event emitters
const messageEmitter = new EventEmitter();
const logEmitter = new EventEmitter();

// Track SSE clients
const messageSSEClients = new Set();
const logSSEClients = new Set();

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

// Load data from bot's user_contexts.json
function loadBotData() {
  try {
    if (fs.existsSync(USER_CONTEXTS_PATH)) {
      const rawData = fs.readFileSync(USER_CONTEXTS_PATH, 'utf-8');
      const userContexts = JSON.parse(rawData);

      messagesStore = {};
      conversationsMeta = {};

      for (const [userId, userContext] of Object.entries(userContexts)) {
        const conversationId = userId;
        messagesStore[conversationId] = [];
        conversationsMeta[conversationId] = {
          username: userId,
          bio: userContext.bio || null,
          name: userContext.name || null,
          firstSeen: userContext.firstSeen || null,
          lastSeen: userContext.lastSeen || null,
        };

        if (userContext.messageHistory && Array.isArray(userContext.messageHistory)) {
          userContext.messageHistory.forEach((msg, index) => {
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

      console.log(`✅ Loaded ${Object.keys(messagesStore).length} conversations`);
    } else {
      console.log('⚠️  user_contexts.json not found at', USER_CONTEXTS_PATH);
    }
  } catch (error) {
    console.error('❌ Error loading bot data:', error.message);
  }
}

// Initialize on startup
loadBotStatus();
loadBotData();

// Watch user_contexts.json for changes (poll every 2 seconds)
let lastFileTime = 0;
setInterval(() => {
  try {
    if (fs.existsSync(USER_CONTEXTS_PATH)) {
      const stats = fs.statSync(USER_CONTEXTS_PATH);
      if (stats.mtimeMs > lastFileTime) {
        lastFileTime = stats.mtimeMs;
        loadBotData();
      }
    }
  } catch (err) {
    // Silently handle errors
  }
}, 2000);

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
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

  // Initialize conversation if it doesn't exist
  if (!messagesStore[conversationId]) {
    messagesStore[conversationId] = [];
  }

  // Update metadata if username provided
  if (username && !conversationsMeta[conversationId]) {
    conversationsMeta[conversationId] = { username };
  }

  // Append message to store (avoid duplicates by checking id)
  const exists = messagesStore[conversationId].some(m => m.id === id);
  if (!exists) {
    messagesStore[conversationId].push(newMessage);
  }

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
    // Read prompt from config file if exists, otherwise from SYSTEM_PROMPT.md
    let prompt = '';
    if (fs.existsSync(PROMPT_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, 'utf-8'));
      prompt = config.systemPrompt || '';
    }
    
    // Fallback to reading from SYSTEM_PROMPT.md
    const promptMdPath = path.join(__dirname, '../explainer20-1/explainer/WorldlyFineDiscussion/SYSTEM_PROMPT.md');
    if (!prompt && fs.existsSync(promptMdPath)) {
      const mdContent = fs.readFileSync(promptMdPath, 'utf-8');
      // Extract prompt content (skip header)
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
    const config = {
      systemPrompt: prompt,
      updatedAt: new Date().toISOString()
    };
    
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
    // Read model from config file if exists, otherwise default
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
app.listen(PORT, '0.0.0.0', () => {
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
