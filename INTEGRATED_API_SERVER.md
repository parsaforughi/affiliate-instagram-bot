# Integrated API Server

## Overview

The API server is now **integrated directly into the bot** (`main.js`). They run together in the same process and share the same data in real-time.

## Benefits

✅ **Single Process**: Bot and API server run together - no separate process needed  
✅ **Real-time Data**: API server directly accesses `UserContextManager` - no file polling  
✅ **Faster**: Direct memory access instead of HTTP requests  
✅ **Simpler**: No need to run separate `explainer-api` server  
✅ **Local & Production**: Works the same way locally and in production  

## How It Works

1. When the bot starts (`main.js`), it creates:
   - `UserContextManager` instance
   - `MessageCache` instance
   - `PerformanceMonitor` instance

2. The bot then starts the integrated API server:
   - Passes `UserContextManager` and `MessageCache` to the API server
   - API server reads data directly from these instances (real-time, no file polling)
   - API server runs on port 3001 (configurable via `API_PORT` env var)

3. Dashboard events (`dashboard-events.js`) use the integrated server:
   - When available, uses direct broadcast functions (faster)
   - Falls back to HTTP requests if integrated server not available

## Files Changed

- ✅ `api-server.js` (NEW) - Integrated API server module
- ✅ `main.js` - Starts API server when bot starts
- ✅ `dashboard-events.js` - Uses integrated server when available
- ✅ `package.json` - Added `express` and `cors` dependencies

## Running the Bot

```bash
cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
npm install  # Install express and cors if not already installed
npm start    # Or npm run dev for auto-restart
```

The bot will:
1. Start the Instagram automation
2. Start the API server on port 3001
3. Both run in the same process

## API Endpoints

All endpoints are available at `http://localhost:3001/api/...`:

- `GET /api/health` - Health check
- `GET /api/stats` - Statistics
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/messages?conversationId=xxx` - Get messages
- `POST /api/events/message` - Receive message events
- `POST /api/events/log` - Receive log events
- `GET /api/sse/live-messages` - Live messages (SSE)
- `GET /api/sse/logs` - Live logs (SSE)
- `GET /api/bot/status` - Bot status
- `POST /api/bot/pause` - Pause bot
- `POST /api/bot/resume` - Resume bot
- `POST /api/bot/stop` - Stop bot
- `GET /api/settings/prompt` - Get system prompt
- `POST /api/settings/prompt` - Update system prompt
- `GET /api/settings/model` - Get GPT model
- `POST /api/settings/model` - Update GPT model

## Bot Control

The bot checks the pause/stop status in its main loop:

- **Paused**: Bot waits in loop, doesn't process messages
- **Stopped**: Bot exits gracefully
- **Running**: Bot processes messages normally

## Dashboard Integration

The MastermindOSDashboard can connect to the integrated API server:

- **Local**: `http://localhost:3001`
- **Production**: Set `AFFILIATE_BOT_API_URL` environment variable

The dashboard's proxy routes in `server/routes.ts` will forward requests to the integrated API server.

## Environment Variables

- `API_PORT` - Port for API server (default: 3001)
- `DASHBOARD_API_URL` - Fallback URL for dashboard events (default: http://localhost:3001)

## Notes

- The old `explainer-api/server.js` is still available but not needed when using the integrated server
- Both approaches work, but integrated is recommended for simplicity
- Data is shared in real-time - no file polling needed
- All bot messages and logs are automatically broadcast to connected dashboard clients

