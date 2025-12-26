# Affiliate Instagram Bot

Persian-language Instagram DM bot for affiliate marketing, supporting Luxirana's affiliate program. Provides automated responses to product inquiries and guides users through the affiliate registration process.

## What This Bot Does

The bot monitors Instagram direct messages, responds to user inquiries about products in Persian, and guides online shop owners through the affiliate program registration. It uses OpenAI GPT for natural language processing and Puppeteer for Instagram automation.

## How to Run

### Prerequisites
- Node.js installed
- OpenAI API key
- Instagram credentials or session cookie

### Setup

1. Install dependencies:
```bash
cd explainer20-1/explainer/WorldlyFineDiscussion
npm install
```

2. Create `.env` file with:
```
OPENAI_API_KEY=your-key-here
INSTAGRAM_USERNAME=your-username
INSTAGRAM_PASSWORD=your-password
INSTA_SESSION=your-session-cookie (optional)
GOOGLE_SHEETS_ENABLED=false
```

3. Run the bot:
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

## Folder Structure

```
affiliate-onlineshop-bot/
├── explainer-api/           # Express API server for message streaming
│   ├── server.js
│   └── package.json
│
├── explainer20-1/           # Main bot code
│   └── explainer/
│       └── WorldlyFineDiscussion/
│           ├── main.js              # Main bot entry point
│           ├── search_product.js    # Product search logic
│           ├── data/                # Product data (CSV, JSON)
│           ├── scripts/             # Utility scripts (not runtime)
│           ├── docs/                # Documentation
│           ├── seylane-instagram-explainer/  # Sub-module
│           ├── user_contexts.json   # Runtime: user conversation history
│           ├── message_cache.json   # Runtime: message deduplication
│           └── package.json
│
└── attached_assets/         # Legacy assets (can be cleaned)

```

## Core Files

- **main.js**: Instagram automation, message processing, OpenAI integration
- **search_product.js**: Product search with Persian character normalization
- **data/products.csv**: Product database (571 products)
- **data/product_slugs.csv**: Product URLs
- **data/best_sellers.json**: Best-selling products per brand

## Runtime Files (Auto-generated)

- `user_contexts.json`: User conversation history
- `message_cache.json`: Prevents duplicate message processing
- `.env`: Environment variables (create manually)

## Important Notes

⚠️ **Warning**: Do not modify core logic (main.js, search_product.js) without understanding the bot flow. The bot uses relative imports and expects files in specific locations.

## Configuration

- **Model**: GPT-5.1
- **Temperature**: 0.9
- **Max Tokens**: 700
- **Polling Interval**: 12 seconds
- **Response Time Target**: < 3 seconds

## Supported Brands

1. Misswake (دهان و دندان)
2. Collamin (کلاژن و امگا۳)
3. IceBall (آبرسان و لیفت)
4. Dafi (پاک‌کننده و دستمال مرطوب)
5. Umbrella (دئودورانت)
6. Pixel (ضدآفتاب)

## Deploy to Render

### Quick Deploy

1. **Push code to GitHub** (already done: https://github.com/parsaforughi/affiliate-instagram-bot)

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `parsaforughi/affiliate-instagram-bot`
   - Render will auto-detect `render.yaml`

4. **Set Environment Variables** in Render dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `INSTAGRAM_USERNAME` - Instagram username
   - `INSTAGRAM_PASSWORD` - Instagram password (or use `INSTA_SESSION` instead)
   - `INSTA_SESSION` - Instagram session cookie (optional, alternative to username/password)

5. **Deploy**: Click "Create Web Service"

6. **Get your bot URL**: `https://affiliate-instagram-bot.onrender.com` (or your custom name)

7. **Update Railway Dashboard**:
   - Go to Railway → Your Dashboard Project → Variables
   - Set `AFFILIATE_BOT_API_URL` = `https://affiliate-instagram-bot.onrender.com`
   - Save and redeploy

### Render Free Tier Notes

- ⚠️ **Spins down after 15 minutes of inactivity**
- ⚠️ **First request after spin-down takes ~30 seconds** (cold start)
- ✅ **Health check** keeps it alive (pings `/api/health` every few minutes)
- 💰 **Paid plan ($7/month)** for 24/7 uptime without spin-downs

### Using Docker (Alternative)

If you prefer Docker deployment, Render will use the `Dockerfile` automatically. The `render.yaml` config is simpler and recommended.

### Meta App Review - Required URLs

After deployment on Render, the following URLs are available and required for Meta App Review:

- **Privacy Policy**: `https://affiliate-instagram-bot.onrender.com/privacy`
- **Terms of Service**: `https://affiliate-instagram-bot.onrender.com/terms`

These pages are automatically available after deployment and are required for Instagram Business Messaging approval.

**To use these URLs in Meta App Review:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **App Settings** → **Basic**
4. Add **Privacy Policy URL**: `https://affiliate-instagram-bot.onrender.com/privacy`
5. Add **Terms of Service URL**: `https://affiliate-instagram-bot.onrender.com/terms`
6. Save changes

## Documentation

- `START_BOT.md`: Quick start guide
- `SYSTEM_PROMPT.md`: Complete AI prompt documentation
- `docs/`: Historical documentation and implementation notes
- `INTEGRATED_API_SERVER.md`: API server integration details
- `LOCAL_TO_RAILWAY_SETUP.md`: Local development with Railway dashboard

