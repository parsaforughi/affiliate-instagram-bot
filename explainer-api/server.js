const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Path to bot data
const USER_CONTEXTS_PATH = path.join(
  __dirname,
  '../explainer20-1/explainer/WorldlyFineDiscussion/user_contexts.json'
);

// In-memory message store (will be populated from user_contexts)
let messagesStore = {};

// Log store for SSE
let logStore = [];

// Load data from bot's user_contexts.json
function loadBotData() {
  try {
    if (fs.existsSync(USER_CONTEXTS_PATH)) {
      const rawData = fs.readFileSync(USER_CONTEXTS_PATH, 'utf-8');
      const userContexts = JSON.parse(rawData);

      // Convert user contexts to messages format
      for (const [userId, userContext] of Object.entries(userContexts)) {
        const conversationId = userId; // Use username as conversation ID
        messagesStore[conversationId] = [];

        if (userContext.messageHistory && Array.isArray(userContext.messageHistory)) {
          userContext.messageHistory.forEach((msg, index) => {
            messagesStore[conversationId].push({
              id: `${conversationId}_${index}`,
              conversationId: conversationId,
              from: msg.role === 'user' ? 'user' : 'bot',
              text: msg.content,
              createdAt: new Date(msg.timestamp).toISOString()
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

// Initialize data on startup
loadBotData();

// ============================================
// ENDPOINT 1: GET /stats
// ============================================
app.get('/stats', (req, res) => {
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
    totalReceived,
    totalSent,
    todayReceived,
    todaySent
  });
});

// ============================================
// ENDPOINT 2: GET /conversations
// ============================================
app.get('/conversations', (req, res) => {
  const conversations = [];

  for (const conversationId in messagesStore) {
    const messages = messagesStore[conversationId];
    
    let inboundCount = 0;
    let outboundCount = 0;
    let lastMessageAt = null;

    messages.forEach(msg => {
      if (msg.from === 'user') {
        inboundCount++;
      } else {
        outboundCount++;
      }
      
      if (!lastMessageAt || new Date(msg.createdAt) > new Date(lastMessageAt)) {
        lastMessageAt = msg.createdAt;
      }
    });

    if (messages.length > 0) {
      conversations.push({
        id: conversationId,
        userId: conversationId,
        username: conversationId,
        lastMessageAt: lastMessageAt || new Date().toISOString(),
        inboundCount,
        outboundCount
      });
    }
  }

  // Sort by lastMessageAt descending
  conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  res.json(conversations);
});

// ============================================
// ENDPOINT 3: GET /messages?conversationId=ID
// ============================================
app.get('/messages', (req, res) => {
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

// ============================================
// ENDPOINT 4: GET /logs (SSE - Optional)
// ============================================
app.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send existing logs
  logStore.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  // Keep connection open and send new logs every 10 seconds
  const interval = setInterval(() => {
    const newLog = {
      id: `log_${Date.now()}`,
      source: 'explainer',
      message: `Heartbeat: ${new Date().toISOString()}`,
      timestamp: new Date().toISOString()
    };
    
    logStore.push(newLog);
    if (logStore.length > 100) logStore.shift(); // Keep last 100 logs
    
    res.write(`data: ${JSON.stringify(newLog)}\n\n`);
  }, 10000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    conversations: Object.keys(messagesStore).length
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Seylane Explainer API running on http://0.0.0.0:${PORT}`);
  console.log(`\n📊 Available Endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /stats - Message statistics`);
  console.log(`   GET /conversations - List all conversations`);
  console.log(`   GET /messages?conversationId=ID - Get messages for a conversation`);
  console.log(`   GET /logs - Real-time logs (SSE)\n`);
});
