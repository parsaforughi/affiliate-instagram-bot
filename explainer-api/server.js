const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

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

// Event emitter for real-time message broadcasts
const messageEmitter = new EventEmitter();

// Track SSE clients for /live-messages
const sseClients = new Set();

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
// ENDPOINT 4: GET /logs (SSE)
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
// ENDPOINT 5: POST /events/message
// ============================================
app.post('/events/message', (req, res) => {
  const { conversationId, id, from, text, createdAt } = req.body;

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

  // Validate ISO timestamp
  if (isNaN(new Date(createdAt).getTime())) {
    return res.status(400).json({
      error: 'Invalid "createdAt". Must be a valid ISO timestamp'
    });
  }

  try {
    // Create new message object
    const newMessage = {
      id,
      conversationId,
      from,
      text,
      createdAt
    };

    // Initialize conversation if it doesn't exist
    if (!messagesStore[conversationId]) {
      messagesStore[conversationId] = [];
    }

    // Append message to store
    messagesStore[conversationId].push(newMessage);

    // Broadcast to all connected SSE clients
    const eventData = {
      type: 'message',
      message: newMessage
    };

    sseClients.forEach(client => {
      client.write(`event: message\n`);
      client.write(`data: ${JSON.stringify(eventData)}\n\n`);
    });

    console.log(`📨 Message received from ${from} in ${conversationId}`);

    // Return success response
    res.json({ ok: true });

  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ENDPOINT 6: GET /live-messages (SSE)
// ============================================
app.get('/live-messages', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection confirmation
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Register this client
  sseClients.add(res);
  console.log(`🔗 SSE client connected. Total clients: ${sseClients.size}`);

  // Handle client disconnection
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`🔌 SSE client disconnected. Total clients: ${sseClients.size}`);
    res.end();
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    conversations: Object.keys(messagesStore).length,
    liveClients: sseClients.size
  });
});

// ============================================
// DEBUG: Print all registered routes
// ============================================
function printRegisteredRoutes() {
  console.log(`\n📋 FULL REGISTERED ROUTES:\n`);
  
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Standard Express route
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      routes.push({ path, methods });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // Router middleware (not typically used here, but included for completeness)
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
          routes.push({ path, methods });
        }
      });
    }
  });

  // Sort by path for readability
  routes.sort((a, b) => a.path.localeCompare(b.path));
  
  routes.forEach(({ path, methods }) => {
    methods.forEach(method => {
      console.log(`   ${method.padEnd(6)} ${path}`);
    });
  });

  console.log(`\n✅ POST /events/message - Exact path registered as: "/events/message"`);
  console.log(`✅ GET  /live-messages - Exact path registered as: "/live-messages"\n`);
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Seylane Explainer API running on http://0.0.0.0:${PORT}`);
  console.log(`\n📊 Available Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /stats - Message statistics`);
  console.log(`   GET  /conversations - List all conversations`);
  console.log(`   GET  /messages?conversationId=ID - Get messages for a conversation`);
  console.log(`   GET  /logs - Real-time logs (SSE)`);
  console.log(`   POST /events/message - Receive new message events`);
  console.log(`   GET  /live-messages - Real-time message streaming (SSE)`);
  
  // Print all routes
  printRegisteredRoutes();

  // DEBUG: Print ALL registered routes at runtime (user-requested)
  console.log(`\n🔍 DEBUG: ALL ROUTES AT RUNTIME:\n`);
  console.log(
    app._router.stack
      .filter(r => r.route)
      .map(r => ({
        method: Object.keys(r.route.methods)[0].toUpperCase(),
        path: r.route.path
      }))
  );
  console.log(`\n`);
});
