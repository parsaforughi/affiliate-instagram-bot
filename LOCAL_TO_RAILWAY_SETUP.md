# Connect Local Bot to Railway Dashboard

This guide shows you how to run the bot locally and connect it to your Railway dashboard.

## Quick Start

### Option 1: Using Localtunnel (Recommended - Easier)

1. **Install localtunnel globally:**
   ```bash
   npm install -g localtunnel
   ```

2. **Start your bot:**
   ```bash
   cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
   npm start
   ```

3. **In a new terminal, start the tunnel:**
   ```bash
   cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
   node start-tunnel.js
   ```

4. **Copy the tunnel URL** (e.g., `https://random-name.loca.lt`)

5. **Set in Railway:**
   - Go to your Railway project settings
   - Add environment variable: `AFFILIATE_BOT_API_URL`
   - Set value to your tunnel URL (e.g., `https://random-name.loca.lt`)
   - Save and redeploy

6. **Keep both terminals running:**
   - Bot terminal (running the bot)
   - Tunnel terminal (exposing the API)

### Option 2: Using Ngrok (More Stable)

1. **Install ngrok:**
   - Download from https://ngrok.com/download
   - Or: `npm install -g ngrok`

2. **Start your bot:**
   ```bash
   cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
   npm start
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3001
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

5. **Set in Railway:**
   - Go to your Railway project settings
   - Add environment variable: `AFFILIATE_BOT_API_URL`
   - Set value to your ngrok URL
   - Save and redeploy

## Step-by-Step Instructions

### 1. Start the Bot Locally

```bash
cd affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion
npm start
```

You should see:
```
✅ API Server integrated and running on port 3001
```

### 2. Expose Local API to Internet

**Using Localtunnel:**
```bash
# Install (one time)
npm install -g localtunnel

# Start tunnel
node start-tunnel.js
# Or manually:
lt --port 3001
```

**Using Ngrok:**
```bash
# Install ngrok from https://ngrok.com/download
# Then:
ngrok http 3001
```

### 3. Configure Railway

1. Go to your Railway project: https://railway.app
2. Click on your project → **Variables**
3. Add new variable:
   - **Name**: `AFFILIATE_BOT_API_URL`
   - **Value**: Your tunnel URL (e.g., `https://random-name.loca.lt`)
4. Click **Save**
5. Railway will automatically redeploy

### 4. Verify Connection

1. Open your Railway dashboard: `https://your-app.up.railway.app`
2. Navigate to **Affiliate Bot** section
3. You should see:
   - Live conversations
   - Real-time logs
   - Bot status

## Troubleshooting

### Tunnel URL Changes Every Time

**Localtunnel:**
- Free tunnels get new URLs each time
- Use `--subdomain` flag for a fixed URL (requires paid plan)
- Or use ngrok with a fixed domain

**Ngrok:**
- Free plan: URL changes each time
- Paid plan: Can set a fixed domain

### Dashboard Shows "No Data"

1. **Check tunnel is running:**
   ```bash
   # Test tunnel URL
   curl https://your-tunnel-url.loca.lt/api/health
   ```

2. **Check Railway environment variable:**
   - Make sure `AFFILIATE_BOT_API_URL` is set correctly
   - No trailing slash
   - Includes `https://`

3. **Check bot is running:**
   - Bot terminal should show activity
   - API server should be on port 3001

### CORS Errors

The integrated API server already has CORS enabled. If you see CORS errors:

1. Check that the tunnel URL matches exactly in Railway
2. Make sure the bot is actually running
3. Check browser console for specific error messages

### Tunnel Disconnects

**Localtunnel:**
- Free tunnels may disconnect after inactivity
- Restart the tunnel script
- Update Railway with new URL

**Ngrok:**
- More stable, but free plan has connection limits
- Paid plan is more reliable

## Alternative: Keep Tunnel URL in File

The tunnel script saves the URL to `.tunnel-url.txt`. You can read it:

```bash
cat .tunnel-url.txt
```

## Production Setup

For production, you should:
1. Deploy the bot to Railway (or another service)
2. Set `AFFILIATE_BOT_API_URL` to the deployed bot's URL
3. No tunnel needed

## Notes

- **Keep tunnel running**: The tunnel must stay running while using the dashboard
- **URL changes**: Free tunnel URLs change each time you restart
- **Security**: Tunnels expose your local API - only use for development
- **Performance**: Local → Tunnel → Railway adds latency

