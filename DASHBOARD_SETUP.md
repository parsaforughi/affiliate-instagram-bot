# Dashboard Setup Guide

## Overview

The real-time admin dashboard consists of two parts:
1. **API Server** (`explainer-api/`) - Backend API with SSE endpoints
2. **Dashboard Frontend** (`dashboard/`) - Next.js web interface

## Quick Start

### 1. Start the API Server

```bash
cd explainer-api
npm install
npm start
```

The API server will run on `http://localhost:3001`

### 2. Start the Dashboard

In a new terminal:

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### 3. Start the Bot

The bot will automatically send events to the dashboard API when it runs.

```bash
cd explainer20-1/explainer/WorldlyFineDiscussion
npm start
```

## API Endpoints

The API server provides:

- `GET /api/health` - Health check
- `GET /api/stats` - Statistics
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/messages?conversationId=xxx` - Get messages
- `POST /api/events/message` - Receive message events (used by bot)
- `POST /api/events/log` - Receive log events (used by bot)
- `GET /api/sse/live-messages` - SSE stream for live messages
- `GET /api/sse/logs` - SSE stream for logs
- `GET /api/bot/status` - Bot status
- `POST /api/bot/pause` - Pause bot
- `POST /api/bot/resume` - Resume bot

## Dashboard Pages

- `/dashboard` - Overview with stats
- `/dashboard/conversations` - List of all conversations
- `/dashboard/conversations/[id]` - Full chat history for a conversation
- `/dashboard/logs` - Live logs stream

## Integration

The bot automatically sends events to the dashboard API via the `dashboard-events.js` module. This integration is non-intrusive - if the API is unavailable, the bot continues to work normally.

## Troubleshooting

**Dashboard shows "No conversations"**
- Ensure the bot has run and created `user_contexts.json`
- Check that the API server is running and can read the file

**Messages not updating in real-time**
- Check browser console for SSE connection errors
- Verify the API server is accessible at `http://localhost:3001`
- Check that bot events are being sent (check API server logs)

**CORS errors**
- The API server has CORS enabled for all origins
- If issues persist, check browser console for specific errors

