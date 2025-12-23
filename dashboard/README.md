# Bot Dashboard

Real-time admin dashboard for monitoring the Instagram affiliate bot.

## Features

- **Live Conversations**: View all Instagram conversations in real-time
- **Full Chat History**: See complete message history for each conversation
- **Real-time Updates**: Messages appear instantly via Server-Sent Events (SSE)
- **Live Logs**: Monitor bot logs in real-time
- **System Stats**: Track conversations, messages, and bot status

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the dashboard (development):
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

## Configuration

The dashboard connects to the API server at `http://localhost:3001` by default.

To change the API URL, edit the `API_URL` constant in:
- `app/page.tsx`
- `app/dashboard/conversations/page.tsx`
- `app/dashboard/conversations/[id]/page.tsx`
- `app/dashboard/logs/page.tsx`

## Requirements

- Next.js 14+
- React 18+
- The API server must be running (see `../explainer-api/`)

## Running in Production

```bash
npm run build
npm start
```

