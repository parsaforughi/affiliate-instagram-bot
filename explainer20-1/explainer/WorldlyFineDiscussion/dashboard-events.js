// Lightweight event emitter for dashboard
// This module sends events to the dashboard API without interfering with bot logic
// When the integrated API server is available, it uses direct broadcast functions
// Otherwise, it falls back to HTTP requests

const fetch = require('node-fetch');

const API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:3001';

// These will be set by main.js if integrated API server is available
let integratedServer = null;

// Set the integrated server instance (called from main.js)
function setIntegratedServer(server) {
  integratedServer = server;
}

// Send message event to dashboard API
async function emitMessage(conversationId, messageId, from, text, username = null) {
  // Try integrated server first (direct broadcast, faster)
  if (integratedServer && integratedServer.broadcastMessage) {
    try {
      integratedServer.broadcastMessage({
        id: messageId,
        conversationId,
        from,
        text,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });
      return; // Success, no need for HTTP fallback
    } catch (err) {
      // Fall through to HTTP fallback
    }
  }

  // HTTP fallback (for external dashboards or when integrated server not available)
  try {
    await fetch(`${API_URL}/api/events/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        id: messageId,
        from,
        text,
        createdAt: new Date().toISOString(),
        username
      })
    });
  } catch (err) {
    // Silently fail - dashboard is optional
  }
}

// Send log event to dashboard API
async function emitLog(level, message, source = 'bot') {
  // Try integrated server first (direct broadcast, faster)
  if (integratedServer && integratedServer.broadcastLog) {
    try {
      integratedServer.broadcastLog({
        id: `log_${Date.now()}_${Math.random()}`,
        level,
        message: String(message),
        source,
        timestamp: new Date().toISOString()
      });
      return; // Success, no need for HTTP fallback
    } catch (err) {
      // Fall through to HTTP fallback
    }
  }

  // HTTP fallback (for external dashboards or when integrated server not available)
  try {
    await fetch(`${API_URL}/api/events/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        source
      })
    });
  } catch (err) {
    // Silently fail - dashboard is optional
  }
}

module.exports = { emitMessage, emitLog, setIntegratedServer };

