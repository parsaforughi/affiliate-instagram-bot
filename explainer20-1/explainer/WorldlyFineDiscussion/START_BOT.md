# Starting the Bot

## Step 1: Install Dependencies

First, install the required npm packages:

```bash
cd "/Users/parsa/Desktop/seylane ai/affiliate-onlineshop-bot/explainer20-1/explainer/WorldlyFineDiscussion"
npm install
```

## Step 2: Ensure .env file exists

Make sure you have a `.env` file in the same directory with:

```env
OPENAI_API_KEY=your-openai-api-key
INSTAGRAM_USERNAME=your-instagram-username
INSTAGRAM_PASSWORD=your-instagram-password
INSTA_SESSION=your-session-cookie-optional
GOOGLE_SHEETS_ENABLED=false
```

## Step 3: Install nodemon (for auto-restart on file changes)

```bash
npm install --save-dev nodemon
```

## Step 4: Run the Bot

**Option 1: Run with auto-restart (recommended for development)**
```bash
npm run dev
```
or
```bash
nodemon main.js
```

**Option 2: Run without auto-restart**
```bash
npm start
```
or
```bash
node main.js
```

The `nodemon` version will automatically restart the bot whenever you make changes to `.js`, `.json` files, or the `.env` file. This is perfect for development!

