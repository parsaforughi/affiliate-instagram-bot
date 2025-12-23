# Dashboard API Server

Backend API server for the real-time bot dashboard.

## Setup

```bash
npm install
npm start
```

The server runs on `http://localhost:3001` by default.

Set `API_PORT` environment variable to change the port.

## Data Sources

The API reads from:
- `../explainer20-1/explainer/WorldlyFineDiscussion/user_contexts.json` - User conversations and message history
- `../explainer20-1/explainer/WorldlyFineDiscussion/message_cache.json` - Message cache (for deduplication)

The API watches `user_contexts.json` and reloads data every 2 seconds when it changes.

## Endpoints

### REST APIs

- `GET /api/health` - Health check and status
- `GET /api/stats` - Statistics (conversations, messages, bot status)
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation details with full message history
- `GET /api/messages?conversationId=xxx` - Get messages for a conversation
- `POST /api/events/message` - Receive message events from bot
- `POST /api/events/log` - Receive log events from bot
- `GET /api/bot/status` - Get bot status
- `POST /api/bot/pause` - Pause bot (sets flag in `.bot-status.json`)
- `POST /api/bot/resume` - Resume bot

### SSE (Server-Sent Events)

- `GET /api/sse/live-messages` - Real-time message stream
- `GET /api/sse/logs` - Real-time log stream

## Integration with Bot

The bot sends events via HTTP POST to:
- `/api/events/message` - When a message is sent or received
- `/api/events/log` - For log entries

These events are then broadcast to connected SSE clients.

The bot integration is non-intrusive - if the API is unavailable, the bot continues to work normally (events fail silently).

