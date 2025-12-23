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

## Documentation

- `START_BOT.md`: Quick start guide
- `SYSTEM_PROMPT.md`: Complete AI prompt documentation
- `docs/`: Historical documentation and implementation notes

