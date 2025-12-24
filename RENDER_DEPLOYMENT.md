# Render Deployment Guide

## Prerequisites

- GitHub repository: https://github.com/parsaforughi/affiliate-instagram-bot
- Render account: https://render.com (free tier available)
- Environment variables ready

## Step-by-Step Deployment

### 1. Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

### 2. Create New Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect repository: `parsaforughi/affiliate-instagram-bot`
3. Render will auto-detect `render.yaml` configuration

### 3. Configure Service

Render will use these settings from `render.yaml`:
- **Name**: `affiliate-instagram-bot`
- **Environment**: Node
- **Plan**: Free
- **Region**: Oregon
- **Build Command**: `cd explainer20-1/explainer/WorldlyFineDiscussion && npm install`
- **Start Command**: `cd explainer20-1/explainer/WorldlyFineDiscussion && node main.js`
- **Health Check**: `/api/health`

### 4. Set Environment Variables

In Render dashboard, go to **Environment** tab and add:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |
| `INSTAGRAM_USERNAME` | Instagram username | ✅ Yes* |
| `INSTAGRAM_PASSWORD` | Instagram password | ✅ Yes* |
| `INSTA_SESSION` | Instagram session cookie | ✅ Yes* |

*Use either `INSTAGRAM_USERNAME` + `INSTAGRAM_PASSWORD` OR `INSTA_SESSION`

**Optional:**
- `NODE_ENV` = `production` (auto-set by Render)
- `API_PORT` = `10000` (auto-set by Render, uses `PORT` env var)

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies
   - Start the bot
3. Wait for deployment (5-10 minutes first time)

### 6. Get Your Bot URL

After deployment, you'll get a URL like:
```
https://affiliate-instagram-bot.onrender.com
```

### 7. Test the Bot

Visit in browser:
```
https://affiliate-instagram-bot.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "bot": { ... },
  "conversations": 0
}
```

### 8. Connect to Railway Dashboard

1. Go to Railway → Your Dashboard Project
2. Click **Variables**
3. Add/Update: `AFFILIATE_BOT_API_URL` = `https://affiliate-instagram-bot.onrender.com`
4. **Save** (Railway will auto-redeploy)

### 9. Verify Connection

Visit your Railway dashboard:
```
https://your-railway-app.up.railway.app/api/affiliate-bot/test
```

Should show:
```json
{
  "success": true,
  "message": "Connected to Affiliate Bot API",
  "url": "https://affiliate-instagram-bot.onrender.com"
}
```

## Troubleshooting

### Bot Not Starting

**Check Render Logs:**
1. Go to Render dashboard → Your service → **Logs**
2. Look for errors:
   - Missing environment variables
   - Chromium not found
   - Port conflicts

**Common Issues:**

1. **"Chromium not found"**
   - Solution: Render's free tier doesn't include Chromium
   - Use Dockerfile (includes Chromium) or upgrade to paid plan

2. **"Port already in use"**
   - Solution: Render sets `PORT` automatically, code already handles this

3. **"Missing environment variables"**
   - Solution: Set all required variables in Render dashboard

### Bot Spins Down (Free Tier)

**Problem**: Bot stops after 15 minutes of inactivity

**Solutions:**
1. **Health Check**: Already configured in `render.yaml` (`healthCheckPath: /api/health`)
2. **External Ping**: Use a service like UptimeRobot to ping `/api/health` every 5 minutes
3. **Upgrade**: Paid plan ($7/month) keeps service running 24/7

### Slow First Request

**Problem**: First request after spin-down takes 30+ seconds

**Solution**: This is normal for free tier. Consider:
- Using health check to keep it alive
- Upgrading to paid plan
- Using external ping service

### Dashboard Not Showing Data

1. **Check Railway variable**: `AFFILIATE_BOT_API_URL` must be set correctly
2. **Test connection**: Visit `/api/affiliate-bot/test` on Railway
3. **Check Render logs**: Make sure bot is running
4. **Check bot has data**: Visit `https://your-bot.onrender.com/api/conversations`

## Render Free Tier Limitations

- ⚠️ **15-minute inactivity timeout** (spins down)
- ⚠️ **Cold start delay** (~30 seconds after spin-down)
- ⚠️ **No Chromium** (use Dockerfile or paid plan)
- ✅ **Unlimited builds**
- ✅ **Free SSL/HTTPS**
- ✅ **Auto-deploy from GitHub**

## Upgrading to Paid Plan

**Benefits:**
- ✅ 24/7 uptime (no spin-downs)
- ✅ Faster cold starts
- ✅ More resources
- ✅ Better support

**Cost**: $7/month per service

## Monitoring

### Render Dashboard
- View logs in real-time
- Monitor resource usage
- Check deployment status

### Health Check
- Render pings `/api/health` automatically
- Keeps service alive on free tier
- Configured in `render.yaml`

## Next Steps

After successful deployment:

1. ✅ Bot running on Render
2. ✅ Railway dashboard connected
3. ✅ Test with real Instagram messages
4. ✅ Monitor logs for any issues
5. ✅ Set up external health check (optional)

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- GitHub Issues: https://github.com/parsaforughi/affiliate-instagram-bot/issues

