# Quick Setup: Local Bot → Railway Dashboard

## 🚀 Fast Setup (3 Steps)

### 1. Install Localtunnel (One Time)
```bash
npm install -g localtunnel
```

### 2. Start Your Bot
```bash
cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
npm start
```
Wait until you see: `✅ API Server integrated and running on port 3001`

### 3. Start Tunnel (New Terminal)
```bash
cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
npm run tunnel
# Or: node start-tunnel.js
# Or: lt --port 3001
```

**Copy the tunnel URL** (e.g., `https://random-name.loca.lt`)

### 4. Set in Railway
1. Go to Railway → Your Project → **Variables**
2. Add: `AFFILIATE_BOT_API_URL` = `https://your-tunnel-url.loca.lt`
3. Save (Railway will redeploy automatically)

### 5. Done! 🎉
- Open your Railway dashboard
- Go to **Affiliate Bot** section
- You should see live conversations and logs!

---

## ⚠️ Important Notes

- **Keep both terminals running**: Bot terminal + Tunnel terminal
- **Tunnel URL changes**: Each time you restart the tunnel, you get a new URL
- **Update Railway**: When tunnel URL changes, update `AFFILIATE_BOT_API_URL` in Railway

---

## 🔧 Alternative: Using Ngrok

If localtunnel doesn't work:

1. Install ngrok: https://ngrok.com/download
2. Start bot: `npm start`
3. Start ngrok: `ngrok http 3001`
4. Copy ngrok URL (e.g., `https://abc123.ngrok-free.app`)
5. Set in Railway: `AFFILIATE_BOT_API_URL` = your ngrok URL

---

## 🐛 Troubleshooting

**Dashboard shows "No Data":**
- Check tunnel is running: `curl https://your-tunnel-url.loca.lt/api/health`
- Check Railway variable is set correctly
- Make sure bot is running

**Tunnel disconnects:**
- Restart tunnel script
- Update Railway with new URL

**CORS errors:**
- Already enabled in API server
- Check tunnel URL matches exactly in Railway

