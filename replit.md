# Seylane Explainer AI

## Overview
Seylane Explainer AI is a Persian-language Instagram DM bot designed for affiliate marketing, specifically supporting Luxirana's affiliate program. Its core purpose is to provide warm, friendly, and informative responses to user inquiries about products and the affiliate program, driving engagement and conversions. The bot integrates with OpenAI for natural language processing and Instagram for communication.

## User Preferences
- Keep responses under 3 seconds
- Maintain warm Persian tone
- Only mention 6 priority brands
- Show 40% discount calculations when asked
- Provide support phone: 021-88746717
- Like messages for read receipts
- Respond to each message individually

## System Architecture

### UI/UX Decisions
The bot adopts a warm, friendly, and conversational Persian tone (محاوره‌ای), utilizing natural emoji usage and avoiding formal language. Responses are formatted as short bullet points to enhance readability and conciseness, always ending with an engaging question to encourage further interaction.

### Technical Implementations
- **Human-like AI**: Employs an emotionally intelligent prompt for natural, confident, and engaging interactions, including handling rude messages playfully.
- **Context Management**: The bot maintains conversation context by considering the last 2 user messages and 1 bot reply, enabling natural follow-up conversations.
- **Product Search & Filtering**:
    - Strict filtering for 6 primary brands: Collamin, Misswake, IceBall, Dafi, Umbrella, Pixel.
    - Smart best-seller suggestions are provided only when explicitly requested.
    - When an exact product isn't found, the AI suggests alternatives based on brand, category, or popular products.
- **Pricing & Discounts**: Always displays the consumer price first, followed by a 40% discounted price specifically for affiliates, using Persian numbers and separators.
- **Performance Optimization**: Critical optimizations include removing automatic product injection into the system prompt and reducing the context window sent to OpenAI, drastically improving response times.
- **Robust Data Handling**: Features include Persian character and number normalization for accurate searching, a robust CSV parser for product data, and a 3-tier matching logic for product search (exact name, exact brand, fuzzy matching).
- **Atomic Responses**: Ensures multiple AI responses are merged into a single outgoing message.
- **Affiliate Program Integration**: Provides a structured, 4-step explanation for joining the affiliate program and directs users to the affiliate login panel.

### Feature Specifications
- **Affiliate Onboarding**: Guides users through the affiliate program registration.
- **Product Information**: Provides details on specific products, including brand, price, and discounted affiliate price.
- **Brand Information**: Offers general information about the 6 priority brands.
- **Best Seller Identification**: Highlights best-selling products for each brand upon request.
- **Payment Information**: Explains payment methods and commission withdrawal from the affiliate account.

### System Design Choices
- **Core Files**: `main.js` for main logic, Instagram automation, and OpenAI integration; `search_product.js` for product search and URL lookup; `get_product_link.js` for slug URL resolution; `message_cache.json` for avoiding duplicate processing; `user_contexts.json` for user conversation history; `products.csv` and `product_slugs.csv` for product data and URLs.
- **Deployment**: Utilizes an "Instagram Bot" workflow running `node main.js`, with auto-restart on package or module changes, and a 12-second polling interval for new messages.

## Brand Information (CORRECT & UPDATED)

### 6 Priority Brands - Exact Descriptions:

1. **Collamin** (کلامین)
   - **English**: Collamin (⚠️ NOT Kalamine)
   - **Description**: محصولات مراقبت پوستی که از ترکیب کلامین با ویتامین‌های دیگه تولید میشه
   - Category: Skincare products made from collagen + vitamins

2. **Misswake** (میسویک)
   - **English**: Misswake
   - **Description**: محصولات مراقبت دهان و دندان
   - Category: Oral hygiene (toothpaste, mouthwash, dental care)

3. **IceBall** (آیس‌بال)
   - **English**: IceBall
   - **Description**: محصولات مراقبت پوستی، ترند و یخی، بستن منافذ و لیفت پوست
   - Key Features: Ice-based trendy products, pore tightening, skin lifting

4. **Dafi** (دافی)
   - **English**: Dafi
   - **Description**: دستمال مرطوب و پاک‌کننده‌های آرایشی
   - Category: Wet wipes & makeup removers
   - ⚠️ NOT home appliances or kitchen products

5. **Umbrella** (آمبرلا)
   - **English**: Umbrella
   - **Description**: فقط دئودورانت
   - ⚠️ ONLY deodorant sticks (NO creams - all discontinued)

6. **Pixxel** (پیکسل)
   - **English**: Pixxel (⚠️ double x, NOT Pixel)
   - **Description**: ضدآفتاب سبک، هر دو کتگوری فیزیکال و شیمیایی
   - Key Features: Lightweight sunscreen, both physical and chemical options available

**Note**: Kodex (condoms) exists but is NOT in the primary 6-brand list.

## External Dependencies

- **OpenAI API**: For natural language understanding and generation.
- **Instagram**: The primary platform for bot interaction, requiring session-based authentication.
- **Luxirana Affiliate Panel**: `https://affiliate.luxirana.com/account/login` for affiliate registration and login.
- **Product Databases**:
    - `data/products.csv`: Contains product names, sale prices, regular prices, and brands.
    - `data/product_slugs.csv`: Stores direct, slug-based URLs for products.