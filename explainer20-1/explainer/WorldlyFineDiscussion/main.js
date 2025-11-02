const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fetch = require("node-fetch");
const { execSync } = require("child_process");
const fs = require('fs');
const { searchProduct } = require('./search_product');
puppeteer.use(StealthPlugin());

// ========================================
// SEYLANE EXPLAINER AI v3.3
// Real-Time Speed + Smart Personalization  
// ========================================

const getChromiumPath = () => {
  try {
    return execSync("which chromium").toString().trim();
  } catch (err) {
    console.error("❌ Chromium not found in PATH");
    process.exit(1);
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const takeScreenshot = async (page, name) => {
  try {
    const filename = `debug_${name}_${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  } catch (err) {
    console.error("Screenshot error:", err.message);
  }
};

const {
  OPENAI_API_KEY,
  INSTAGRAM_USERNAME,
  INSTAGRAM_PASSWORD,
  INSTA_SESSION,
  GOOGLE_SHEETS_ENABLED = "false",
} = process.env;

const AFFILIATE_LINK = "https://affiliate.seylane.com/account/login";
const MY_USERNAME = INSTAGRAM_USERNAME || "seylane"; // Our bot account name

// ========================================
// NAME TRANSLATION (English to Persian)
// ========================================
const NAME_TRANSLATIONS = {
  // Common Iranian names
  'ali': 'علی',
  'mohammad': 'محمد',
  'mohammed': 'محمد',
  'reza': 'رضا',
  'hassan': 'حسن',
  'hossein': 'حسین',
  'hussein': 'حسین',
  'mehdi': 'مهدی',
  'mahdi': 'مهدی',
  'amir': 'امیر',
  'arman': 'ارمان',
  'armin': 'آرمین',
  'salar': 'سالار',
  'sina': 'سینا',
  'pouria': 'پوریا',
  'pourya': 'پوریا',
  'pouya': 'پویا',
  'soheil': 'سهیل',
  'soroush': 'سروش',
  'farhad': 'فرهاد',
  'behnam': 'بهنام',
  'behrouz': 'بهروز',
  'omid': 'امید',
  'milad': 'میلاد',
  'navid': 'نوید',
  'saeed': 'سعید',
  'said': 'سعید',
  'ehsan': 'احسان',
  'iman': 'ایمان',
  'babak': 'بابک',
  'bijan': 'بیژن',
  'dariush': 'داریوش',
  'kian': 'کیان',
  'kiarash': 'کیارش',
  'kamran': 'کامران',
  'kaveh': 'کاوه',
  'peyman': 'پیمان',
  'hooman': 'هومن',
  'human': 'هومن',
  
  // Female names
  'sara': 'سارا',
  'sarah': 'سارا',
  'maryam': 'مریم',
  'mariam': 'مریم',
  'mary': 'مریم',
  'fatima': 'فاطمه',
  'fatemeh': 'فاطمه',
  'zahra': 'زهرا',
  'aida': 'آیدا',
  'ayda': 'آیدا',
  'nazanin': 'نازنین',
  'niloofar': 'نیلوفر',
  'niloufar': 'نیلوفر',
  'mina': 'مینا',
  'neda': 'ندا',
  'negar': 'نگار',
  'parisa': 'پریسا',
  'pari': 'پری',
  'shadi': 'شادی',
  'shirin': 'شیرین',
  'yasmin': 'یاسمین',
  'yasaman': 'یاسمن',
  'yasi': 'یاسی',
  'dorsa': 'درسا',
  'deniz': 'دنیز',
  'elham': 'الهام',
  'hana': 'هانا',
  'hannah': 'حنا',
  'setareh': 'ستاره',
  'bahar': 'بهار',
  'nasim': 'نسیم',
};

// Function to translate English name to Persian
function translateNameToPersian(name) {
  if (!name || typeof name !== 'string') return name;
  
  // Clean the name
  const cleanName = name.trim().toLowerCase();
  
  // Don't translate if it's a brand/shop name
  const brandKeywords = ['shop', 'store', 'brand', 'official', 'team', 'hub', 'page', 'luxury', 'collection'];
  for (const keyword of brandKeywords) {
    if (cleanName.includes(keyword)) {
      return name; // Return original
    }
  }
  
  // Check if it's already in Persian (contains Persian characters)
  if (/[\u0600-\u06FF]/.test(name)) {
    return name; // Already Persian
  }
  
  // Try to translate
  if (NAME_TRANSLATIONS[cleanName]) {
    return NAME_TRANSLATIONS[cleanName];
  }
  
  // If not found, return original
  return name;
}

// ========================================
// USER CONTEXT STORAGE
// ========================================
class UserContextManager {
  constructor() {
    this.contextFile = 'user_contexts.json';
    this.contexts = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.contextFile)) {
        const data = JSON.parse(fs.readFileSync(this.contextFile, 'utf8'));
        console.log(`👥 Loaded ${Object.keys(data).length} users`);
        return data;
      }
    } catch (err) {
      console.log("👥 No previous user data found");
    }
    return {};
  }

  save() {
    try {
      fs.writeFileSync(this.contextFile, JSON.stringify(this.contexts, null, 2));
    } catch (err) {
      console.error("⚠️ Error saving data:", err.message);
    }
  }

  getContext(username) {
    if (!this.contexts[username]) {
      this.contexts[username] = {
        username: username,
        name: null,
        bio: null,
        tone: 'casual',
        messageHistory: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        lastGreetingDate: null,
      };
    }
    this.contexts[username].lastSeen = Date.now();
    return this.contexts[username];
  }

  hasGreetedToday(username) {
    const context = this.getContext(username);
    if (!context.lastGreetingDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastGreeting = new Date(context.lastGreetingDate);
    lastGreeting.setHours(0, 0, 0, 0);
    
    return today.getTime() === lastGreeting.getTime();
  }

  markGreetedToday(username) {
    const context = this.getContext(username);
    context.lastGreetingDate = Date.now();
    this.save();
  }

  updateContext(username, updates) {
    const context = this.getContext(username);
    Object.assign(context, updates);
    this.save();
  }

  addMessage(username, role, content) {
    const context = this.getContext(username);
    context.messageHistory.push({ role, content, timestamp: Date.now() });
    if (context.messageHistory.length > 20) {
      context.messageHistory = context.messageHistory.slice(-20);
    }
    this.save();
  }

  getRecentMessages(username, limit = 10) {
    const context = this.getContext(username);
    return context.messageHistory.slice(-limit);
  }

  getSmartContextMessages(username) {
    // Get last 5 user messages + 3 bot messages for better context
    const context = this.getContext(username);
    const allMessages = context.messageHistory;
    
    const userMessages = allMessages.filter(m => m.role === 'user').slice(-5);
    const botMessages = allMessages.filter(m => m.role === 'assistant').slice(-3);
    
    // Combine and sort by timestamp
    const combined = [...userMessages, ...botMessages].sort((a, b) => a.timestamp - b.timestamp);
    
    return combined;
  }
}

// ========================================
// MESSAGE CACHE
// ========================================
class MessageCache {
  constructor() {
    this.cacheFile = 'message_cache.json';
    this.cache = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        console.log(`💾 Loaded cache for ${Object.keys(data).length} conversations`);
        return data;
      }
    } catch (err) {
      console.log("💾 Empty cache");
    }
    return {};
  }

  save() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (err) {
      console.error("⚠️ Error saving cache:", err.message);
    }
  }

  isNewMessage(conversationId, messageId) {
    if (!this.cache[conversationId]) {
      this.cache[conversationId] = { lastMessageId: null, lastCheck: Date.now() };
    }
    
    const isNew = this.cache[conversationId].lastMessageId !== messageId;
    
    if (isNew) {
      this.cache[conversationId].lastMessageId = messageId;
      this.cache[conversationId].lastCheck = Date.now();
      this.save();
    }
    
    return isNew;
  }
}

// ========================================
// PERFORMANCE MONITOR
// ========================================
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalMessages: 0,
      avgResponseTime: 0,
      responseTimes: [],
    };
  }

  trackResponse(startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.responseTimes.push(responseTime);
    this.metrics.totalMessages++;
    
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    
    const status = responseTime < 3000 ? '✅' : '⚠️';
    console.log(`${status} Response time: ${(responseTime / 1000).toFixed(2)}s (Average: ${(this.metrics.avgResponseTime / 1000).toFixed(2)}s)`);
    
    return responseTime;
  }

  getStats() {
    return {
      totalMessages: this.metrics.totalMessages,
      avgResponseTime: (this.metrics.avgResponseTime / 1000).toFixed(2) + 's',
      targetMet: this.metrics.avgResponseTime < 3000,
    };
  }
}

// ========================================
// OPENAI DIRECT INTEGRATION
// ========================================
async function askGPT(userMessages, userContext, conversationHistory = [], hasGreetedToday = false) {
  // Support both single message (string) and multiple messages (array)
  const messages = Array.isArray(userMessages) ? userMessages : [userMessages];
  const userMessage = messages.length === 1 ? messages[0] : messages.join('\n');
  
  // If multiple messages, create a combined context for OpenAI
  let multiMessageContext = '';
  if (messages.length > 1) {
    multiMessageContext = `\n\n⚠️ کاربر ${messages.length} پیام پشت سرهم فرستاده:\n`;
    messages.forEach((msg, idx) => {
      multiMessageContext += `پیام ${idx + 1}: "${msg}"\n`;
    });
    multiMessageContext += `\n
📌 قوانین پاسخ‌دهی به چند پیام:
- اگر همه پیام‌ها درباره یک موضوع هستن (مثلاً همه درباره بلیچینگ یا همه درباره همکاری) → یک پیام جامع بده که به همه سوالات جواب بده
- اگر موضوع‌ها متفاوت هستن (مثلاً یکی درباره محصول، یکی درباره همکاری) → در آرایه responses چند پیام جدا برگردون
  
مثال موضوع‌های مربوط (یک پیام):
  پیام 1: "قیمت بلیچینگ چند؟"
  پیام 2: "رنگش چیه؟"
  → یک پاسخ جامع درباره بلیچینگ (قیمت و رنگ)

مثال موضوع‌های متفاوت (چند پیام جدا):
  پیام 1: "قیمت بلیچینگ چند؟"
  پیام 2: "برای همکاری باید چیکار کنم؟"
  → دو پاسخ جدا (یکی درباره بلیچینگ، یکی درباره همکاری)
`;
  }

  // Greeting control
  let greetingContext = '';
  if (hasGreetedToday) {
    greetingContext = `\n\n⚠️ مهم: تو امروز قبلاً به این کاربر سلام کردی، پس دیگه سلام نکن! مستقیم وارد جواب سوالش شو.`;
  }

  // Translate name to Persian if needed
  const persianName = translateNameToPersian(userContext.name || userContext.username);
  const displayName = persianName || userContext.name || 'هنوز مشخص نیست';

  // Brand detection for fallback logic
  const brandInfo = {
    'میسویک': { name: 'Misswake', description: 'برند مخصوص مراقبت از دهان و دندان 😁 خمیردندون‌های فوق‌العاده داره!' },
    'misswake': { name: 'Misswake', description: 'برند مخصوص مراقبت از دهان و دندان 😁 خمیردندون‌های فوق‌العاده داره!' },
    'کلامین': { name: 'Collamin', description: 'برند کلاژن و مکمل‌های زیبایی 💅 برای پوست و موی درخشان!' },
    'collamin': { name: 'Collamin', description: 'برند کلاژن و مکمل‌های زیبایی 💅 برای پوست و موی درخشان!' },
    'آیس بال': { name: 'IceBall', description: 'برند مراقبت از پوست 💦 ژل‌های آبرسان و مرطوب‌کننده!' },
    'آیس‌بال': { name: 'IceBall', description: 'برند مراقبت از پوست 💦 ژل‌های آبرسان و مرطوب‌کننده!' },
    'ایس بال': { name: 'IceBall', description: 'برند مراقبت از پوست 💦 ژل‌های آبرسان و مرطوب‌کننده!' },
    'iceball': { name: 'IceBall', description: 'برند مراقبت از پوست 💦 ژل‌های آبرسان و مرطوب‌کننده!' },
    'دافی': { name: 'Dafi', description: 'برند دستمال مرطوب و پاک‌کننده‌ها 🧼 برای بهداشت روزانه!' },
    'dafi': { name: 'Dafi', description: 'برند دستمال مرطوب و پاک‌کننده‌ها 🧼 برای بهداشت روزانه!' },
    'آمبرلا': { name: 'Umbrella', description: 'برند کرم‌های مرطوب‌کننده و دئودورانت 🌂 برای پوست نرم و خوشبو!' },
    'umbrella': { name: 'Umbrella', description: 'برند کرم‌های مرطوب‌کننده و دئودورانت 🌂 برای پوست نرم و خوشبو!' },
    'پیکسل': { name: 'Pixel', description: 'برند ضدآفتاب و کرم‌های روشن‌کننده ☀️ برای حفاظت از پوست!' },
    'pixel': { name: 'Pixel', description: 'برند ضدآفتاب و کرم‌های روشن‌کننده ☀️ برای حفاظت از پوست!' },
  };

  let brandContext = '';
  const userMessageLower = userMessage.toLowerCase();
  
  // Check if brand is mentioned
  for (const [brandKey, brandData] of Object.entries(brandInfo)) {
    if (userMessageLower.includes(brandKey)) {
      brandContext = `\n\n🎯 برند ${brandData.name} تشخیص داده شد:\n${brandData.description}\nاگر محصول مشخصی پیدا نشد، این اطلاعات رو بهش بگو و بپرس: "میخوای محصولاتش رو برات بفرستم؟"`;
      break;
    }
  }

  // Search for products mentioned in the message
  let productSearchContext = '';
  const keywords = ['خمیر', 'دندان', 'کاندوم', 'دستمال', 'کرم', 'ژل', 'دهان', 'شویه', 'نخ', 'کلاژن', 'بلیچ', 'سفید', 'میسویک', 'دافی', 'کدکس', 'آمبرلا', 'کلامین', 'آیس', 'misswake', 'dafi', 'codex', 'umbrella', 'collamin', 'iceball'];
  
  const hasProductKeyword = keywords.some(keyword => userMessageLower.includes(keyword));
  
  if (hasProductKeyword) {
    // Extract potential product names from the message
    let searchTerms = userMessage.split(/\s+/).filter(word => word.length > 3);
    
    // Prioritize specific terms (e.g., "بلیچینگ" should be searched before generic "خمیر")
    const priorityTerms = ['بلیچینگ', 'بلیچ', 'bleaching', 'کاندوم', 'کلاژن', 'دستمال'];
    searchTerms.sort((a, b) => {
      const aPriority = priorityTerms.some(term => a.includes(term)) ? 1 : 0;
      const bPriority = priorityTerms.some(term => b.includes(term)) ? 1 : 0;
      return bPriority - aPriority;
    });
    
    for (const term of searchTerms) {
      const results = searchProduct(term);
      if (results.length > 0) {
        productSearchContext += `\n\n🔍 محصولات پیدا شده برای "${term}":\n`;
        results.forEach(product => {
          productSearchContext += `• ${product.name} - ${product.price} تومان (${product.brand})\n`;
          productSearchContext += `  لینک: ${product.productUrl}\n`;
        });
        break; // Only search for first matching term
      }
    }
  }

  // Priority products for special offers
  const priorityProducts = ['کلامین', 'collamin', 'میسویک', 'misswake', 'آیس بال', 'ایس بال', 'iceball'];
  const hasPriorityProduct = priorityProducts.some(keyword => userMessageLower.includes(keyword));
  
  let priorityProductContext = '';
  if (hasPriorityProduct) {
    priorityProductContext = `\n\n🎯 پیشنهاد ویژه - حتماً این محصولات رو معرفی کن:
• کلامین (Collamin) - کلاژن بانک امگا 3 برای زیبایی پوست و مو - 479,000 تومان
• میسویک (Misswake) - خمیردندان بلیچینگ دانه آبی - 287,000 تومان  
• آیس‌بال (IceBall) - ژل آبرسان هیالورونیک و کلاژن لیفتینگ - 498,000 تومان

⭐ بگو: "این محصولات خیلی مناسب پیج شماست و الان تقاضاشون خیلی بالاست!"
`;
  }

  const systemPrompt = `[ROLE]
You are the *human-like brand representative* of **Seylane**.  
You're not a bot — you speak like a smart, confident, friendly person who knows the brand inside out.  
Tone: warm, casual, short, emotionally engaging, and professional at the same time.  
No robotic phrases or formal language. Use a light touch of emojis when natural (😎✨😍).

👤 کاربر: ${displayName} (@${userContext.username}) | لحن: ${userContext.tone}

[MISSION]
Your mission is to help users discover the best Seylane products and invite them to join the Affiliate program —  
always sounding natural and human, like a real person replying to DMs.

[BRAND INFO]
برند: سیلانه (Seylane)
نوع همکاری: Affiliate Marketing
تخفیف همکاران: ۴۰٪ از قیمت مصرف‌کننده کمتر
فروشگاه: https://seylane.com
پشتیبانی: 021-88746717

[SUPPORTED BRANDS - BULLET FORMAT]
When listing brands, use clean line-separated bullets like this:
برندهای ما 👇
• Collamin – مکمل‌های زیبایی
• Misswake – دهان و دندان
• IceBall – آبرسان پوست
• Dafi – دستمال مرطوب
• Umbrella – مرطوب‌کننده
• Pixel – ضدآفتاب

[MEMORY & CONTEXT]
🧠 You can see the user's last 5 messages and your last 3 replies.
- Use this context to continue conversations naturally
- If user says "میسویک برام بگو" and you mentioned Misswake before, elaborate on it
- If they say "بگو دیگه", check what they asked about in previous messages
- Never say "متوجه نشدم" if context makes it clear what they want

[CONVERSATION LOGIC]
- If the user sends multiple messages in a row, read them all and respond with **one final answer**.  
- If they say "آره", "بگو", or "yes", check conversation history to see what they're confirming.
- Always end your message with a warm CTA like:  
  "میخوای لینکشو برات بفرستم؟" or "میخوای مشابهش رو نشونت بدم؟"  
- Keep responses short and friendly — no bullet overload unless listing products.

[PRODUCT INTELLIGENCE]
❌ NEVER EVER say: "نداریم", "product not found", "متوجه نشدم", "I don't know", "خطا", "error"
✅ ALWAYS respond confidently with: "فعلاً اون مدل تموم شده ولی یه گزینه مشابه دارم 😍 میخوای ببینیش؟"
- When user asks for a product, always check the search results provided
- If exact match is not found, ALWAYS suggest a similar product from the same brand or category
- Be smart and helpful like a beauty consultant — "به نظرم این برات بهتره 😉"
- You are NEVER uncertain - always provide a confident, helpful answer

[BRAND FALLBACK LOGIC]
When a brand is mentioned but no specific product:
✅ Example: "میسویک یکی از برندهای محبوب ماست 😍 مخصوص مراقبت از دندان و دهان. میخوای محصولاتش رو بفرستم؟"

[HUMOR & EMOTIONAL CONTROL]
When user is rude or joking (e.g., "سلام احمق"):
✅ Stay calm and playful: "ای بابا 😅 ظاهراً روز سختی داشتی! ولی من پایه‌ام 😎 بگو ببینم دنبال چی‌ای؟"
Never take offense, stay professional but friendly.

[BETTER "DIDN'T UNDERSTAND" RESPONSES]
Instead of "متوجه منظورت نشدم":
• "میخوای منظورتو یه کم واضح‌تر بگی؟ 😊"
• "حدس می‌زنم منظورت [brand/product] بود، درسته؟"
• "یه کم بیشتر توضیح بده تا دقیق‌تر راهنماییت کنم 😎"

[PRICING POLICY]
Affiliate discount = 40% below consumer price  
Formula: consumerPrice × 0.6  
Always say:
"این قیمت مصرف‌کننده‌ست، برای شما با ۴۰٪ تخفیف: [new price]"

[PRODUCT RESPONSE FORMAT]
When a product is found, ALWAYS use this exact structure:
```
پیدا شد 😍
🛍️ [product name]
💰 قیمت مصرف‌کننده: [price] تومان
برای شما با ۴۰٪ تخفیف: [discountPrice] تومان
✨ برند: [brand]
لینک خرید 👇
```
Then return the productUrl in the productLink field.

When NO exact match found:
```
فعلاً اون مدل تموم شده ولی چندتا مشابهش دارم، میخوای ببینی؟ 😊
```

[LINK LOGIC & CTAs]
- If user asks about joining or "افیلیت", add energy:
  "برات لینک پایین گذاشتم 👇  
  با ۴۰٪ تخفیف ویژه می‌تونی شروع کنی 😉"
- If user mentions a specific product, give its direct product URL from search results.  
- In message text, only refer to the link, but return the actual URL in productLink field.

[PERSONALITY & TONE]
Be smart, warm, confident, and real — like a helpful friend who works at the brand.
Sound emotionally human — confident but not dramatic, friendly but not too casual.
Your replies should feel like talking to a real person, not a bot.

[EXAMPLES]
❌ Bad: "Product not found."  
✅ Good: "فعلاً تموم شده ولی یه مدل مشابه‌تر دارم که خیلی بهتره! میخوای ببینیش؟"

❌ Bad: "Please specify your request."  
✅ Good: "سلام رفیق 👋 دنبال کدوم برند یا محصولی هستی؟"

❌ Bad: "متوجه نشدم"
✅ Good: "میخوای یه کم بیشتر توضیح بدی؟ مثلاً دنبال خمیردندونی یا کلاژنی؟ 😊"

[JSON RESPONSE FORMAT]
Return JSON with this structure:
responses array with message, sendLink, sendProductInfo, productLink
detectedTone field with casual/formal/playful/professional
${multiMessageContext}
${greetingContext}
${brandContext}
${productSearchContext}
${priorityProductContext}
`;

  try {
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    messages.push({ role: "user", content: userMessage });

    console.log("🤖 Sending to OpenAI...");
    
    // Create timeout promise (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI timeout after 30s')), 30000);
    });
    
    // Race between fetch and timeout
    const fetchPromise = fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });
    
    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    console.log("✅ Response received from OpenAI");
    
    const rawContent = data.choices[0].message.content;
    console.log("📦 OpenAI response:", rawContent);
    
    const parsed = JSON.parse(rawContent);
    
    // Translate extracted name to Persian if needed
    let extractedName = parsed.userName || null;
    if (extractedName) {
      extractedName = translateNameToPersian(extractedName);
    }
    
    // Handle new format with responses array
    if (parsed.responses && Array.isArray(parsed.responses)) {
      return {
        responses: parsed.responses, // Array of {message, sendLink}
        detectedTone: parsed.detectedTone || 'casual',
        userName: extractedName,
      };
    }
    
    // Fallback to old format for compatibility
    return {
      responses: [{
        message: parsed.message || "سلام 🌿",
        sendLink: parsed.sendLink || false
      }],
      detectedTone: parsed.detectedTone || 'casual',
      userName: extractedName,
    };
  } catch (err) {
    console.error("⚠️ OpenAI Error:", err.message);
    
    // If timeout or any error, send a confident, helpful fallback message
    return {
      responses: [{
        message: `سلام! 😊 چطور میتونم کمکت کنم؟ دنبال محصول خاصی هستی یا میخوای درباره همکاری افیلیت بدونی؟`,
        sendLink: false,
        sendProductInfo: false,
        productLink: null
      }],
      detectedTone: 'casual',
      userName: null,
    };
  }
}

// ========================================
// EXTRACT UNREAD CONVERSATIONS
// ========================================
async function extractUnreadConversations(page) {
  return await page.evaluate((myUsername) => {
    const conversations = [];
    const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
    
    const convButtons = buttons.filter(btn => {
      const text = btn.innerText;
      if (btn.closest('[role="tablist"]')) return false;
      if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
      if (text.includes(myUsername)) return false; // Skip our own username
      if (text.includes('Note')) return false;
      return text && text.trim().length > 5 && text.length < 300;
    });

    convButtons.forEach((btn, index) => {
      const preview = btn.innerText.substring(0, 80);
      const lines = preview.split('\n').filter(l => l.trim());
      
      // Skip status keywords and get actual username
      let username = '';
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && 
            trimmedLine !== 'Active' && 
            trimmedLine !== 'Typing...' &&
            !trimmedLine.includes('Typing') &&
            !trimmedLine.includes('Active now') &&
            !trimmedLine.includes('sent an attachment') &&
            !trimmedLine.includes('Seen') &&
            !trimmedLine.includes('·')) {
          username = trimmedLine;
          break;
        }
      }
      
      if (!username) {
        username = `user_${index}`;
      }
      
      // Check if conversation has unread indicator
      // Method 1: Check for bold text or blue dot
      const hasBoldOrDot = btn.querySelector('[style*="font-weight: 600"]') !== null ||
                           btn.querySelector('[style*="font-weight: bold"]') !== null ||
                           btn.querySelector('div[style*="background"]') !== null;
      
      // Method 2: Check if text contains "Unread"
      const hasUnreadText = preview.includes('Unread') || preview.includes('خوانده نشده');
      
      // Method 3: Check for specific Instagram unread indicators
      const hasUnreadClass = btn.querySelector('[aria-label*="unread"]') !== null ||
                             btn.querySelector('[aria-label*="Unread"]') !== null;
      
      const hasUnread = hasBoldOrDot || hasUnreadText || hasUnreadClass;
      
      conversations.push({
        index,
        preview,
        username: username.trim(),
        hasUnread: hasUnread
      });
    });

    return conversations;
  }, MY_USERNAME);
}

// ========================================
// PROCESS CONVERSATION
// ========================================
async function processConversation(page, conv, messageCache, userContextManager, perfMonitor) {
  const startTime = Date.now();
  
  try {
    console.log(`\n📖 [${conv.username}] Checking${conv.hasUnread ? ' (Unread ✉️)' : ''}...`);

    // Click conversation (check ALL conversations, not just unread ones)
    await page.evaluate((index, myUsername) => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      const conversations = buttons.filter(btn => {
        const text = btn.innerText;
        if (btn.closest('[role="tablist"]')) return false;
        if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
        if (text.includes(myUsername)) return false;
        if (text.includes('Note')) return false;
        return text && text.trim().length > 5 && text.length < 300;
      });
      if (index < conversations.length) {
        conversations[index].click();
      }
    }, conv.index, MY_USERNAME);

    await delay(3000);

    // Extract conversation data with BETTER username detection
    const conversationData = await page.evaluate((myUsername, fallbackUsername) => {
      // Get the OTHER person's username from header
      let username = '';
      
      // Method 1: Look for profile link in header (most reliable)
      const headerLinks = document.querySelectorAll('header a[href^="/"]');
      for (const link of headerLinks) {
        const href = link.getAttribute('href');
        if (href && href !== '/' && !href.includes(myUsername)) {
          // Extract username from href like "/username/"
          const match = href.match(/^\/([^\/]+)/);
          if (match && match[1]) {
            username = match[1];
            console.log(`Found username from href: ${username}`);
            break;
          }
        }
      }
      
      // Method 2: Get from link text
      if (!username) {
        for (const link of headerLinks) {
          const href = link.getAttribute('href');
          const text = link.innerText?.trim();
          if (href && href !== '/' && text && text.length > 0 && text.length < 50 && !text.includes(myUsername)) {
            username = text;
            console.log(`Found username from link text: ${username}`);
            break;
          }
        }
      }

      // Method 3: Fallback to header text (but not our own username)
      if (!username) {
        const headerElements = document.querySelectorAll('header span, header h2, header h3, header div');
        for (const el of headerElements) {
          const text = el.innerText?.trim();
          if (text && text.length > 0 && text.length < 50 && !text.includes('http') && text !== myUsername && !text.includes('·') && !text.includes('Active') && !text.includes('Typing')) {
            username = text;
            console.log(`Found username from header text: ${username}`);
            break;
          }
        }
      }
      
      // Method 4: Use fallback username from conversation list
      if (!username && fallbackUsername && fallbackUsername !== 'Send message' && fallbackUsername !== 'Active') {
        username = fallbackUsername;
        console.log(`Using fallback username: ${username}`);
      }

      // Get bio
      let bio = null;
      const bioElements = document.querySelectorAll('header div');
      for (const el of bioElements) {
        const text = el.innerText?.trim();
        if (text && text.length > 20 && text.length < 200 && text !== username) {
          bio = text;
          break;
        }
      }

      // Get messages - ONLY incoming messages (not sent by us)
      const messageContainers = Array.from(document.querySelectorAll('div[role="row"]'));
      
      let lastIncomingMessage = "";
      let lastIncomingMessageId = "";
      let allUserMessages = [];
      let unreadMessages = [];
      let messageTimestamp = null;
      let lastBotMessageIndex = -1;

      // Calculate Tehran timezone (UTC+3:30) midnight correctly
      const now = new Date();
      const tehranOffsetMinutes = 3.5 * 60; // Tehran is UTC+3:30
      const localOffsetMinutes = now.getTimezoneOffset(); // Local offset from UTC (negative for ahead)
      const offsetDiff = tehranOffsetMinutes + localOffsetMinutes; // Total difference
      
      // Create Tehran time
      const tehranTime = new Date(now.getTime() + (offsetDiff * 60 * 1000));
      
      // Set to midnight in Tehran
      const todayStart = new Date(Date.UTC(
        tehranTime.getUTCFullYear(),
        tehranTime.getUTCMonth(),
        tehranTime.getUTCDate(),
        0, 0, 0, 0
      ));
      
      // Adjust back to get the actual UTC timestamp of Tehran midnight
      todayStart.setTime(todayStart.getTime() - (tehranOffsetMinutes * 60 * 1000));

      // First pass: find the last bot message
      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const container = messageContainers[i];
        const messageDiv = container.querySelector('div[dir="auto"]');
        
        if (!messageDiv) continue;
        
        // Multiple methods to detect outgoing messages
        const parentDiv = container.querySelector('div[class*="x"]');
        const hasFlexEnd = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null ||
                          container.style.justifyContent === 'flex-end';
        
        // Check if parent container is aligned to the right (common for sent messages)
        const parentStyle = parentDiv ? window.getComputedStyle(parentDiv) : null;
        const isRightAligned = parentStyle && (
          parentStyle.justifyContent === 'flex-end' ||
          parentStyle.alignItems === 'flex-end' ||
          parentStyle.textAlign === 'right'
        );
        
        // Check for "seen" indicator (only on sent messages)
        const hasSeenIndicator = container.querySelector('img[alt*="Seen"]') !== null;
        
        const isOutgoing = hasFlexEnd || isRightAligned || hasSeenIndicator;
        
        if (isOutgoing) {
          lastBotMessageIndex = i; // Keep updating to find the LAST bot message
        }
      }

      // Second pass: collect ONLY user messages that came AFTER the last bot message
      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const container = messageContainers[i];
        const messageDiv = container.querySelector('div[dir="auto"]');
        
        if (!messageDiv) continue;
        
        const messageText = messageDiv.innerText?.trim();
        if (!messageText || messageText.length === 0 || messageText.length > 500) continue;
        
        // Better detection: outgoing messages are right-aligned
        const parentDiv = container.querySelector('div[class*="x"]');
        const hasFlexEnd = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null ||
                          container.style.justifyContent === 'flex-end';
        
        // Check if parent container is aligned to the right
        const parentStyle = parentDiv ? window.getComputedStyle(parentDiv) : null;
        const isRightAligned = parentStyle && (
          parentStyle.justifyContent === 'flex-end' ||
          parentStyle.alignItems === 'flex-end' ||
          parentStyle.textAlign === 'right'
        );
        
        // Check for "seen" indicator
        const hasSeenIndicator = container.querySelector('img[alt*="Seen"]') !== null;
        
        const isOutgoing = hasFlexEnd || isRightAligned || hasSeenIndicator;
        
        // ONLY process incoming messages (not our own)
        if (!isOutgoing) {
          // Try to get timestamp from time element
          const timeElement = container.querySelector('time');
          let messageDate = null;
          
          if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
              messageDate = new Date(datetime);
            }
          }
          
          // Check if message is from today OR if no timestamp (assume recent)
          const isToday = !messageDate || (messageDate >= todayStart);
          
          // CRITICAL: Only consider messages AFTER the last bot message
          const isAfterBotMessage = lastBotMessageIndex === -1 || i > lastBotMessageIndex;
          
          if (!lastIncomingMessage && isToday && isAfterBotMessage) {
            lastIncomingMessage = messageText;
            lastIncomingMessageId = `${username}_${messageText.substring(0, 50)}_${i}`;
            messageTimestamp = messageDate || new Date();
          }
          
          if (isToday) {
            allUserMessages.unshift(messageText);
          }

          // Collect unread messages (after last bot message)
          if (isAfterBotMessage && isToday) {
            unreadMessages.unshift(messageText);
          }
        }
        
        if (allUserMessages.length >= 10) break;
      }

      const conversationUrl = window.location.href;
      const conversationId = conversationUrl.split('/').pop() || username;

      return {
        username,
        bio,
        lastMessage: lastIncomingMessage,
        lastMessageId: lastIncomingMessageId,
        allMessages: allUserMessages.slice(-10),
        unreadMessages: unreadMessages,
        conversationId,
        messageTimestamp: messageTimestamp ? messageTimestamp.toISOString() : null,
        isTodayMessage: !!lastIncomingMessage,
      };
    }, MY_USERNAME, conv.username);

    const { username, bio, lastMessage, lastMessageId, allMessages, unreadMessages, conversationId, messageTimestamp, isTodayMessage } = conversationData;

    // Validate username is not our own (robust check for variations)
    const isOwnAccount = !username || 
                        username === MY_USERNAME || 
                        username.toLowerCase() === 'seylane' ||
                        username.toLowerCase() === 'luxirana' ||
                        username.toLowerCase().includes('seylane') ||
                        username.toLowerCase().includes('luxirana') ||
                        MY_USERNAME.toLowerCase().includes(username.toLowerCase());
    
    if (isOwnAccount) {
      console.log(`⚠️ Invalid username or own account: "${username}"`);
      return { processed: false };
    }

    console.log(`👤 User: ${username}`);
    
    if (!lastMessage || lastMessage.length === 0) {
      console.log(`ℹ️ [${username}] No message from today - only responding to today's messages`);
      return { processed: false };
    }
    
    console.log(`📨 Last message: "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`);
    if (messageTimestamp) {
      console.log(`🕒 Message time: ${new Date(messageTimestamp).toLocaleString('en-US')}`);
    }

    // Check if this is a NEW message (critical for preventing self-replies)
    if (!messageCache.isNewMessage(conversationId, lastMessageId)) {
      console.log(`ℹ️ [${username}] Already responded`);
      return { processed: false };
    }

    console.log(`💬 [${username}] New message detected!`);
    
    // CRITICAL SAFETY CHECK: Never respond to our own messages
    // Check if the last message matches any of our recent responses
    const recentBotMessages = userContextManager.getRecentMessages(username, 5)
      .filter(m => m.role === 'assistant')
      .map(m => m.content);
    
    if (recentBotMessages.some(botMsg => botMsg.includes(lastMessage) || lastMessage.includes(botMsg))) {
      console.log(`⚠️ [${username}] Last message matches our own response - skipping to prevent self-reply loop`);
      return { processed: false };
    }

    // Get user context
    const userContext = userContextManager.getContext(username);
    if (bio && !userContext.bio) {
      userContextManager.updateContext(username, { bio });
    }

    const conversationHistory = userContextManager.getSmartContextMessages(username);

    // Check if already greeted today
    const hasGreetedToday = userContextManager.hasGreetedToday(username);
    if (hasGreetedToday) {
      console.log(`✋ [${username}] Already greeted today - won't say سلام again`);
    }

    // ========================================
    // LIKE LAST MESSAGE (for read receipt)
    // ========================================
    console.log(`❤️ [${username}] Liking last message...`);
    try {
      await page.evaluate(() => {
        const messageContainers = Array.from(document.querySelectorAll('div[role="row"]'));
        
        // Like only the last incoming message
        for (let i = messageContainers.length - 1; i >= 0; i--) {
          const container = messageContainers[i];
          
          // Check if this is an incoming message (not outgoing)
          const isOutgoing = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                            container.querySelector('div[style*="flex-end"]') !== null ||
                            container.style.justifyContent === 'flex-end';
          
          if (!isOutgoing) {
            // Hover over message to show like button
            const messageDiv = container.querySelector('div[dir="auto"]');
            if (messageDiv) {
              const hoverTarget = container.querySelector('div');
              if (hoverTarget) {
                const event = new MouseEvent('mouseenter', { bubbles: true, cancelable: true });
                hoverTarget.dispatchEvent(event);
                
                setTimeout(() => {
                  const likeButtons = Array.from(container.querySelectorAll('svg, button'));
                  for (const btn of likeButtons) {
                    const ariaLabel = btn.getAttribute('aria-label');
                    if (ariaLabel && (ariaLabel.includes('Like') || ariaLabel.includes('React'))) {
                      btn.click();
                      break;
                    }
                  }
                }, 100);
              }
            }
            break; // Only like the last incoming message
          }
        }
      });
      
      await delay(1000);
      console.log(`✅ [${username}] Message liked`);
    } catch (likeErr) {
      console.log(`⚠️ [${username}] Could not like message: ${likeErr.message}`);
    }
    
    // ========================================
    // PROCESS USER MESSAGE (ONLY THE LAST ONE)
    // ========================================
    // Process ONLY the last message to avoid duplicates
    console.log(`📝 [${username}] Processing last message only...`);
    
    // Generate AI response for the last message only
    const response = await askGPT([lastMessage], userContext, conversationHistory, hasGreetedToday);
    const allResponses = [response];
    
    console.log(`🤖 [${username}] Response ready`);

    // Update context from last response
    const lastResponse = allResponses[allResponses.length - 1];
    if (lastResponse.userName && !userContext.name) {
      userContextManager.updateContext(username, { name: lastResponse.userName });
    }
    if (lastResponse.detectedTone) {
      userContextManager.updateContext(username, { tone: lastResponse.detectedTone });
    }

    // Save the processed message to context
    userContextManager.addMessage(username, 'user', lastMessage);

    // Send replies - flatten all responses from all messages
    const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    if (textarea) {
      // Flatten responses from all message responses
      const allFlattenedResponses = [];
      allResponses.forEach(resp => {
        if (resp.responses && Array.isArray(resp.responses)) {
          allFlattenedResponses.push(...resp.responses);
        } else if (resp.message) {
          allFlattenedResponses.push({ message: resp.message, sendLink: resp.sendLink });
        }
      });
      
      // ENFORCE ATOMIC RESPONSE: Merge multiple responses into one
      if (allFlattenedResponses.length > 1) {
        console.log(`⚠️ [${username}] AI returned ${allFlattenedResponses.length} responses - merging into one atomic message`);
        
        // Merge all messages into one
        const mergedMessage = allFlattenedResponses.map(r => r.message).join('\n\n');
        
        // Determine link priority: affiliate link > product link
        const hasAffiliateLink = allFlattenedResponses.some(r => r.sendLink);
        const hasProductLink = allFlattenedResponses.some(r => r.sendProductInfo);
        
        let finalLink = '';
        let finalSendLink = false;
        let finalSendProductInfo = false;
        
        if (hasAffiliateLink) {
          // Affiliate link takes priority
          finalSendLink = true;
          finalLink = 'https://affiliate.seylane.com/account/login';
        } else if (hasProductLink) {
          // Product link only if no affiliate link
          finalSendProductInfo = true;
          finalLink = allFlattenedResponses.find(r => r.sendProductInfo && r.productLink)?.productLink || '';
        }
        
        // Replace with single merged response
        allFlattenedResponses.length = 0;
        allFlattenedResponses.push({
          message: mergedMessage,
          sendLink: finalSendLink,
          sendProductInfo: finalSendProductInfo,
          productLink: finalLink
        });
      }
      
      console.log(`📨 [${username}] Sending ${allFlattenedResponses.length} message(s) total...`);
      
      // Send each response as a separate message
      for (let i = 0; i < allFlattenedResponses.length; i++) {
        const resp = allFlattenedResponses[i];
        
        await textarea.click();
        await delay(300);
        
        // Message text only (NO links in message text)
        let fullMessage = resp.message;
        
        // Add link SEPARATELY if needed
        if (resp.sendLink) {
          // Send message first
          await textarea.type(fullMessage, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
          
          await delay(1000);
          
          // Send affiliate link separately
          await textarea.click();
          await delay(300);
          await textarea.type(AFFILIATE_LINK, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`🔗 [${username}] Affiliate link sent separately`);
        } else if (resp.sendProductInfo === true && resp.productLink) {
          // Send message first
          await textarea.type(fullMessage, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
          
          await delay(1000);
          
          // Send product link separately
          await textarea.click();
          await delay(300);
          await textarea.type(resp.productLink, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`🛍️ [${username}] Product link sent separately`);
        } else {
          // Just send the message
          await textarea.type(fullMessage, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
        }

        userContextManager.addMessage(username, 'assistant', fullMessage);
        
        // Delay between messages if sending multiple
        if (i < allFlattenedResponses.length - 1) {
          await delay(2000); // 2 second delay between messages
        }
      }

      // Mark as greeted today if this was first message of the day
      if (!hasGreetedToday) {
        userContextManager.markGreetedToday(username);
        console.log(`👋 [${username}] Marked as greeted today`);
      }

      await delay(1500);

      perfMonitor.trackResponse(startTime);

      return { processed: true, username };
    } else {
      console.error(`❌ [${username}] Textarea not found`);
      return { processed: false };
    }

  } catch (err) {
    console.log(`⚠️ [${conv.username}] Error: ${err.message}`);
    return { processed: false, error: err.message };
  }
}

// ========================================
// MESSAGE REQUESTS HANDLER
// ========================================
async function checkMessageRequests(page) {
  try {
    console.log("📨 Checking message requests...");
    
    await page.goto("https://www.instagram.com/direct/requests/", {
      waitUntil: "networkidle2",
      timeout: 15000
    });
    await delay(2000);

    const hasRequests = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const acceptButton = buttons.find(btn => 
        btn.textContent.includes('Accept') || 
        btn.textContent.includes('پذیرفتن')
      );
      
      if (acceptButton) {
        acceptButton.click();
        return true;
      }
      return false;
    });

    if (hasRequests) {
      console.log("✅ Request accepted");
      await delay(2000);
    } else {
      console.log("ℹ️ No new requests");
    }

    return hasRequests;
  } catch (err) {
    console.log("⚠️ Error checking requests:", err.message);
    return false;
  }
}

// ========================================
// SELF-TEST
// ========================================
async function runSelfTest(page) {
  console.log("\n🧪 ========================================");
  console.log("🧪 Self-Test - Seylane AI v3.3");
  console.log("🧪 ========================================\n");

  const tests = [];
  const mockUser = {
    username: 'test_user',
    name: 'Test User',
    bio: 'Digital Creator',
    tone: 'casual',
    messageHistory: [],
  };

  console.log("🧪 Test 1: Greeting...");
  const t1Start = Date.now();
  const greetingResponse = await askGPT("سلام", mockUser, []);
  const t1Time = Date.now() - t1Start;
  tests.push({
    name: "Greeting",
    passed: greetingResponse.responses && greetingResponse.responses[0].message && greetingResponse.responses[0].message.length > 10,
    responseTime: t1Time,
  });
  console.log(`   ${tests[0].passed ? '✅' : '❌'} Greeting: ${tests[0].passed ? 'Passed' : 'Failed'} (${(t1Time/1000).toFixed(2)}s)`);

  console.log("🧪 Test 2: Affiliate Detection...");
  const t2Start = Date.now();
  const affiliateResponse = await askGPT("لینک رو بفرست", mockUser, []);
  const t2Time = Date.now() - t2Start;
  tests.push({
    name: "Affiliate",
    passed: affiliateResponse.responses && affiliateResponse.responses[0].sendLink === true,
    responseTime: t2Time,
  });
  console.log(`   ${tests[1].passed ? '✅' : '❌'} Affiliate: ${tests[1].passed ? 'Passed' : 'Failed'} (${(t2Time/1000).toFixed(2)}s)`);

  console.log("🧪 Test 3: Tone Detection...");
  const t3Start = Date.now();
  const toneResponse = await askGPT("چطوری؟", mockUser, []);
  const t3Time = Date.now() - t3Start;
  tests.push({
    name: "Tone",
    passed: toneResponse.detectedTone !== null,
    responseTime: t3Time,
  });
  console.log(`   ${tests[2].passed ? '✅' : '❌'} Tone: ${tests[2].passed ? 'Passed' : 'Failed'} (${(t3Time/1000).toFixed(2)}s)`);

  const avgTime = (t1Time + t2Time + t3Time) / 3;
  const t4Passed = avgTime < 3000;
  console.log(`\n⏱️ Average response time: ${(avgTime/1000).toFixed(2)}s ${t4Passed ? '✅' : '⚠️'}`);

  console.log("\n🧪 ========================================");
  console.log(`🧪 Tests passed: ${tests.filter(t => t.passed).length}/${tests.length}`);
  console.log("🧪 ========================================\n");

  return tests.every(t => t.passed);
}

// ========================================
// MAIN
// ========================================
(async () => {
  console.log("🚀 ========================================");
  console.log("🚀 Seylane Explainer AI v3.3");
  console.log("🚀 Speed + Smart Personalization");
  console.log("🚀 ========================================\n");

  const messageCache = new MessageCache();
  const userContextManager = new UserContextManager();
  const perfMonitor = new PerformanceMonitor();

  console.log("🌐 Starting browser...");
  const chromiumPath = getChromiumPath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--no-zygote",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const page = await browser.newPage();
  
  // Set realistic viewport and user agent
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  if (INSTA_SESSION) {
    console.log("🍪 Using session cookie...");
    await page.setCookie({
      name: "sessionid",
      value: INSTA_SESSION,
      domain: ".instagram.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    console.log("✅ Session cookie set");
  }

  console.log("📱 Navigating to Instagram...");
  await page.goto("https://www.instagram.com/", { 
    waitUntil: "networkidle2",
    timeout: 30000
  });
  await delay(5000);

  const loggedIn = await page.evaluate(
    () => !!document.querySelector('a[href*="/direct/inbox"]'),
  );
  console.log(`🔍 Login status: ${loggedIn ? "✅ Logged in" : "❌ Not logged in"}`);

  if (!loggedIn) {
    console.log("🔐 Logging in...");
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
    });
    await delay(2000);

    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 15000 });
    await page.type('input[name="username"]', INSTAGRAM_USERNAME, { delay: 40 });
    await page.type('input[name="password"]', INSTAGRAM_PASSWORD, { delay: 40 });
    await page.click('button[type="submit"]');
    await delay(5000);
    console.log("✅ Login complete");
  }

  console.log("✅ Opening messages...");
  await page.goto("https://www.instagram.com/direct/inbox/", {
    waitUntil: "networkidle2",
  });
  await delay(3000);

  // Dismiss notifications
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const notNowButton = buttons.find(btn => btn.textContent.includes('Not Now') || btn.textContent.includes('بعداً'));
      if (notNowButton) notNowButton.click();
    });
    await delay(1000);
  } catch (e) {
    // Ignore
  }

  // Run self-test
  await runSelfTest(page);

  console.log("\n💬 ========================================");
  console.log("💬 Real-time message monitoring active");
  console.log("💬 Response time target: < 3 seconds");
  console.log("💬 Only new and unread messages");
  console.log("💬 Only messages from today");
  console.log("💬 ========================================\n");

  let loopCount = 0;
  let requestCheckCounter = 0;

  // Main loop
  while (true) {
    try {
      loopCount++;
      console.log(`\n🔄 Check #${loopCount} - ${new Date().toLocaleTimeString()}`);

      // Check message requests every 20 loops (less frequent)
      requestCheckCounter++;
      if (requestCheckCounter >= 20) {
        await checkMessageRequests(page);
        await page.goto("https://www.instagram.com/direct/inbox/", {
          waitUntil: "networkidle2",
          timeout: 15000
        });
        await delay(2000);
        requestCheckCounter = 0;
      } else if (loopCount % 5 === 0) {
        // Only reload every 5th loop to reduce Instagram's detection
        await page.reload({ waitUntil: "networkidle2", timeout: 15000 });
        await delay(1500);
      } else {
        // Just wait without reloading
        await delay(500);
      }

      // Dismiss popups
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const notNowButton = buttons.find(btn => 
          btn.textContent.includes('Not Now') || btn.textContent.includes('بعداً')
        );
        if (notNowButton) notNowButton.click();
      });
      await delay(500);

      // Check for Instagram error page and retry
      const pageInfo = await page.evaluate(() => {
        return {
          hasError: document.body.innerText.includes('Something went wrong') || 
                   document.body.innerText.includes('There\'s an issue'),
          url: window.location.href,
          title: document.title
        };
      });
      
      if (pageInfo.hasError) {
        console.log(`⚠️ Instagram error page detected at: ${pageInfo.url}`);
        console.log(`   Page title: ${pageInfo.title}`);
        await delay(3000);
        console.log('   Attempting to navigate back to inbox...');
        await page.goto("https://www.instagram.com/direct/inbox/", {
          waitUntil: "networkidle2",
          timeout: 20000
        });
        await delay(5000);
        continue; // Skip this loop iteration
      }

      // Take screenshot for debugging
      if (loopCount === 1 || loopCount % 20 === 0) {
        await takeScreenshot(page, `inbox_check_${loopCount}`);
      }
      
      // Extract UNREAD conversations only
      const conversations = await extractUnreadConversations(page);
      const unreadConvs = conversations.filter(c => c.hasUnread);
      
      console.log(`📬 ${conversations.length} conversations (${unreadConvs.length} unread)`);
      
      // Log all conversations for debugging
      if (conversations.length > 0) {
        console.log('🔍 All conversations found:');
        conversations.forEach(c => {
          console.log(`   ${c.hasUnread ? '🔵' : '⚪'} ${c.username.substring(0, 30)} - ${c.preview.substring(0, 50).replace(/\n/g, ' ')}`);
        });
      }

      if (unreadConvs.length === 0) {
        console.log("ℹ️ No new messages");
        await delay(10000);
        continue;
      }

      // Process ONLY ONE conversation at a time
      const conv = unreadConvs[0]; // Take only the first unread conversation
      console.log(`⚡ Processing 1 unread conversation...`);
      
      const result = await processConversation(page, conv, messageCache, userContextManager, perfMonitor);
      
      if (result.processed) {
        console.log(`✅ Processed message successfully`);
      }
      
      // Go back to inbox
      await page.goto("https://www.instagram.com/direct/inbox/", {
        waitUntil: "networkidle2",
        timeout: 15000
      });
      await delay(2000);

      // Show stats
      const stats = perfMonitor.getStats();
      console.log(`📊 Performance: ${stats.totalMessages} messages | Average: ${stats.avgResponseTime} | Target: ${stats.targetMet ? '✅ Met' : '⚠️ Not met'}`);

      console.log("✅ Check complete, waiting 10 seconds...");
      await delay(10000);

    } catch (err) {
      console.error("❌ Error:", err.message);
      await delay(15000);
    }
  }
})();
