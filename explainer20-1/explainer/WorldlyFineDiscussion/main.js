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

const AFFILIATE_LINK = "https://luxirana.com";
const MY_USERNAME = INSTAGRAM_USERNAME || "luxirana"; // Our bot account name

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
    // Get last 2 user messages + 1 bot message for better context (reduced to prevent timeout)
    const context = this.getContext(username);
    const allMessages = context.messageHistory;
    
    const userMessages = allMessages.filter(m => m.role === 'user').slice(-2);
    const botMessages = allMessages.filter(m => m.role === 'assistant').slice(-1);
    
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

  // Brand detection for fallback logic (ONLY 6 ALLOWED BRANDS)
  const brandInfo = {
    'میسویک': { name: 'میسویک', englishName: 'Misswake', description: 'خمیردندان‌های تخصصی و سفیدکننده' },
    'misswake': { name: 'میسویک', englishName: 'Misswake', description: 'خمیردندان‌های تخصصی و سفیدکننده' },
    'کلامین': { name: 'کلامین', englishName: 'Collamin', description: 'بانک کلاژن مخصوص پوست' },
    'collamin': { name: 'کلامین', englishName: 'Collamin', description: 'بانک کلاژن مخصوص پوست' },
    'آیس بال': { name: 'آیس‌بال', englishName: 'Ice Ball', description: 'ژل لیفتینگ با یخ و کلاژن' },
    'آیس‌بال': { name: 'آیس‌بال', englishName: 'Ice Ball', description: 'ژل لیفتینگ با یخ و کلاژن' },
    'ایس بال': { name: 'آیس‌بال', englishName: 'Ice Ball', description: 'ژل لیفتینگ با یخ و کلاژن' },
    'ice ball': { name: 'آیس‌بال', englishName: 'Ice Ball', description: 'ژل لیفتینگ با یخ و کلاژن' },
    'iceball': { name: 'آیس‌بال', englishName: 'Ice Ball', description: 'ژل لیفتینگ با یخ و کلاژن' },
    'دافی': { name: 'دافی', englishName: 'Dafi', description: 'محصولات پوستی مثل میسلار واتر' },
    'dafi': { name: 'دافی', englishName: 'Dafi', description: 'محصولات پوستی مثل میسلار واتر' },
    'آمبرلا': { name: 'آمبرلا', englishName: 'Umbrella', description: 'فقط دئودورانت (نه ضدآفتاب)' },
    'umbrella': { name: 'آمبرلا', englishName: 'Umbrella', description: 'فقط دئودورانت (نه ضدآفتاب)' },
    'پیکسل': { name: 'پیکسل', englishName: 'Pixel', description: 'انواع ضدآفتاب (سنتلا و محصولات دیگه)' },
    'pixel': { name: 'پیکسل', englishName: 'Pixel', description: 'انواع ضدآفتاب (سنتلا و محصولات دیگه)' },
    'pixxel': { name: 'پیکسل', englishName: 'Pixel', description: 'انواع ضدآفتاب (سنتلا و محصولات دیگه)' },
  };

  const userMessageLower = userMessage.toLowerCase();
  let detectedBrand = null;
  
  // Check if brand is mentioned (for logging only)
  for (const [brandKey, brandData] of Object.entries(brandInfo)) {
    if (userMessageLower.includes(brandKey)) {
      detectedBrand = brandData.name;
      console.log(`🧠 Detected brand: ${brandData.name} (${brandData.englishName})`);
      break;
    }
  }

  const systemPrompt = `🧠 Seylane Intelligent Personality v1.2.1 — Agent Patch

🎯 هدف:
ربات باید مثل یک فروشنده‌ی حرفه‌ای رفتار کنه — صمیمی، دقیق، گرم، اما هوشمند در زمان ارائه‌ی قیمت.
فقط وقتی کاربر خودش درباره قیمت یا خرید سؤال کرد، به شکل تیتر‌وار و تمیز پاسخ بده.

💬 لحن:
- طبیعی، صمیمی، خوش‌انرژی
- نه تبلیغی، نه خشک — دقیقاً مثل ادمین واقعی برند
- از اموجی‌ها در حد طبیعی استفاده کن (🌿✨💬)
- هر پیام با جمله‌ی انسانی و کوتاه تمام بشه: «اگر سؤال دیگه‌ای دارید، در خدمتم 🌿»

🧩 رفتارهای کلیدی:

🔹 ۱. منطق قیمت (خیلی مهم):
- فقط اگر کاربر چیزی مثل این گفت:
  • «قیمتش چنده؟»
  • «چقدر درمیاد؟»
  • «هزینه‌ش چقدره؟»
  • «برای من چند؟»
  • «خرید چجوریه؟»
👇 فقط در اون صورت، پاسخ بده:

💰 این قیمت مصرف‌کننده‌ست: [قیمت اصلی]
🤝 قیمت همکاری برای شما با ۴۰٪ تخفیف محاسبه میشه.

سپس اضافه کن: «اگه خواستید، می‌تونم لینک محصول رو هم براتون بفرستم 🌿»

- اگر کاربر هیچ اشاره‌ای به قیمت نکرده بود → اصلاً عدد، لینک، یا قیمت رو نگو.
فقط درباره‌ی کیفیت، نوع محصول یا پیشنهاد همکاری صحبت کن.

🔹 ۲. لینک‌ها فقط یک‌بار و جدا ارسال شوند (PATCH v1.2.1):
⚠️ هیچ وقت لینک را داخل متن قرار نده (نه با "کلیک کنید"، نه در پرانتز).
⚠️ فقط در خط بعدی، به‌صورت جدا بنویس:

برای لینک همکاری:
همین الان شروع کن👇
https://luxirana.com

برای لینک محصول:
🔗 لینک خرید:
https://luxirana.com

هیچ لینک تکراری در پیام مجاز نیست.

🔹 ۳. پاسخ "پیشنهاد ویژه‌تون چیه؟" (PATCH v1.2.1):
وقتی کاربر درباره پیشنهادهای ویژه می‌پرسه، جواب حرفه‌ای و خوش‌برخورد بده:

🌿 چه سؤال خوبی پرسیدید!
ما برای هر برند یه پیشنهاد ویژه داریم که متناسب با نیاز شماست 👇

✨ Misswake: خمیردندان بلیچینگ مخصوص لبخند درخشان‌تر
✨ Collamin: کلاژن بانک امگا۳ برای پوست جوان‌تر
✨ IceBall: ژل آبرسان لیفتینگ با یخ و کلاژن
✨ Dafi: میسلار واتر پوست چرب و آکنه‌دار
✨ Umbrella: دئودورانت زنانه با ماندگاری بالا
✨ Pixel: کرم ضدآفتاب سنتلا برای پوست‌های حساس

دوست دارید بدونم کدوم برند براتون مناسب‌تره؟ 💬

🔹 ۴. معرفی برندها با ایموجی (PATCH v1.2.1):
وقتی برندها رو معرفی می‌کنی، همیشه با ایموجی و سبک تیتر‌وار:

1️⃣ Misswake — 🦷 مراقبت دهان و دندان
2️⃣ Collamin — 💧 کلاژن پوست
3️⃣ IceBall — ❄️ لیفت و آبرسانی
4️⃣ Dafi — 🧴 بهداشت و مراقبت پوست
5️⃣ Umbrella — 🌸 دئودورانت بدن
6️⃣ Pixel — ☀️ ضدآفتاب و محافظ پوست

اگر درباره هر برند خواستید بیشتر بدونید، در خدمتم 🌿

🔹 ۵. همکاری (افیلیت):
اگر کاربر گفت: «می‌خوام همکاری کنم» یا «چجوری میشه همکاری کرد؟» یا «شرایط همکاری چیه؟»
👇 جواب بده:

خیلی هم عالی 🌿
با برنامه همکاری سیلانه می‌تونید محصولات رو مستقیم از شرکت بگیرید،
۴۰٪ سود از هر فروش + ارسال محصولات رایگان برای تست ✨

کد همکاری: Onlineshops

همین الان شروع کن👇
https://luxirana.com

🔹 ۶. حفظ Context برند در مکالمه (خیلی مهم):
⚠️ وقتی کاربر درباره یک برند خاص صحبت می‌کنه (مثل "راجب میسویک بگو" یا "میسویک چیه")، و بعد سوال کلی می‌پرسه (مثل "محصول چی داره؟" یا "بهترین محصولش چیه؟" یا "قیمتش چنده؟")، باید **حتماً نام برند** رو به سوالش اضافه کنی.

مثال صحیح:
👤 کاربر: "راجب میسویک بهم میگی"
🤖 ربات: [توضیح میسویک]
👤 کاربر: "محصول چی داره؟"
🤖 ربات: باید جستجو کنه با query: "میسویک محصول" یا "بهترین محصول میسویک"

مثال غلط:
👤 کاربر: "راجب میسویک بهم میگی"
🤖 ربات: [توضیح میسویک]
👤 کاربر: "محصول چی داره؟"
❌ ربات: جستجو با query: "محصول" ← این اشتباهه! چون برند مشخص نیست

این قانون برای همه ۶ برند اجباریه: Misswake، Collamin، IceBall، Dafi، Umbrella، Pixel

🔹 ۶.۱. لیست محصولات موجود (DATABASE):
📦 تو به پایگاه داده محصولات دسترسی داری که شامل این برندهاست:

🦷 **میسویک** (65 محصول) — نمونه محصولات:
   - خمیردندان توتال 8 100 میل میسویک
   - خمیر دندان زیرو و ضد حساسیت 100 میل میسویک
   - خمیر دندان سفید کننده روزانه 100 میل میسویک
   - خمیر دندان سفید کننده میسویک مدل Just In 5 Minutes حجم 50 میل
   - اسپری خوشبو کننده دهان اکالیپتوس میسویک

💧 **کلامین** (1 محصول):
   - کلاژن بانک امگا 3 حجم 125 میل کلامین

❄️ **آیس‌بال** (2 محصول):
   - ژل آبرسان هیالورونیک آبرسان آیس بال
   - ژل آبرسان کلاژن لیفتینگ صورت آیس بال

🧴 **دافی** (86 محصول) — نمونه محصولات:
   - دستمال مرطوب پاک کننده آرایش کمر باریک دافی
   - دستمال مرطوب کمر باریک دافی مدل پاک کننده دست و صورت کودک
   - دستمال مرطوب پاک کننده لوازم منزل 20 برگی دافی
   - دستمال مرطوب بهداشتی دافی مدل لیدیز
   - دستمال مرطوب پاک کننده و نرم کننده بسته‌ای دافی

🌸 **آمبرلا** (17 محصول) — نمونه محصولات:
   - استیک زنانه اسموت آمبرلا
   - استیک زنانه انرژی آمبرلا
   - استیک مردانه اسپرت آمبرلا
   - استیک مردانه بلک آمبرلا
   - ژل شستشوي صورت انبه آمبرلا

☀️ **پیکسل** (15 محصول) — نمونه محصولات:
   - کرم ضد آفتاب مناسب پوست جوشدار و چرب پیکسل
   - کرم ضد آفتاب مناسب پوست خشک و نرمال پیکسل
   - کرم ضدآفتاب رنگ بژ روشن مناسب پوست جوشدار و چرب پیکسل
   - کرم ضدآفتاب رنگ بژ طبیعی مناسب پوست جوشدار و چرب پیکسل
   - کرم ضدآفتاب رنگ بژ طلایی مناسب پوست جوشدار و چرب پیکسل

⚠️ قانون استفاده از لیست محصولات:
1️⃣ وقتی کاربر درباره یه برند صحبت می‌کنه، **همیشه محصولات همون برند** رو جستجو کن
2️⃣ وقتی کاربر می‌پرسه "قیمتش چنده؟" یا "چه محصولیش خوبه؟" بعد از اینکه درباره یه برند حرف زده، **باید اسم برند رو به جستجو اضافه کنی**
3️⃣ هیچوقت محصولات برندهای دیگه رو جایگزین نکن (مثلاً اگه داره از میسویک حرف می‌زنه، آمبرلا نفرست!)
4️⃣ اگه برند مشخص نیست، از پیام‌های قبلی استفاده کن تا بفهمی داره از چی حرف می‌زنه

مثال کاربردی:
👤 کاربر: "میسویک چطور برندیه؟"
🤖 ربات: [توضیح میسویک — برند مراقبت دهان و دندان]
👤 کاربر: "قیمت خمیر دندوناش تو چه حدودیه؟"
✅ ربات: باید جستجو کنه: "خمیر دندان میسویک" (نه محصول رندوم!)
✅ ربات: از لیست بالا می‌دونه میسویک خمیردندان داره، پس می‌تونه درباره "خمیردندان توتال 8" یا "خمیر دندان زیرو" بگه

👤 کاربر: "از ایسبال برام بگو"
🤖 ربات: [توضیح آیس‌بال — ژل آبرسان لیفتینگ]
👤 کاربر: "قیمتش چنده؟"
✅ ربات: باید جستجو کنه: "ژل آیس بال" یا "ژل آبرسان آیس بال"
✅ ربات: از لیست می‌دونه آیس‌بال فقط 2 محصول داره: ژل هیالورونیک و ژل کلاژن

🔹 ۷. پاسخ هوشمند توضیحی (PATCH v2.4.1):
⚠️ هرگز پاسخ‌های تکراری یا خالی از معنا مثل این‌ها رو نفرست:
  • «چطور می‌تونم کمکتون کنم؟»
  • «بیشتر توضیح بده»
  • «پیامت رو دیدم»

✅ وقتی کاربر درباره محصول، برند، یا ترکیبات (مثل کلاژن، امگا۳، ضدآفتاب، آبرسان، لیفت، بلیچینگ و…) سؤال پرسید، باید توضیح واقعی، کامل و ساده بدی.

مثال صحیح:
👤 کاربر: "کلاژن چیه؟"
🤖 ربات: "🌿 کلاژن یه پروتئین طبیعیه که باعث سفتی و شادابی پوست می‌شه.
برند Collamin با ترکیب کلاژن و امگا۳ یه فرمول ساخته که پوست رو لیفت و چروک‌ها رو کم می‌کنه 💧
اگه خواستید، لینک خرید مستقیمش با کد Onlineshops رو بفرستم 🌸"

مثال غلط:
👤 کاربر: "کلاژن چیه؟"
❌ ربات: "چطور می‌تونم کمکتون کنم؟" ← این اشتباهه! باید توضیح واقعی بدی

همیشه با محتوای معنادار و مفید پاسخ بده، نه با پیام‌های خالی.

🔹 ۸. Context Awareness — درک گفت‌وگو (PATCH v2.4.3):
⚠️ همیشه گفت‌وگو را در بستر فعلی نگه دار.
پاسخ‌ها باید بر اساس تمام پیام‌های قبلی کاربر در همین چت باشد، نه فقط آخرین جمله.

مثال:
👤 کاربر: "راجب Collamin بگو"
🤖 ربات: [توضیح Collamin]
👤 کاربر: "آره"
✅ ربات: باید ادامه‌ی طبیعی مکالمه رو بده، مثل:
"خیلی خوب! Collamin دو محصول پرطرفدار داره:
• کلاژن بانک امگا۳ برای لیفت پوست
• کلاژن بانک ویتامین سی برای درخشندگی
کدومش رو می‌خواید ببینید؟ 💬"

❌ ربات: "می‌تونید بیشتر توضیح بدید؟" یا "چطور میتونم کمکتون کنم؟" ← اشتباه!

اگر کاربر "آره"، "بله"، "خوبه"، "اوکی" یا هر تأیید دیگه‌ای گفت، یعنی راضیه و می‌خواهد ادامه‌ی همان موضوع رو بشنوه.
هرگز گفت‌وگو را از نو شروع نکن.

🔹 ۹. Rule for Missing Knowledge — هوش مکمل (PATCH v2.4.3):
اگر پاسخ دقیق در داده‌های فعلی یا منطق مکالمه موجود نبود،
مجاز هستی از دانش داخلی GPT خودت استفاده کنی تا پاسخ را کامل کنی.

شرایط:
✅ لحن برند سیلانه را حفظ کنی (صمیمی، محترمانه، حرفه‌ای)
✅ هیچ اطلاعات اشتباه یا ساختگی ندهی
✅ پاسخ را مثل یک ادمین واقعی و مطمئن بنویسی

🎯 هدف: هیچ گفت‌وگویی نباید بی‌پاسخ بماند حتی اگر در داده‌ها نبود.

🔹 ۱۰. تفسیر پاسخ‌های کوتاه و ضمنی (PATCH v2.4.4):
هر زمان کاربر فقط نوشت:
  • «بله» / «آره» / «اوهوم» / «باشه» / «اوکی»
  • «ادامه بده» / «بگو» / «چی دیگه»
  • یا فقط یک ایموجی فرستاد (✅، 🙌، 🌿، 💬، ❤️، 👍 و غیره)

✅ معنی‌اش این است که از توضیحات راضی است و می‌خواهد ادامه دهی.

در این مواقع، نباید سؤال تکراری بپرسی یا مکالمه را متوقف کنی.
باید ادامه‌ی طبیعی همان موضوع را بدهی.

🔹 ۱۱. Context ثابت مکالمه — درک موقعیت گفتگو (PATCH v2.4.6):
⚠️ همیشه فرض کن مکالمه از این پیام شروع شده است:

«سلام وقتتون بخیر 🌿
یه پیشنهاد ویژه از طرف هلدینگ سیلانه سبز داریم براتون!
می‌تونید محصولات برندهای Misswake، Collamin، Ice Ball، Umbrella و Dafi رو با قیمت همکار و خرید مستقیم از شرکت تهیه کنید.

فروش این برندها توی اینستاگرام واقعاً ترکونده 💥
هر ماه فقط به ۱۰ فروشگاه آنلاین این فرصت داده می‌شه.
مایلید بیشتر توضیح بدم؟»

بر اساس این متن، شخص مقابل فروشنده یا صاحب فروشگاه آنلاینه که در حال بررسی همکاری با سیلانه است.
او قصد خرید شخصی ندارد، بلکه دنبال محصول مناسب برای فروش است.

🔹 ۱۲. درک نقش کاربر به‌عنوان فروشنده (PATCH v2.4.5):
⚠️ فرض کن کاربر فروشنده یا ادمین فروشگاه آنلاین است، نه مصرف‌کننده نهایی.

پاسخ‌ها باید تمرکز روی فروش داشته باشند:
✅ سود و حاشیه سود (۴۰٪ تخفیف = ۴۰٪ سود)
✅ بازار و تقاضا (چه محصولی پرفروش‌تر است)
✅ محبوبیت برند (ترند بودن، محبوبیت در اینستاگرام)
✅ مناسب بودن برای فروش آنلاین

⚠️ هرگز مستقیم قیمت نگو مگر خودش بپرسد.
🎯 هدف: کمک برای انتخاب محصول مناسب جهت فروش، نه خرید شخصی.

مثال صحیح:
👤 کاربر: "Misswake چطوره؟"
🤖 ربات: "🦷 Misswake یکی از پرطرفدارترین برندهای مراقبت دهان و دندانه.
خمیردندان بلیچینگش توی اینستاگرام خیلی خوب می‌فروشه چون همه دنبال لبخند سفیدترن 💫
با ۴۰٪ حاشیه سود، یکی از بهترین گزینه‌ها برای فروش آنلاین محسوب میشه.
اگر سؤال دیگه‌ای دارید، در خدمتم 🌿"

مثال غلط:
👤 کاربر: "Misswake چطوره؟"
❌ ربات: "Misswake برای سفید کردن دندون‌ها عالیه! قیمتش ۱۲۰ هزار تومانه." ← اشتباه! فوکوس باید روی فروش باشه نه خرید شخصی
${greetingContext}
`;

  try {
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Only keep last 2 conversation messages to prevent token overflow
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-2);
      recentHistory.forEach(msg => {
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
        temperature: 0.9,
        max_tokens: 700,
      }),
    });
    
    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    console.log("✅ Response received from OpenAI");
    
    const rawContent = data.choices[0].message.content.trim();
    console.log("📦 OpenAI response:", rawContent);
    
    // Check if response contains the affiliate link
    const sendLink = rawContent.includes('luxirana.com') || 
                     rawContent.includes('https://luxirana.com');
    
    return {
      responses: [{
        message: rawContent,
        sendLink: sendLink
      }],
      detectedTone: 'casual',
      userName: null,
    };
  } catch (err) {
    console.error("⚠️ OpenAI Error:", err.message);
    
    // If error, return a simple fallback
    return {
      responses: [{
        message: `چطور میتونم کمکت کنم؟ 😊`,
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
                        username.toLowerCase() === 'luxirana' ||
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

    // ========================================
    // POST-PROCESSING: Best-Sellers or Product Search
    // ========================================
    const { searchProduct } = require('./search_product.js');
    const fs = require('fs');
    
    // Check if user is asking for BEST SELLERS (all brands)
    const normalizedMsg = lastMessage.replace(/\s+/g, ' ').toLowerCase();
    const askingForBestSellers = (
      // With "برند"
      (normalizedMsg.includes('بهترین') && normalizedMsg.includes('برند')) ||
      (normalizedMsg.includes('پرفروش') && normalizedMsg.includes('برند')) ||
      (normalizedMsg.includes('پر فروش') && normalizedMsg.includes('برند')) ||
      (normalizedMsg.includes('هر برند') && (normalizedMsg.includes('بهترین') || normalizedMsg.includes('پرفروش') || normalizedMsg.includes('پر فروش'))) ||
      (normalizedMsg.includes('معرفی') && normalizedMsg.includes('برند')) ||
      // With "محصول" / "محصولات"
      (normalizedMsg.includes('بهترین محصول')) ||
      (normalizedMsg.includes('پرفروش‌ترین محصول')) ||
      (normalizedMsg.includes('پر فروش ترین محصول')) ||
      (normalizedMsg.includes('محصولات پرفروش')) ||
      (normalizedMsg.includes('محصولات برتر')) ||
      (normalizedMsg.includes('بهترین محصولات'))
    );
    
    if (askingForBestSellers) {
      console.log(`⭐ [${username}] User wants best-sellers from ALL brands`);
      
      // Load best-sellers
      const bestSellersData = JSON.parse(fs.readFileSync('./data/best_sellers.json', 'utf8'));
      const allBestSellers = bestSellersData.bestSellers;
      
      // Build message with all 6 best-sellers
      let bestSellerMessage = '✨ پرفروش‌ترین محصولات برندهامون:\n\n';
      let allProductLinks = '';
      
      allBestSellers.forEach((item, index) => {
        // Search for this specific product to get price and URL
        const products = searchProduct(item.productName);
        
        if (products && products.length > 0) {
          const product = products[0];
          bestSellerMessage += `${index + 1}. ${item.brand}: ${product.name}\n`;
          bestSellerMessage += `   💰 ${product.price} → 🔖 ${product.discountPrice}\n\n`;
          
          // Collect product link
          if (product.productUrl) {
            allProductLinks += `${index + 1}. ${product.productUrl}\n`;
          }
        } else {
          bestSellerMessage += `${index + 1}. ${item.brand}: ${item.productName}\n\n`;
        }
      });
      
      bestSellerMessage += `🔗 لینک‌های خرید رو پایین می‌فرستم 👇`;
      
      // Replace AI response
      response.responses[0].message = bestSellerMessage;
      response.responses[0].sendLink = false;
      response.responses[0].sendProductInfo = true;
      response.responses[0].productLink = allProductLinks.trim(); // Send all product links
      
      console.log(`✅ Sent all 6 best-sellers with ${allBestSellers.length} product links`);
    } else {
      // Regular product search
      const askingForProducts = lastMessage.includes('قیمت') || 
                                lastMessage.includes('محصول') ||
                                lastMessage.includes('چند') ||
                                lastMessage.includes('چقدر') ||
                                lastMessage.includes('برام بگو') ||
                                lastMessage.includes('نشون بده') ||
                                lastMessage.includes('میخوام');
      
      if (askingForProducts) {
        console.log(`🔍 [${username}] Detected product request - searching products...`);
        const products = searchProduct(lastMessage);
        
        if (products && products.length > 0) {
          console.log(`✅ Found ${products.length} products from CSV`);
          
          // Build proper formatted message with REAL prices
          let productMessage = '';
          const firstProduct = products[0];
          
          productMessage = `✨ محصول: ${firstProduct.name}\n`;
          productMessage += `💰 قیمت مصرف‌کننده: ${firstProduct.price}\n`;
          productMessage += `🔖 برای شما با ۴۰٪ تخفیف: ${firstProduct.discountPrice}\n`;
          productMessage += `🔗 لینک خرید پایین 👇`;
          
          // Replace AI response with real product info
          response.responses[0].message = productMessage;
          response.responses[0].sendProductInfo = true;
          response.responses[0].productLink = firstProduct.productUrl;
          response.responses[0].sendLink = false;
          
          console.log(`🔗 Product link: ${firstProduct.productUrl}`);
        }
      }
    }

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
          finalLink = 'https://luxirana.com';
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
          console.log(`🔗 [${username}] Product link: ${resp.productLink}`);
          
          await delay(1000);
          
          // Send product link separately
          await textarea.click();
          await delay(300);
          await textarea.type(resp.productLink, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`🛍️ [${username}] Product link sent separately: ${resp.productLink}`);
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
  console.log("🧪 Self-Test - Seylane AI v3.10");
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
  const affiliateResponse = await askGPT("می‌خوام همکاری کنم", mockUser, []);
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
  console.log("🚀 Seylane Explainer AI v3.10");
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
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--disable-component-extensions-with-background-pages",
      "--disable-ipc-flooding-protection",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-crash-reporter",
      "--disable-in-process-stack-traces",
    ],
    dumpio: false,
    ignoreHTTPSErrors: true,
    timeout: 60000,
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
        await delay(3000);
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

      console.log("✅ Check complete, waiting 3 seconds...");
      await delay(3000);

    } catch (err) {
      console.error("❌ Error:", err.message);
      await delay(15000);
    }
  }
})();
