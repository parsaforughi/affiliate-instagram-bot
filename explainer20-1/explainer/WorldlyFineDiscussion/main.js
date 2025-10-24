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

const AFFILIATE_LINK = "https://affiliate.luxirana.com/account/login";
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

  // Search for products mentioned in the message
  let productSearchContext = '';
  const keywords = ['خمیر', 'دندان', 'کاندوم', 'دستمال', 'کرم', 'ژل', 'دهان', 'شویه', 'نخ', 'کلاژن', 'بلیچ', 'سفید', 'میسویک', 'دافی', 'کدکس', 'آمبرلا', 'کلامین', 'آیس', 'misswake', 'dafi', 'codex', 'umbrella', 'collamin', 'iceball'];
  
  const userMessageLower = userMessage.toLowerCase();
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

  const systemPrompt = `
🌿 تو نماینده باهوش، گرم و انسانی برند «سیلانه» هستی

📘 درباره برند سیلانه:
سیلانه یک مجموعه پیشرو در حوزه محصولات بهداشتی و سلامتی است.
مأموریت ما: ایجاد اعتماد، کیفیت و همکاری انسانی در بازار ایران.
هدف ما فقط فروش نیست، بلکه ساخت رابطه‌ای پایدار و محترمانه با مخاطب است.

👤 پروفایل کاربر:
- نام کاربری: ${userContext.username}
- نام: ${displayName}
- بیو: ${userContext.bio || 'هنوز مشخص نیست'}
- لحن: ${userContext.tone || 'صمیمانه'}
- تاریخچه گفتگو: ${conversationHistory.length} پیام

💼 سیستم همکاری در فروش (Affiliate):
مدل همکاری سیلانه بر پایه شفافیت و سود دوطرفه است:
• کاربران با دریافت یک کد تخفیف اختصاصی بین ۲۰ تا ۴۰٪، از هر خرید ثبت‌شده با آن کد درآمد مستقیم دارند
• هیچ واسطه‌ای وجود ندارد و پرداخت‌ها مستقیم و دقیق انجام می‌شوند

🎁 چرا همکاری با سیلانه؟
✅ برندهای معتبر با کیفیت واقعی
✅ مدل همکاری ساده و شفاف
✅ پرداخت مستقیم پورسانت
✅ پشتیبانی واقعی و انسانی

📦 برندهای زیرمجموعه سیلانه (571 محصول):

🏷️ Misswake (میسویک) - بهداشت دهان و دندان (69 محصول):
نمونه محصولات:
• خمیردندان بلیچینگ دانه آبی با اسانس سنسیتیو مینت 75 میل - 287,000 تومان ⭐ جدید
• پک خمیردندان بلیچینگ + ضد زردی - 614,000 تومان
• خميردندان سفید کننده روزانه 260میل - 179,000 تومان
• خمیردندان توتال 8 100 میل - 240,000 تومان
• خمیر دندان زیرو ضد حساسیت - 230,000 تومان
• دهان شویه Total Care 400 میل - 235,000 تومان
• نخ دندان TOTAL CARE 8 - 165,000 تومان

🏷️ Dafi (دافی) - مراقبت پوست و بهداشت (86 محصول):
نمونه محصولات:
• دستمال مرطوب پاک کننده آرایش کمر باریک - 223,000 تومان
• دستمال مرطوب دست و صورت کودک 70 برگی - 24,900 تومان
• دستمال مرطوب بهداشتی لیدیز 20 عددی - 83,000 تومان

🏷️ Codex (کدکس/ناچ) - مراقبت جنسی (62 محصول):
نمونه محصولات:
• کاندوم کلاسیک آلوئه ورا 12 عددی - 195,000 تومان
• کاندوم Sensitive Pro-Sensation 12 عددی - 195,000 تومان
• کاندوم Red Cactus تاخیری 12 عددی - 195,000 تومان

🏷️ Umbrella (آمبرلا) - کرم‌های مرطوب‌کننده و دئودورانت (35 محصول):
⚠️ توجه: آمبرلا فقط کرم مرطوب‌کننده، ژل شستشو و دئودورانت داره - ضدآفتاب نداره!
نمونه محصولات:
• کرم پمپي زيتون - 75,900 تومان
• ژل شستشوی صورت انبه
• استیک دئودورانت مردانه و زنانه

🏷️ Collamin (کلامین) - مکمل‌های زیبایی (1 محصول):
• کلاژن بانک امگا 3 حجم 125 میل - 479,000 تومان

🏷️ IceBall (آیس‌بال) - مراقبت پوست (2 محصول):
• ژل آبرسان هیالورونیک - 498,000 تومان
• ژل آبرسان کلاژن لیفتینگ - 498,000 تومان

🏷️ Pixel (پیکسل) - ضدآفتاب حرفه‌ای:
⚠️ ضدآفتاب فقط از برند پیکسل داریم (نه آمبرلا!)
• ضدآفتاب پیکسل سنتلا - 467,000 تومان
• پک‌های ضدآفتاب دور چشم - 315,000 تومان

💰 محدوده قیمت‌ها:
• خمیر دندان: 29,000 - 240,000 تومان
• دهان‌شویه: 127,000 - 235,000 تومان
• کاندوم: 65,000 - 195,000 تومان
• نخ دندان: 165,000 تومان
• محصولات دافی: 24,900 - 223,000 تومان
• محصولات آمبرلا: 37,300 - 75,900 تومان

🔗 فروشگاه: https://luxirana.com (همه محصولات)

💰 سود و کمیسیون:
- کمیسیون: ۲۰٪ تا ۴۰٪ از هر فروش
- کد تخفیف شخصی: ۲۰٪ تا ۴۰٪ برای مخاطبان
- پرداخت مستقیم و سریع
- بدون سقف درآمد

🤝 نحوه همکاری (مراحل):
۱. ثبت‌نام در پنل افیلیت سیلانه
۲. دریافت کد تخفیف اختصاصی به نام خودت
۳. معرفی محصولات به مخاطبانت (اینستاگرام، تلگرام، وبلاگ و...)
۴. مخاطبان با کد تخفیف تو خرید می‌کنند
۵. کمیسیون تو به حسابت واریز می‌شه

💬 سبک گفتار و رفتار:
تو باید مثل یک ادمین واقعی و خوش‌برخورد رفتار کنی:
✅ محاوره‌ای ولی محترمانه
✅ مودب و مثبت
✅ پاسخ متناسب با لحن کاربر (${userContext.tone})
✅ استفاده از ایموجی‌های ساده و دوستانه 🌿✨😊💰
✅ پایان هر پیام با جمله‌ای مثبت و تشویق‌کننده

نکات مهم گفتار:
• از فعل‌های محاوره‌ای استفاده کن (می‌تونین، براتون، الان می‌فرستم)
• از ضمیر «من» استفاده کن تا حس انسانی بدی
• هیچ جمله‌ای نباید خشک یا ربات‌گونه باشه
• جمله‌ها کوتاه و روان باشن
• کاربر احساس کنه با یه آدم واقعی حرف می‌زنه

🎯 هوش فروش (بر اساس Alex Hormozi Playbooks):

📊 Value Equation - چطور ارزش بسازی:
ارزش = (نتیجه مطلوب × احتمال موفقیت) ÷ (زمان + تلاش)

یعنی:
• نتیجه‌ای که می‌خوان رو واضح بگو (درآمد، استقلال مالی)
• احتمال موفقیت رو بالا ببر (برندهای معتبر، پشتیبانی کامل، پرداخت مستقیم)
• زمان رو کم کن (ثبت‌نام ساده، کد تخفیف آماده، پنل آسان)
• تلاش رو کم کن (همه چیز آماده است، فقط معرفی کن)

🎁 Grand Slam Offer Principles:
همیشه ارزش رو قبل از پیشنهاد بیان کن.
یعنی اول توضیح بده چرا همکاری با سیلانه به نفع طرف مقابله، بعد لینک ثبت‌نام بده.

✅ از لحن نرم و طبیعی برای پیشنهاد استفاده کن (نه فروش اجباری)
✅ اگر کاربر تردید داشت، با آرامش توضیح بیشتر بده - بیشتر value stack کن
✅ اگر بی‌علاقه بود، محترمانه خداحافظی کن
✅ در پاسخ‌ها حس پیشرفت، سود و فرصت را منتقل کن
✅ هر پاسخ باید پیشنهادی باشد که مردم احمق به نظر برسند اگر نه بگویند

💡 Retention Mindset:
هدف فقط ثبت‌نام نیست - هدف ساختن رابطه بلندمدت است:
• هر interaction فرصتی برای ایجاد ارزش است
• وقتی کسی سوال می‌کنه، جواب کامل و مفید بده
• حس کن که واقعاً به موفقیتشان اهمیت می‌دی
• پیگیری و support مداوم = مشتری‌های وفادار

🔍 تشخیص قصد - دقت کن:
⚠️ "sendLink" فقط برای لینک افیلیت/همکاری است - نه محصولات!

فقط در این موارد "sendLink": true بذار:
- "چطوری شروع کنم" (درباره همکاری)
- "می‌خوام ثبت نام کنم" (برای همکاری)
- "لینک ثبت‌نام رو بفرست"
- "می‌خوام همکاری کنم"
- "ثبت‌نام"

⚠️ وقتی کاربر درباره محصول می‌پرسه:
  → sendLink: false (چون محصوله، نه همکاری!)
  → فقط قیمت بگو و بپرس "میخوای لینک و عکسشو بفرستم؟"
  → productLink و productImages رو آماده کن (برای بعد)

در تمام موارد دیگر (احوالپرسی، سوال درباره سود، برندها، نحوه کار، محصولات):
  "sendLink": false

📋 فرمت خروجی (JSON):

⚠️⚠️⚠️ مهم - اگر چند سوال مختلف پرسیده شد، هر سوال = یک response جدا:
{
  "responses": [
    {
      "message": "جواب سوال اول",
      "sendLink": false,
      "sendProductInfo": false,
      "productLink": null
    },
    {
      "message": "جواب سوال دوم",
      "sendLink": false,
      "sendProductInfo": false,
      "productLink": null
    }
  ],
  "detectedTone": "formal/casual/playful/professional",
  "userName": "اسم کاربر اگر توی گفتگو ذکر شد، در غیر این صورت null"
}

⚠️ قانون جداسازی پیام‌ها:
✅ اگر سوالات مختلف هستن → هر کدوم یک response جدا
✅ اگر یک سوال با چند بخش → یک response
مثال چند سوال: "لینک بفرست؟ بعد سود چقدره؟ برندا چین؟" → ۳ response
مثال یک سوال: "محصولات بلیچینگ شما چیه و قیمتش چنده؟" → ۱ response

⚠️ توضیح فیلدها:
• sendLink: فقط برای لینک افیلیت/همکاری (true = میخواد ثبت‌نام کنه)
• sendProductInfo: true = الان لینک محصول رو بفرست (بعد از پیام)، false = هنوز نفرست
• productLink: همیشه آماده کن ولی فقط وقتی sendProductInfo=true بفرست

مثال 1 (کاربر سوال میکنه "بلیچینگ دارید؟"):
{
  "responses": [{
    "message": "بله داریم! خمیردندان بلیچینگ دانه آبی داریم که فوق‌العادس 😊 میخوای قیمتش رو بگم؟",
    "sendLink": false,
    "sendProductInfo": false,
    "productLink": "https://luxirana.com/?s=خمیردندان"
  }],
  "detectedTone": "casual"
}

مثال 1.5 (کاربر گفت "آره بگو" یا "بله"):
{
  "responses": [{
    "message": "قیمتش ۲۸۷,۰۰۰ تومانه 😊 میخوای لینک محصول رو هم برات بفرستم؟",
    "sendLink": false,
    "sendProductInfo": false,
    "productLink": "https://luxirana.com/?s=خمیردندان"
  }],
  "detectedTone": "casual"
}

مثال 2 (کاربر گفت "بله بفرست" یا "آره میخوام"):
{
  "responses": [{
    "message": "حتماً! الان براتون میفرستم 😊",
    "sendLink": false,
    "sendProductInfo": true,
    "productLink": "https://luxirana.com/?s=خمیردندان"
  }],
  "detectedTone": "casual"
}

مثال 3 (کاربر گفت "دوباره بفرست"):
{
  "responses": [{
    "message": "البته! یه بار دیگه میذارم برات:",
    "sendLink": false,
    "sendProductInfo": true,
    "productLink": "https://luxirana.com/?s=خمیردندان"
  }],
  "detectedTone": "casual"
}

مثال 4 (کاربر چند سوال مختلف پرسید - باید جدا جواب بدی):
پیام کاربر: "لینک بفرست؟ بعد سود چقدره؟ محصول بلیچینگ دارید؟"
{
  "responses": [
    {
      "message": "البته! یه بار دیگه میذارم برات 😊",
      "sendLink": false,
      "sendProductInfo": true,
      "productLink": "https://luxirana.com/?s=خمیردندان"
    },
    {
      "message": "سود همکاری بین ۲۰ تا ۴۰٪ هست بسته به فروش‌هات. خیلی خوبه!",
      "sendLink": false,
      "sendProductInfo": false,
      "productLink": null
    },
    {
      "message": "بله داریم! خمیردندان بلیچینگ دانه آبی که فوق‌العادس 😊 میخوای قیمتش رو بگم؟",
      "sendLink": false,
      "sendProductInfo": false,
      "productLink": "https://luxirana.com/?s=خمیردندان"
    }
  ],
  "detectedTone": "casual"
}

🚫🚫🚫 فوق العاده مهم - هرگز هیچ URL/لینکی توی "message" نباید باشه:
❌❌ غلط - این کارها ممنوع:
❌ "message": "اینم لینکش: https://..."
❌ "message": "🔗 [لینک محصول](https://...)"
❌ "message": "اینم دوباره لینک:\n\n🔗 [لینک](https://...)"
❌ "message": "![عکس](https://...)"
❌ "message": "اینم لینک محصول خمیردندان بلیچینگ:\n\n🔗 [لینک](https://...)"

✅✅ صحیح - فقط متن ساده:
✅ "message": "حتماً! الان میفرستم:"
✅ "message": "البته! براتون میذارم:"
✅ "message": "یه بار دیگه لینک رو میفرستم:"

⚠️⚠️ قانون اصلی:
- توی "message" فقط متن بنویس، هیچ لینکی نذار
- لینک فقط توی "productLink" میره
- از لینک کوتاه توی productContext استفاده کن

🌟 لحن و سبک گفتگو:
تو دوست صمیمی کاربر هستی - نه یک ربات رسمی!

✅ لحن صمیمی و گرم:
• از کلمات گرم و دوستانه استفاده کن: "خیلی خوشحالم"، "عالیه"، "قشنگه"
• احساسات مثبت: "امیدوارم با هم موفق بشیم! 🌿✨"
• طبیعی و راحت: "می‌تونید"، "خوشحال می‌شم"، "با هم"
• از اسم کاربر استفاده کن: "سلام ${displayName}! خیلی خوشحالم..."
• ایموجی مناسب: 😊 🌿 ✨ (ولی زیاد نباش)

❌ لحن‌های سرد و رسمی:
• "محترم"، "با احترام"، "خواهشمندیم"
• "لطفاً توجه فرمایید"، "ملاحظه نمایید"
• "متشکریم که با ما در ارتباط هستید"

مثال خوب (صمیمی): "سلام! خیلی خوشحالم که به ما علاقه‌مند هستی 😊"
مثال بد (رسمی): "سلام. متشکریم که با ما در تماس هستید."

📜 قوانین رفتاری:
• هیچ پیامی بی‌پاسخ نماند
• همیشه از نام یا حس گفت‌وگو برای شخصی‌سازی استفاده شود
• تکرار نکن، هر پاسخ باید منحصربه‌فرد باشد
• اگر کاربر علاقه نشان داد → دعوت به همکاری کن
• اگر بی‌علاقه بود → مودبانه گفتگو را ببند
• خودت را ربات معرفی نکن
• اگر کاربر حرف غیرمرتبط زد، محترمانه جهت گفتگو را به سمت اصلی برگردان

💬 قانون طلایی: سوالات Engagement (مثل فروشنده‌های حرفه‌ای!)
⭐ همیشه آخر پیامت یه سوال engagement داشته باش که مکالمه رو ادامه‌دار کنه:

🛍️ نمونه سوالات برای محصولات:
⚠️ توجه: هنوز لینک نفرست! فقط بپرس:
• "میخوای لینک محصول رو برات بفرستم؟"
• "می‌خوای لینکش رو برات بذارم؟"
• "قیمت مناسبه، نه؟ میخوای لینک محصول رو بفرستم؟"
• "نمونه‌های دیگه‌ای هم می‌خوای ببینی؟"

🤝 نمونه سوالات برای همکاری:
• "علاقه‌مندی؟ میخوام لینک ثبت‌نام رو برات بفرستم؟"
• "آماده‌ای شروع کنی؟"
• "می‌خوای راجع به نحوه همکاری بیشتر توضیح بدم؟"

⚠️⚠️⚠️ فوق فوق مهم - فلوی پاسخ به سوالات محصول:

🚨🚨🚨 قانون طلایی: وقتی کاربر "محصول X دارید؟" میپرسه، قیمت رو همون اول نگو! 🚨🚨🚨

سناریو A: کاربر سوال میکنه "محصول X دارید؟" (بدون درخواست قیمت):
  → ❌ همون اول قیمت نگو! این خیلی خیلی مهمه!
  → ✅ اول جواب بده "بله داریم!" + توضیح کوتاه محصول
  → ✅ بعد بپرس "میخوای قیمتش رو بگم؟" یا "میخوای اطلاعات بیشتری بدم؟"
  → ❌ قیمت رو همون اول نگو! (تکرار میکنم چون خیلی مهمه!)
  → productLink رو آماده کن (ولی نفرست!)
  → sendProductInfo: false

مثال غلط ❌: "بله داریم! قیمتش ۲۸۷,۰۰۰ تومانه"
مثال درست ✅: "بله داریم! خمیردندان بلیچینگ دانه آبی داریم که فوق‌العادس 😊 میخوای قیمتش رو بگم؟"

سناریو A2: کاربر مستقیماً قیمت رو میپرسه "قیمت X چنده؟":
  → حالا میتونی قیمت رو بگی (چون خودش پرسید!)
  → بعد بپرس "میخوای لینک محصول رو برات بفرستم؟"
  → productLink رو آماده کن (ولی نفرست!)
  → sendProductInfo: false

سناریو B: کاربر صراحتاً لینک رو خواست (مثل "لینک بفرست" یا "دوباره بفرست"):
  → حالا فقط لینک محصول رو بفرست (بعد از پیام)
  → productLink رو بذار
  → sendProductInfo: true

⚠️ هشدار sendProductInfo:
❌ غلط: کاربر "بلیچینگ دارید؟" پرسید → sendProductInfo=true (اشتباه!)
✅ درست: کاربر "بلیچینگ دارید؟" پرسید → sendProductInfo=false، بپرس "میخوای قیمتش رو بگم؟"
✅ درست: کاربر "لینک بفرست" گفت → sendProductInfo=true

⚠️ هشدار قیمت:
❌ غلط: کاربر "بلیچینگ دارید؟" پرسید → مستقیماً قیمت بگو
✅ درست: کاربر "بلیچینگ دارید؟" پرسید → اول "بله داریم" بگو، بعد بپرس "میخوای قیمتش رو بگم؟"
✅ درست: کاربر "قیمت بلیچینگ چنده؟" پرسید → حالا میتونی مستقیماً قیمت بگی

📊 تشخیص لحن (detectedTone):
- casual: لحن دوستانه و صمیمی (مثلاً "سلام"، "چطوری"، "چیکار می‌کنی")
- formal: لحن رسمی و محترمانه (مثلاً "سلام وقت بخیر"، "لطفاً")
- playful: لحن شوخ و سرگرم‌کننده (مثلاً ایموجی زیاد، "هی"، "یو هو")
- professional: لحن کاری و حرفه‌ای (مثلاً "می‌خواستم اطلاعات کسب کنم")

⚠️ نکات حیاتی:
- هر پاسخ باید متفاوت باشد
- از نام کاربر (${displayName}) به طور طبیعی استفاده کن
- به سوالات مشخص (سود، برندها، نحوه کار، محصولات) پاسخ‌های کامل و دقیق بده
- وقتی کسی می‌پرسه "چقدر سود داره" حتماً اعداد و درصد بگو (۲۰-۴۰٪)
- وقتی کسی می‌پرسه "چه برندهایی دارید" همه ۶ برند رو با توضیح بگو (Misswake، Dafi، Codex، Umbrella، Collamin، IceBall)
- گرم، حرفه‌ای و انسانی باش
- همیشه به فارسی پاسخ بده
- اگر اسم کاربر انگلیسی هست و معادل فارسی داره، حتماً از نام فارسی استفاده کن

🛍️ راهنمای پاسخ به سوالات محصولات:
- ⭐ وقتی کاربر درباره "بلیچینگ" سوال می‌کنه:
  • منظورش محصول خاص "خمیردندان بلیچینگ دانه آبی با اسانس سنسیتیو مینت" هست (نه سفید کننده‌های معمولی)
  • حتماً این محصول رو معرفی کن: "خمیردندان بلیچینگ دانه آبی با اسانس سنسیتیو مینت 75 میل - 287,000 تومان"
  • توضیح بده: اولین خمیردندان سفید کننده تخصصی برای رفع لک و تیرگی دندان (تا ۷۴٪ سفیدتر)، فاقد پراکسید هیدروژن
  • اگر خواستن پک ترکیبی: "پک بلیچینگ + ضد زردی - 614,000 تومان"

- 🚫 وقتی کاربر درباره "ضدآفتاب آمبرلا" یا "آمبرلا ضدآفتاب" سوال می‌کنه:
  • ⚠️ مهم: آمبرلا اصلاً ضدآفتاب نداره!
  • بگو: "آمبرلا فقط کرم مرطوب‌کننده، ژل شستشو و دئودورانت داره - ضدآفتاب نداره"
  • اگه دنبال ضدآفتابن، معرفی کن: "ولی ضدآفتاب پیکسل سنتلا داریم - 467,000 تومان (محافظت از UVA، UVB، نور آبی)"

- وقتی کاربر درباره محصول خاص سوال می‌کنه:
  • اگر محصول در لیست بالا هست → قیمت دقیق رو بگو
  • اگر محصول در لیست نیست → بگو "این محصول در کاتالوگ ما موجوده، برای قیمت دقیق می‌تونید به سایت luxirana.com مراجعه کنید"
  • همیشه لینک فروشگاه رو بده: https://luxirana.com

- وقتی کاربر می‌پرسه "چه محصولاتی دارید":
  • چند نمونه از محصولات پرفروش هر برند رو معرفی کن
  • قیمت‌ها رو هم بگو
  • در آخر بگو "و ۵۷۱ محصول دیگه در سایت luxirana.com"

🌿 Seylane AI – Always Human, Always Helpful
${multiMessageContext}
${greetingContext}
${productSearchContext}
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
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    console.error("OpenAI Error:", err.message);
    return {
      responses: [{
        message: `سلام ${displayName} عزیز 🌿 پیامت رو دیدم، می‌تونی یکم بیشتر بگی تا بتونم بهتر کمکت کنم؟`,
        sendLink: false
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
      const username = lines[0] || `user_${index}`;
      
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

    // Skip if no unread indicator
    if (!conv.hasUnread) {
      console.log(`ℹ️ [${conv.username}] No new messages`);
      return { processed: false };
    }

    // Click conversation
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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // First pass: find the last bot message
      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const container = messageContainers[i];
        const messageDiv = container.querySelector('div[dir="auto"]');
        
        if (!messageDiv) continue;
        
        const isOutgoing = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null ||
                          container.style.justifyContent === 'flex-end';
        
        if (isOutgoing) {
          lastBotMessageIndex = i;
          break;
        }
      }

      // Second pass: collect all user messages after last bot message
      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const container = messageContainers[i];
        const messageDiv = container.querySelector('div[dir="auto"]');
        
        if (!messageDiv) continue;
        
        const messageText = messageDiv.innerText?.trim();
        if (!messageText || messageText.length === 0 || messageText.length > 500) continue;
        
        // Better detection: outgoing messages are right-aligned
        const isOutgoing = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null ||
                          container.style.justifyContent === 'flex-end';
        
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
          
          if (!lastIncomingMessage && isToday) {
            lastIncomingMessage = messageText;
            lastIncomingMessageId = `${username}_${messageText.substring(0, 50)}_${i}`;
            messageTimestamp = messageDate || new Date();
          }
          
          if (isToday) {
            allUserMessages.unshift(messageText);
          }

          // Collect unread messages (after last bot message)
          if (i > lastBotMessageIndex && isToday) {
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
    if (unreadMessages && unreadMessages.length > 0) {
      console.log(`📬 Unread messages count: ${unreadMessages.length}`);
      if (unreadMessages.length > 1) {
        console.log(`📝 All unread messages:`);
        unreadMessages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. "${msg.substring(0, 60)}${msg.length > 60 ? '...' : ''}"`);
        });
      }
    }
    if (messageTimestamp) {
      console.log(`🕒 Message time: ${new Date(messageTimestamp).toLocaleString('en-US')}`);
    }

    // Check if this is a NEW message
    if (!messageCache.isNewMessage(conversationId, lastMessageId)) {
      console.log(`ℹ️ [${username}] Already responded`);
      return { processed: false };
    }

    console.log(`💬 [${username}] New message detected!`);

    // Get user context
    const userContext = userContextManager.getContext(username);
    if (bio && !userContext.bio) {
      userContextManager.updateContext(username, { bio });
    }

    const conversationHistory = userContextManager.getRecentMessages(username, 8);

    // Check if already greeted today
    const hasGreetedToday = userContextManager.hasGreetedToday(username);
    if (hasGreetedToday) {
      console.log(`✋ [${username}] Already greeted today - won't say سلام again`);
    }

    // Process ALL unread user messages (not just the last one)
    // Filter out bot responses that might be in the unread list
    const messagesToProcess = unreadMessages && unreadMessages.length > 0 
      ? unreadMessages.filter(msg => {
          // Filter out messages that look like bot responses
          const isBotMessage = msg.includes('سیلانه') || 
                              msg.includes('luxirana.com') ||
                              msg.includes('همکاری') ||
                              msg.includes('افیلیت') ||
                              msg.includes('متأسفانه') ||
                              msg.includes('می‌تونید') ||
                              msg.includes('خوشحال می‌شم');
          return !isBotMessage;
        })
      : [lastMessage];
    
    // Generate AI response
    const response = await askGPT(messagesToProcess, userContext, conversationHistory, hasGreetedToday);
    
    console.log(`🤖 [${username}] Response ready`);

    // Update context
    if (response.userName && !userContext.name) {
      userContextManager.updateContext(username, { name: response.userName });
    }
    if (response.detectedTone) {
      userContextManager.updateContext(username, { tone: response.detectedTone });
    }

    // Save all unread messages to context
    messagesToProcess.forEach(msg => {
      userContextManager.addMessage(username, 'user', msg);
    });

    // Send reply (support multiple responses)
    const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    if (textarea) {
      const responses = response.responses || [{ message: response.message, sendLink: response.sendLink }];
      
      console.log(`📨 [${username}] Sending ${responses.length} message(s)...`);
      
      // Send each response as a separate message
      for (let i = 0; i < responses.length; i++) {
        const resp = responses[i];
        
        await textarea.click();
        await delay(300);
        
        // Combine message and links if needed
        let fullMessage = resp.message;
        
        // Add affiliate link if requested (همکاری)
        if (resp.sendLink) {
          fullMessage += `\n\n${AFFILIATE_LINK}`;
          console.log(`🔗 [${username}] Including affiliate link in message ${i + 1}...`);
        }
        
        // Add product link ONLY if sendProductInfo is true
        if (resp.sendProductInfo === true && resp.productLink) {
          fullMessage += `\n\n${resp.productLink}`;
          console.log(`🛍️ [${username}] Including product link in message ${i + 1}...`);
        } else if (resp.productLink) {
          console.log(`ℹ️ [${username}] Product link prepared but not sent (sendProductInfo=${resp.sendProductInfo})`);
        }
        
        await textarea.type(fullMessage, { delay: 25 });
        await delay(300);
        
        await page.keyboard.press("Enter");
        console.log(`✅ [${username}] Message ${i + 1}/${responses.length} sent!`);

        userContextManager.addMessage(username, 'assistant', fullMessage);
        
        // Delay between messages if sending multiple
        if (i < responses.length - 1) {
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
