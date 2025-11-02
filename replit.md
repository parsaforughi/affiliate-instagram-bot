# Seylane Explainer AI v3.3

## Overview
Persian-language Instagram DM bot for affiliate marketing with session-based authentication and OpenAI integration. Provides warm, friendly responses for Luxirana's affiliate program.

## Recent Changes (November 2, 2025)

### 🎯 v3.8 - Bullet-Style Format + Brand Filtering (COMPLETE ✅)
1. **New Message Format (Bullet-Style with Emojis)**:
   - Changed from paragraphs to short 3-6 line bullet points
   - Format example:
     ```
     ✨ محصول: خمیردندان توتال ۱۲ کاره میسویک
     💰 قیمت مصرف‌کننده: ۲۱۷٬۰۰۰ تومان
     🔖 برای شما با ۴۰٪ تخفیف: ۱۳۰٬۲۰۰ تومان
     🔗 لینک خرید پایین 👇
     ```

2. **Strict Brand Filtering (6 Brands Only)**:
   - ONLY allowed: کلامین، میسویک، آیس‌بال، دافی، آمبرلا، پیکسل
   - Other brands → "این برند در لیست فعلی ما نیست ✨"
   - Each brand shows only its own products

3. **Pricing Format Update**:
   - Always shows "قیمت مصرف‌کننده" first
   - Then "برای شما با ۴۰٪ تخفیف" (60% of price)
   - Persian numbers with separators

4. **Payment Info Response**:
   - When asked about payment:
     ```
     💳 پرداخت: درگاه مستقیم بانکی
     💸 پورسانت: لحظه‌ای قابل برداشت از حساب افیلیت
     🔗 پنل افیلیت: https://affiliate.luxirana.com/account/login
     ```

5. **Debug Logging Enhanced**:
   - Logs detected brand: 🧠 Detected brand: کلامین (Collamin)
   - Logs product link sent: 🔗 Product link: https://luxirana.com/...
   - Better debugging for troubleshooting links

## Recent Changes (November 2, 2025)

### 🔥 Performance Fix - Timeout Resolution v3.7 (Latest)
1. **Removed Automatic Product Search from Prompt (Critical Fix)**:
   - Removed automatic injection of 5+ products into system prompt
   - Previously: "میسویک" query → added all Misswake products to prompt → timeout
   - Now: Minimal prompt, AI asks follow-up questions to narrow down product
   - **Result: 38s → 1.6s response time!** ⚡

2. **Optimized System Prompt (90% reduction)**:
   - Reduced from 117 lines to ~10 lines
   - Removed priority products context
   - Removed redundant instructions
   
3. **Reduced Context Window (2+1 Messages)**:
   - Changed from 5 user + 3 bot messages to 2 user + 1 bot message
   - Significantly reduces token count sent to OpenAI

### 🆕 Arman Fix - Human-Like AI v3.5
1. **Memory & Context (Now 2+1 Messages)**:
   - Bot now reads last 2 user messages + 1 bot reply for context
   - Continues conversations naturally instead of saying "متوجه نشدم"
   - Example: "میسویک برام بگو" → bot remembers previous brand mention and elaborates
   - "بگو دیگه" → checks conversation history to continue topic
   
2. **Brand Fallback Logic**:
   - When brand mentioned but no specific product: explains the brand
   - Example: "میسویک یکی از برندهای محبوب ماست 😍 مخصوص مراقبت از دندان و دهان. میخوای محصولاتش رو بفرستم؟"
   - Covers all 6 brands: Misswake, Collamin, IceBall, Dafi, Umbrella, Pixel

3. **Bullet-Style Formatting**:
   - Clean line-separated bullets for brand/product lists
   - Example format:
     ```
     برندهای ما 👇
     • Collamin – مکمل‌های زیبایی
     • Misswake – دهان و دندان
     • IceBall – آبرسان پوست
     ```

4. **Humor & Emotional Control**:
   - Handles rude/joking messages playfully
   - Example: "سلام احمق" → "ای بابا 😅 ظاهراً روز سختی داشتی! ولی من پایه‌ام 😎"
   - Never takes offense, stays professional but friendly

5. **Better "Didn't Understand" Responses**:
   - Replaced "متوجه نشدم" with natural alternatives:
   - "میخوای منظورتو یه کم واضح‌تر بگی؟ 😊"
   - "حدس می‌زنم منظورت [brand] بود، درسته؟"
   
6. **Improved Responses**:
   - Test 1: "سلام رفیق 👋 چه خبر؟ دنبال چی هستی؟"
   - Test 2: "برات لینک پایین گذاشتم 👇 با ۴۰٪ تخفیف ویژه می‌تونی شروع کنی 😉"
   - More natural, confident, and emotionally engaging

### 🆕 Human-Like AI Upgrade (Previous - v3.4)
1. **Human-Like Prompt**: Replaced formal prompt with emotionally intelligent, warm, confident tone
   - Speaks like a real brand representative, not a bot
   - Natural emoji usage (😎✨) when appropriate
   - Examples: "سلام رفیق 👋" instead of "Please specify your request"
2. **Similar Product Intelligence**: Smart fallback when exact product not found
   - 3-tier priority: Same brand → Same category → Popular products
   - Never says "نداریم" - always suggests alternatives
   - Example: "فعلاً اون مدل تموم شده ولی یه گزینه مشابه دارم 😍"
3. **Improved Response Quality**: Average 2.37s response time with better engagement

### ✅ Major Bug Fixes (Previous)
1. **CSV Parsing Fix**: Proper multi-line field handling - توتال ۱۲ now found successfully
2. **Number Normalization**: English numbers (12) auto-convert to Persian (۱۲) in search
3. **Product vs Affiliate Link Detection**: AI now distinguishes "لینک محصول" vs "لینک افیلیت"
4. **Context Understanding**: AI reads conversation history for "بگو دیگه" responses
5. **Atomic Response Enforcement**: Code-level guard merges multiple AI responses into one message
6. **Single Message Processing**: Responds only to last unread message (no duplicates)

### ✅ Implemented Features
1. **Short Bullet-Point Responses**: Updated prompt to enforce concise, bullet-point style answers
2. **6-Brand Focus**: Only mentions Collamin, Misswake, IceBall, Dafi, Umbrella, Pixel (removed Kodex from primary list)
3. **Separate Affiliate Link**: Text message and link are sent separately (no URLs in message text)
4. **40% Discount Calculation**: Bot calculates and shows discounted price when asked "برای من چقدر در میاد؟"
5. **Support Phone Number**: Added 021-88746717 to prompt
6. **Message Liking**: Bot likes incoming messages for read receipts
7. **Direct Product Links**: Uses slug-based URLs from product_slugs.csv (562 products)

### Technical Implementation
- **search_product.js** (merged with URL lookup logic):
  - **Reads price/brand from data/products.csv** (571 products, UTF-8):
    - Field 5 (index 4): نام (Name)
    - Field 26 (index 25): قیمت فروش (Sale Price)
    - Field 27 (index 26): قیمت اصلی (Regular Price)
    - Field 41 (index 40): برندها (Brands) - FIXED from incorrect field 38
  - **Reads URLs from data/product_slugs.csv** (562 products, UTF-8):
    - Fields: Title, URL
  - **Persian character normalization**: ك→ک, ي→ی (critical for matching)
  - **Number normalization**: English digits (12) → Persian (۱۲)
  - **Robust CSV parser**: Handles multi-line quoted fields
  - **3-tier matching logic**:
    1. Exact name match (highest priority)
    2. Exact brand match (only if brand field not empty)
    3. Fuzzy matching with 30% similarity threshold
  - **Never builds fake URLs**: Only uses real URLs from product_slugs.csv
  - **Returns null if URL not found**: Products without valid URLs are excluded from results
  - **Price formatting**: Persian separators with 40% discount calculation
  - **Merged getProductURL()**: Looks up URL from product_slugs.csv after finding product
- **main.js**: 
  - **getSmartContextMessages()** (lines 244-256): Gets last 5 user + 3 bot messages for context
  - **Brand detection logic** (lines 387-414): Detects brand mentions and provides fallback info
  - **Enhanced system prompt** (lines 462-564): Human-like, with memory context, humor control, bullet formatting
  - Atomic response merger (lines 1050-1068)
  - Product vs affiliate link distinction in prompt
  - Context understanding rules for short responses
  - Single-message processing (no multi-message loops)
  - Message liking via DOM automation
  - Separate link sending

### Performance
- **Average response time**: 1.44s (well under 3s target ✅)
- **Self-tests**: 3/3 passing consistently
- **Timeout handler**: 30-second fallback with "متوجه منظورت نشدم"
- **Product search examples**:
  - "توتال ۱۲" → خمیردندان توتال ۱۲ کاره ۷۵ میل میسویک ✅
  - "میسویک" → 5 Misswake products ✅
  - "خمیردندان بلیچینگ" → exact matches ✅
- **URL accuracy**: All URLs from real product_slugs.csv (no fake URLs)
- **Fuzzy matching**: Works seamlessly when exact match not found (30% threshold)

## Project Architecture

### Core Files
- `main.js`: Main bot logic, Instagram automation, OpenAI integration
- `search_product.js`: Product search with direct slug-based URLs
- `get_product_link.js`: Slug URL resolver
- `message_cache.json`: Tracks processed messages to avoid duplicates
- `user_contexts.json`: Stores user conversation history and preferences
- `products.csv`: Product database (479 products)
- `product_slugs.csv`: Direct product URLs (562 products)

### Brand List (Priority Order)
1. **Collamin** (کلامین) - Collagen & beauty supplements
2. **Misswake** (میسویک) - Oral hygiene
3. **IceBall** (آیس‌بال) - Skincare & moisturizer
4. **Dafi** (دافی) - Wet wipes
5. **Umbrella** (آمبرلا) - Creams & deodorant
6. **Pixel** (پیکسل) - Sunscreen

**Note**: Kodex (condoms) exists but is not in the primary 6-brand list.

### Pricing Structure
- **Consumer Price**: Listed product prices (e.g., 287,000 تومان)
- **Affiliate Price**: 40% discount (e.g., 287,000 × 0.6 = 172,200 تومان)
- Bot always clarifies "این قیمت مصرف‌کننده است"

### Response Style Guidelines
- **Tone**: Warm, friendly, conversational
- **Format**: Short bullet points
- **Language**: Persian, محاوره‌ای (می‌تونی، برات، باهات)
- **Engagement**: Always end with question (e.g., "میخوای قیمتش رو بگم؟")
- **NO**: Formal language (محترم، با احترام)

## User Preferences
- Keep responses under 3 seconds
- Maintain warm Persian tone
- Only mention 6 priority brands
- Show 40% discount calculations when asked
- Provide support phone: 021-88746717
- Like messages for read receipts
- Respond to each message individually

## Environment Variables
- `OPENAI_API_KEY`: OpenAI API key
- `INSTAGRAM_USERNAME`: Bot Instagram username
- `INSTAGRAM_PASSWORD`: Bot Instagram password (not used with session)
- `INSTA_SESSION`: Session cookie for authentication

## Deployment
- **Workflow**: "Instagram Bot" runs `node main.js`
- **Auto-restart**: On package installation or module changes
- **Monitoring**: 12-second polling interval for new messages
