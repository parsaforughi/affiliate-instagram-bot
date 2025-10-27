# Seylane Explainer AI v3.3

## Overview
Persian-language Instagram DM bot for affiliate marketing with session-based authentication and OpenAI integration. Provides warm, friendly responses for Luxirana's affiliate program.

## Recent Changes (October 27, 2025)

### ✅ Implemented Features
1. **Short Bullet-Point Responses**: Updated prompt to enforce concise, bullet-point style answers
2. **6-Brand Focus**: Only mentions Collamin, Misswake, IceBall, Dafi, Umbrella, Pixel (removed Kodex from primary list)
3. **Separate Affiliate Link**: Text message and link are sent separately (no URLs in message text)
4. **40% Discount Calculation**: Bot calculates and shows discounted price when asked "برای من چقدر در میاد؟"
5. **Support Phone Number**: Added 021-88746717 to prompt
6. **Message Liking**: Bot likes incoming messages for read receipts
7. **Individual Message Responses**: Responds to each unread message separately (not batched)
8. **Direct Product Links**: Uses slug-based URLs from product_slugs.csv (562 products)

### Technical Implementation
- **get_product_link.js**: New module for slug-based direct product URLs
- **product_slugs.csv**: 562 products with direct URLs (copied from attached_assets)
- **search_product.js**: Updated to use slug links with product ID fallback
- **main.js**: 
  - Message liking via DOM hover/click automation
  - Multi-message processing loop (lines 931-949)
  - Separate link sending (lines 997-1028)
  - Updated prompt with all new requirements (lines 420-491)

### Performance
- **Average response time**: 2.35s (under 3s target ✅)
- **Self-tests**: 3/3 passing
- **Timeout handler**: 30-second fallback with "متوجه منظورت نشدم"

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
