# Quick Start - Copy & Paste Commands

## Terminal 1: Start API Server

```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer-api"
npm install
npm start
```

**Expected output:**
```
🚀 Dashboard API Server running on http://0.0.0.0:3001
```

---

## Terminal 2: Start Dashboard

```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/dashboard"
npm install
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

Open browser: **http://localhost:3000**

---

## Terminal 3: Start Bot (Optional)

```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion"
npm start
```

---

## One-Line Commands (Quick Copy)

### Terminal 1 - API Server:
```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer-api" && npm install && npm start
```

### Terminal 2 - Dashboard:
```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/dashboard" && npm install && npm run dev
```

### Terminal 3 - Bot:
```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion" && npm start
```

---

## Access URLs

- **Dashboard:** http://localhost:3000
- **API Server:** http://localhost:3001
- **API Health Check:** http://localhost:3001/api/health

---

## Troubleshooting

If `npm install` fails, try:
```bash
npm install --legacy-peer-deps
```

If port 3000 or 3001 is already in use, stop the existing process or change ports in config files.

