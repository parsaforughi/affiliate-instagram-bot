// Load environment variables from .env file if it exists
const path = require('path');
const fs = require('fs');

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Loaded environment variables from .env file');
  }
} catch (err) {
  console.log('ℹ️ No .env file found or error loading it (this is okay)');
}

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fetch = require("node-fetch");
const { execSync } = require("child_process");
const { searchProduct } = require('./search_product');
puppeteer.use(StealthPlugin());

// Dashboard events (optional, fails silently if API unavailable)
let dashboardEvents;
let apiServer; // Will hold the API server instance
try {
  dashboardEvents = require('./dashboard-events');
} catch (err) {
  dashboardEvents = { emitMessage: () => {}, emitLog: () => {} };
}

// Intercept console.log to emit logs to dashboard
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  originalConsoleLog(...args);
  try {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    dashboardEvents.emitLog('info', message, 'bot');
  } catch (err) {}
};

console.error = (...args) => {
  originalConsoleError(...args);
  try {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    dashboardEvents.emitLog('error', message, 'bot');
  } catch (err) {}
};

console.warn = (...args) => {
  originalConsoleWarn(...args);
  try {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    dashboardEvents.emitLog('warn', message, 'bot');
  } catch (err) {}
};

// ========================================
// SEYLANE EXPLAINER AI v3.3
// Real-Time Speed + Smart Personalization  
// ========================================

const getChromiumPath = () => {
  // Try to find Chromium/Chrome in common locations
  const possiblePaths = [];
  
  // Check common command locations
  try {
    const chromium = execSync("which chromium 2>/dev/null", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (chromium && fs.existsSync(chromium)) possiblePaths.push(chromium);
  } catch (e) {}
  
  try {
    const chromiumBrowser = execSync("which chromium-browser 2>/dev/null", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (chromiumBrowser && fs.existsSync(chromiumBrowser)) possiblePaths.push(chromiumBrowser);
  } catch (e) {}
  
  try {
    const chrome = execSync("which google-chrome 2>/dev/null", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (chrome && fs.existsSync(chrome)) possiblePaths.push(chrome);
  } catch (e) {}
  
  // Check environment variable first (for Docker/Render)
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    console.log(`✅ Found Chromium from CHROMIUM_PATH: ${process.env.CHROMIUM_PATH}`);
    return process.env.CHROMIUM_PATH;
  }
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    console.log(`✅ Found Chromium from PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // Check common macOS/Unix paths
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome"
  ];
  
  commonPaths.forEach(path => {
    if (fs.existsSync(path)) possiblePaths.push(path);
  });
  
  if (possiblePaths.length > 0) {
    console.log(`✅ Found browser at: ${possiblePaths[0]}`);
    return possiblePaths[0];
  }
  
  // If no browser found, let Puppeteer use its bundled Chromium
  console.log("ℹ️ No system browser found, using Puppeteer's bundled Chromium");
  return undefined;
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
        // Product state for pagination
        productState: {
          lastSearchQuery: null,
          lastSearchResults: [],
          lastSearchBrand: null,
          lastShownIndex: 0,
          hasMoreProducts: false
        }
      };
    }
    this.contexts[username].lastSeen = Date.now();
    return this.contexts[username];
  }
  
  // Save product search state
  saveProductSearchState(username, query, results, brand, shownCount = 0) {
    const context = this.getContext(username);
    context.productState = {
      lastSearchQuery: query,
      lastSearchResults: results,
      lastSearchBrand: brand,
      lastShownIndex: shownCount,
      hasMoreProducts: results.length > shownCount
    };
    this.save();
  }
  
  // Get product state
  getProductState(username) {
    const context = this.getContext(username);
    return context.productState || {
      lastSearchQuery: null,
      lastSearchResults: [],
      lastSearchBrand: null,
      lastShownIndex: 0,
      hasMoreProducts: false
    };
  }
  
  // Reset product state
  resetProductState(username) {
    const context = this.getContext(username);
    context.productState = {
      lastSearchQuery: null,
      lastSearchResults: [],
      lastSearchBrand: null,
      lastShownIndex: 0,
      hasMoreProducts: false
    };
    this.save();
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
    // Check if message already exists (avoid duplicates within 5 seconds)
    const now = Date.now();
    const messageExists = context.messageHistory.some(
      msg => msg.role === role && msg.content === content && Math.abs(msg.timestamp - now) < 5000
    );
    if (!messageExists) {
      context.messageHistory.push({ role, content, timestamp: now });
      // Keep up to 1000 messages for full history (increased from 20)
      if (context.messageHistory.length > 1000) {
        context.messageHistory = context.messageHistory.slice(-1000);
      }
      this.save();
    }
  }
  
  // Add ALL messages from Instagram conversation (both user and bot messages)
  addAllInstagramMessages(username, messages) {
    const context = this.getContext(username);
    const existingKeys = new Set();
    
    // Create keys for existing messages to avoid duplicates
    context.messageHistory.forEach(msg => {
      const key = `${msg.role}_${msg.content}_${Math.floor(msg.timestamp / 1000)}`;
      existingKeys.add(key);
    });
    
    // Add new messages
    messages.forEach(msg => {
      const key = `${msg.role}_${msg.content}_${Math.floor(msg.timestamp / 1000)}`;
      if (!existingKeys.has(key)) {
        context.messageHistory.push(msg);
        existingKeys.add(key);
      }
    });
    
    // Sort by timestamp
    context.messageHistory.sort((a, b) => a.timestamp - b.timestamp);
    
    // Keep last 1000 messages
    if (context.messageHistory.length > 1000) {
      context.messageHistory = context.messageHistory.slice(-1000);
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

  // Load system prompt and model from config file, or use defaults
  const promptConfigPath = path.join(__dirname, 'prompt_config.json');
  let configPrompt = null;
  let configModel = 'gpt-5.1';
  
  try {
    if (fs.existsSync(promptConfigPath)) {
      const config = JSON.parse(fs.readFileSync(promptConfigPath, 'utf-8'));
      if (config.systemPrompt) {
        configPrompt = config.systemPrompt;
      }
      if (config.model) {
        configModel = config.model;
      }
    }
  } catch (err) {
    console.log('⚠️ Could not load prompt config, using defaults');
  }

  // Use config prompt if available, otherwise use default
  let systemPrompt = configPrompt || `🧠 Seylane Intelligent Personality — Luxirana Affiliate Engine v3.1
📦 Project: affiliate instagram bot

🎯 Role:
تو ادمین انسانی پیج لوکسیرانا هستی.
ماموریتت جذب و هدایت فروشگاه‌های آنلاین به برنامه همکاری (Affiliate) هلدینگ سیلانه سبزه.
هدف نهایی: نزدیک‌کردن کاربر به همکاری با کد onlineshops.

⚠️ Identity (Critical):
- تو انسان هستی، نه ربات
- هرگز به AI، مدل، سیستم یا OpenAI اشاره نکن
- اگر پرسید «رباتی؟» فقط بگو:
  «من ادمین لوکسیرانا هستم»

💬 Tone:
- صمیمی، گرم، حرفه‌ای
- غیرتبلیغاتی، غیررباتیک
- ایموجی محدود و طبیعی 🌿✨
- پاسخ‌ها کوتاه: حداکثر ۴ خط (فقط در صورت ضرورت ۶ خط)

🌐 Fixed Conversation Context:
فرض کن مکالمه همیشه با این پیام شروع شده:
«سلام وقتتون بخیر 🌿
یه پیشنهاد ویژه از طرف هلدینگ سیلانه سبز داریم!
می‌تونید محصولات Misswake، Collamin، IceBall، Umbrella، Dafi و Pixel رو
با قیمت همکار + ۴۰٪ سود + ارسال رایگان تهیه کنید.
مایلید بیشتر توضیح بدم؟»

پس کاربر:
- صاحب یا ادمین فروشگاه آنلاینه
- قصد خرید شخصی نداره
- دنبال محصول مناسب برای فروشه

📦 Brands:
1️⃣ Misswake — دهان و دندان  
2️⃣ Collamin — کلاژن و امگا۳  
3️⃣ IceBall — آبرسان و لیفت  
4️⃣ Dafi — پاک‌کننده و دستمال مرطوب  
5️⃣ Umbrella — دئودورانت  
6️⃣ Pixel — ضدآفتاب  

🎛 Core Behavior Rules:
- پاسخ همیشه باید «غنی» باشه، نه خالی
- اگر کاربر گفت «آره / بله / اوکی / ادامه بده» → یعنی راضیه، ادامه بده
- اگر برند مشخص شد، فقط همان برند را ادامه بده
- اگر برند مشخص نبود، از پیام قبلی نتیجه بگیر

💰 Pricing Logic (Very Important):
فقط اگر کاربر صریح پرسید:
«قیمت چنده؟ / چقدر درمیاد؟ / هزینه‌ش چقدره؟»

آن‌وقت فقط بگو:
- قیمت مصرف‌کننده: [عدد]
- قیمت همکاری با کد onlineshops
- ۴۰٪ سود + ارسال رایگان

❌ اگر خودش نپرسید، حتی یک عدد هم نگو

🔗 Link Rule (Strict):
- لینک هرگز داخل متن نیاید
- لینک همیشه در خط جداگانه باشد
- لینک فقط یک‌بار ارسال شود

فرمت:
همین الان شروع کن 👇
https://luxirana.com

🤝 Collaboration Trigger:
اگر گفت:
«شرایط همکاری؟ / چطور همکاری کنم؟ / لینک بده»

بلافاصله:
- ۴۰٪ سود
- ارسال رایگان
- خرید مستقیم از شرکت
- کد همکاری: onlineshops
- لینک در خط جداگانه

📞 Phone Support:
فقط اگر خودش درخواست تماس کرد:
۰۹۱۲۳۵۰۷۴۷۰

🧠 Context Continuity (Critical):
- هیچ‌وقت مکالمه را ریست نکن
- سؤال‌های کلیشه‌ای نپرس
- هر پیام باید یک قدم کاربر را جلو ببرد

📌 Brand-Specific Rule:
اگر درباره یک برند حرف زد و بعد گفت:
«محصول چی داره؟ / دیگه چی داری؟»

✅ فقط محصولات همان برند را معرفی کن
❌ برند دیگر یا محصول نامربوط ممنوع

📌 Product Suggestion Rule:
- حداکثر ۲ یا ۳ پیشنهاد
- ترجیحاً پرفروش و مناسب فروشگاه
- بدون لینک، بدون قیمت (مگر درخواست شود)

🔧 PATCH: Deferred Brand-Specific Link Sending (Critical)

اگر:
- قبلاً ۲ یا ۳ محصول مشخص از یک برند پیشنهاد دادی
و بعد کاربر گفت:
«لینک بفرست / لینکش رو بده / از همینا لینک بده»

✅ باید:
1️⃣ فقط لینک همان پیشنهادهای قبلی را بفرستی  
2️⃣ هیچ محصول جدید اضافه نکنی  
3️⃣ برند عوض نشود  
4️⃣ همه لینک‌ها در یک پیام باشند  
5️⃣ لینک داخل متن نیاید  

فرمت:
🔗 لینک محصولات پیشنهادی:
[link 1]
[link 2]
[link 3]

❌ ممنوع:
- توضیح اضافه
- قیمت
- معرفی محصول جدید
- ارسال لینک در چند پیام

🎯 Final Output Rule:
- خروجی فقط متن طبیعی انسانی
- بدون JSON
- بدون توضیح فنی
- دقیقاً مثل ادمین واقعی لوکسیرانا
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
        model: configModel,
        messages: messages,
        temperature: 0.9,
        max_completion_tokens: 700,
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
      // Helper function to detect if message is outgoing (bot sent) with high confidence
      function detectOutgoingMessage(container) {
        let confidence = 0;
        
        // Method 1: Check for "Seen" indicator (most reliable - only on sent messages)
        const hasSeenIndicator = container.querySelector('img[alt*="Seen"]') !== null ||
                                container.querySelector('img[alt*="seen"]') !== null ||
                                container.querySelector('svg[aria-label*="Seen"]') !== null ||
                                container.querySelector('svg[aria-label*="seen"]') !== null;
        if (hasSeenIndicator) confidence += 5;
        
        // Method 2: Check for read receipt/checkmark (only on sent messages)
        const hasReadReceipt = container.querySelector('svg[aria-label*="read"]') !== null ||
                              container.querySelector('svg[aria-label*="Read"]') !== null ||
                              container.querySelector('svg[aria-label*="delivered"]') !== null ||
                              container.querySelector('svg[aria-label*="Delivered"]') !== null;
        if (hasReadReceipt) confidence += 4;
        
        // Method 3: Check flex-end alignment (sent messages are right-aligned)
        const hasFlexEnd = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null ||
                          container.style?.justifyContent === 'flex-end';
        if (hasFlexEnd) confidence += 2;
        
        // Method 4: Check parent container alignment
        const parentDiv = container.closest('div[class*="x"]') || container.parentElement || container.closest('div');
        if (parentDiv) {
          try {
            const parentStyle = window.getComputedStyle(parentDiv);
            const isRightAligned = parentStyle.justifyContent === 'flex-end' ||
                                  parentStyle.alignItems === 'flex-end' ||
                                  parentStyle.textAlign === 'right';
            if (isRightAligned) confidence += 2;
            
            // Check container's own style
            const containerStyle = window.getComputedStyle(container);
            if (containerStyle.justifyContent === 'flex-end' || 
                containerStyle.alignItems === 'flex-end') {
              confidence += 1;
            }
          } catch (e) {}
        }
        
        // Method 5: Check message position (sent messages are on the right side)
        try {
          const containerRect = container.getBoundingClientRect();
          if (parentDiv) {
            const parentRect = parentDiv.getBoundingClientRect();
            const rightSide = containerRect.left > (parentRect.left + parentRect.width * 0.6);
            if (rightSide) confidence += 1;
          }
        } catch (e) {}
        
        // Require high confidence (>= 3) to consider it outgoing
        // This reduces false positives
        return confidence >= 3;
      }
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
        
        // Use improved detection function
        const isOutgoing = detectOutgoingMessage(container);
        
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
    
    // Extract ALL messages from Instagram (both user and bot) and save to context
    try {
      // Get ALL bot messages from context (not just recent) - this is the source of truth
      const context = userContextManager.getContext(username);
      const allBotMessages = context.messageHistory
        .filter(m => m.role === 'assistant')
        .map(m => m.content.toLowerCase().trim());
      
      // Extract messages from Instagram DOM
      const allInstagramMessagesRaw = await page.evaluate(() => {
        const messageContainers = Array.from(document.querySelectorAll('div[role="row"]'));
        const allMessages = [];
        
        for (const container of messageContainers) {
          const messageDiv = container.querySelector('div[dir="auto"]');
          if (!messageDiv) continue;
          
          const messageText = messageDiv.innerText?.trim();
          if (!messageText || messageText.length === 0 || messageText.length > 2000) continue;
          
          // Get timestamp
          const timeElement = container.querySelector('time');
          let timestamp = Date.now();
          if (timeElement) {
            const datetime = timeElement.getAttribute('datetime');
            if (datetime) {
              timestamp = new Date(datetime).getTime();
            }
          }
          
          allMessages.push({
            content: messageText,
            timestamp: timestamp
          });
        }
        
        return allMessages;
      });
      
      // Now determine role based on context (user_contexts.json) - this is the source of truth
      const allInstagramMessages = allInstagramMessagesRaw.map(msg => {
        const messageLower = msg.content.toLowerCase().trim();
        
        // Method 1: Check if message contains links/URLs (users don't send links, only bot does)
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|\.ir\/|\.com\/|\.net\/|\.org\/|\.me\/)/i;
        const hasLink = urlPattern.test(msg.content);
        
        if (hasLink) {
          console.log(`[${username}] Message contains link - detected as bot message: "${msg.content.substring(0, 50)}..."`);
          return {
            role: 'assistant',
            content: msg.content,
            timestamp: msg.timestamp
          };
        }
        
        // Method 2: Check if this message matches any bot message in our context
        const isBotMessage = allBotMessages.some(botMsg => {
          const botLower = botMsg.toLowerCase().trim();
          // Exact match
          if (messageLower === botLower) return true;
          // Partial match - if messages are similar (at least 80% match)
          if (messageLower.length >= 10 && botLower.length >= 10) {
            const minLen = Math.min(messageLower.length, botLower.length);
            const similarityThreshold = Math.max(10, Math.floor(minLen * 0.8));
            
            // Check if first N chars match
            if (messageLower.substring(0, similarityThreshold) === botLower.substring(0, similarityThreshold)) {
              return true;
            }
            
            // Check if one contains the other (for longer messages)
            if (messageLower.length > 30 && botLower.length > 30) {
              if (messageLower.includes(botLower.substring(0, Math.min(50, botLower.length))) ||
                  botLower.includes(messageLower.substring(0, Math.min(50, messageLower.length)))) {
                return true;
              }
            }
          }
          return false;
        });
        
        return {
          role: isBotMessage ? 'assistant' : 'user',
          content: msg.content,
          timestamp: msg.timestamp
        };
      });
      
      // Save all Instagram messages to context (will deduplicate)
      if (allInstagramMessages.length > 0) {
        userContextManager.addAllInstagramMessages(username, allInstagramMessages);
        console.log(`📥 [${username}] Loaded ${allInstagramMessages.length} messages from Instagram`);
      }
    } catch (err) {
      console.log(`⚠️ [${username}] Could not extract all Instagram messages: ${err.message}`);
    }
    
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
          
          // Check if this is an incoming message (not outgoing) - improved detection
          let isOutgoing = false;
          let confidence = 0;
          
          const hasFlexEnd = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                            container.querySelector('div[style*="flex-end"]') !== null ||
                            container.style?.justifyContent === 'flex-end';
          if (hasFlexEnd) confidence += 2;
          
          const parentDiv = container.closest('div[class*="x"]') || container.parentElement;
          if (parentDiv) {
            const parentStyle = window.getComputedStyle(parentDiv);
            if (parentStyle.justifyContent === 'flex-end' || 
                parentStyle.alignItems === 'flex-end') {
              confidence += 2;
            }
          }
          
          const hasSeenIndicator = container.querySelector('img[alt*="Seen"]') !== null ||
                                  container.querySelector('svg[aria-label*="Seen"]') !== null;
          if (hasSeenIndicator) confidence += 3;
          
          isOutgoing = confidence >= 2;
          
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
    // POST-PROCESSING: Best-Sellers or Product Search with Cards
    // ========================================
    const { searchProduct } = require('./search_product.js');
    const { ProductHandler } = require('./product_handler.js');
    const { ProductCardSender } = require('./product_card_sender.js');
    const fs = require('fs');
    
    // Initialize product handler and card sender
    const cardSender = new ProductCardSender(process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || null);
    const productHandler = new ProductHandler(page, userContextManager, cardSender);
    
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
      // Product handling with intelligent system and cards
      const askingForProducts = lastMessage.includes('قیمت') || 
                                lastMessage.includes('محصول') ||
                                lastMessage.includes('چند') ||
                                lastMessage.includes('چقدر') ||
                                lastMessage.includes('برام بگو') ||
                                lastMessage.includes('نشون بده') ||
                                lastMessage.includes('میخوام') ||
                                lastMessage.includes('بیشتر') ||
                                lastMessage.includes('باقی') ||
                                lastMessage.includes('لینک') ||
                                lastMessage.includes('لینک بده') ||
                                lastMessage.includes('لینک بفرست') ||
                                lastMessage.includes('همشونو') ||
                                lastMessage.includes('همه') ||
                                lastMessage.toLowerCase() === 'بله' ||
                                lastMessage.toLowerCase() === 'آره' ||
                                lastMessage.toLowerCase() === 'بفرست' ||
                                lastMessage.toLowerCase() === 'ارسال کن';
      
      if (askingForProducts) {
        console.log(`🔍 [${username}] Processing product request with intelligent handler...`);
        
        // استفاده از ProductHandler
        const productResult = await productHandler.handleProductRequest(
          username,
          lastMessage,
          conversationHistory
        );
        
        if (productResult && productResult.success) {
          // کارت‌ها توسط ProductHandler ارسال شده‌اند
          // فقط پیام follow-up را برای ارسال آماده کن
          if (productResult.message) {
            response.responses[0].message = productResult.message;
          }
          
          // Mark that cards were sent (so we don't send links again)
          response.responses[0].sendProductInfo = true;
          response.responses[0].sendLink = false;
          response.responses[0].cardsWereSent = true; // Flag to indicate cards were sent
          
          if (productResult.product) {
            response.responses[0].productLink = productResult.product.productUrl;
          }
          
          // Save messages to context
          if (productResult.message) {
            userContextManager.addMessage(username, 'assistant', productResult.message);
          }
          
          console.log(`✅ [${username}] Product handled successfully - ${productResult.productsShown || 1} card(s) sent`);
        } else {
          // اگر محصول پیدا نشد یا خطا بود، از AI response استفاده کن
          console.log(`ℹ️ [${username}] No products found or error, using AI response`);
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
    
    // Emit to dashboard (non-blocking, fails silently)
    try {
      const messageId = `${username}_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      dashboardEvents.emitMessage(username, messageId, 'user', lastMessage, username);
    } catch (err) {
      // Silently ignore - dashboard is optional
    }

    // Send replies - flatten all responses from all messages
    const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    if (textarea) {
      // Check if product cards were already sent (by ProductHandler)
      const productState = userContextManager.getProductState(username);
      const cardsWereSent = productState.lastShownIndex > 0 || 
                           allResponses.some(r => r.responses && r.responses.some(resp => resp.cardsWereSent));
      
      // Flatten responses from all message responses
      const allFlattenedResponses = [];
      allResponses.forEach(resp => {
        if (resp.responses && Array.isArray(resp.responses)) {
          allFlattenedResponses.push(...resp.responses);
        } else if (resp.message) {
          allFlattenedResponses.push({ 
            message: resp.message, 
            sendLink: resp.sendLink,
            sendProductInfo: resp.sendProductInfo,
            productLink: resp.productLink
          });
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
        
        // Create unique message ID for this response
        const baseTimestamp = Date.now();
        const uniqueId = `${username}_bot_${baseTimestamp}_${i}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add link SEPARATELY if needed
        if (resp.sendLink) {
          // Send message first
          await textarea.type(fullMessage, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
          
          // Emit text message to dashboard
          userContextManager.addMessage(username, 'assistant', fullMessage);
          try {
            dashboardEvents.emitMessage(username, uniqueId, 'bot', fullMessage, username);
          } catch (err) {}
          
          await delay(1000);
          
          // Send affiliate link separately
          await textarea.click();
          await delay(300);
          await textarea.type(AFFILIATE_LINK, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`🔗 [${username}] Affiliate link sent separately`);
          
          // Emit link to dashboard
          userContextManager.addMessage(username, 'assistant', AFFILIATE_LINK);
          try {
            const linkId = `${username}_bot_${Date.now()}_${i}_link_${Math.random().toString(36).substr(2, 9)}`;
            dashboardEvents.emitMessage(username, linkId, 'bot', AFFILIATE_LINK, username);
          } catch (err) {}
          
        } else if (resp.sendProductInfo === true && resp.productLink) {
          // اگر کارت‌ها قبلاً ارسال شده‌اند، فقط پیام follow-up را ارسال کن
          if (cardsWereSent) {
            // کارت‌ها توسط ProductHandler ارسال شده‌اند
            // فقط پیام follow-up را ارسال کن
            if (fullMessage && fullMessage.trim().length > 0) {
              await textarea.type(fullMessage, { delay: 25 });
              await delay(300);
              await page.keyboard.press("Enter");
              console.log(`✅ [${username}] Follow-up message sent after cards!`);
              
              userContextManager.addMessage(username, 'assistant', fullMessage);
              try {
                dashboardEvents.emitMessage(username, uniqueId, 'bot', fullMessage, username);
              } catch (err) {}
            }
          } else {
            // کارت‌ها ارسال نشده‌اند، پیام و لینک را ارسال کن (fallback)
            await textarea.type(fullMessage, { delay: 25 });
            await delay(300);
            await page.keyboard.press("Enter");
            console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
            console.log(`🔗 [${username}] Product link: ${resp.productLink}`);
            
            userContextManager.addMessage(username, 'assistant', fullMessage);
            try {
              dashboardEvents.emitMessage(username, uniqueId, 'bot', fullMessage, username);
            } catch (err) {}
            
            await delay(1000);
            
            // Send product link separately
            await textarea.click();
            await delay(300);
            await textarea.type(resp.productLink, { delay: 25 });
            await delay(300);
            await page.keyboard.press("Enter");
            console.log(`🛍️ [${username}] Product link sent separately: ${resp.productLink}`);
            
            userContextManager.addMessage(username, 'assistant', resp.productLink);
            try {
              const linkId = `${username}_bot_${Date.now()}_${i}_link_${Math.random().toString(36).substr(2, 9)}`;
              dashboardEvents.emitMessage(username, linkId, 'bot', resp.productLink, username);
            } catch (err) {}
          }
          
        } else {
          // Just send the message
          await textarea.type(fullMessage, { delay: 25 });
          await delay(300);
          await page.keyboard.press("Enter");
          console.log(`✅ [${username}] Message ${i + 1}/${allFlattenedResponses.length} sent!`);
          
          // Emit to dashboard
          userContextManager.addMessage(username, 'assistant', fullMessage);
          try {
            dashboardEvents.emitMessage(username, uniqueId, 'bot', fullMessage, username);
          } catch (err) {}
        }
        
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
  
  // Emit startup log to dashboard
  try {
    dashboardEvents.emitLog('info', 'Bot starting up', 'bot');
  } catch (err) {}

  const messageCache = new MessageCache();
  const userContextManager = new UserContextManager();
  const perfMonitor = new PerformanceMonitor();

  // Start integrated API server (runs together with bot)
  try {
    const { startAPIServer } = require('./api-server');
    // Render uses PORT, fallback to API_PORT, then default
    const API_PORT = process.env.PORT || process.env.API_PORT || 3001;
    apiServer = startAPIServer(userContextManager, messageCache, API_PORT);
    
    // Wait a moment to see if server starts successfully
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if server started (if it didn't, apiServer will be undefined or have error)
    if (apiServer) {
      console.log(`✅ API Server integrated and running on port ${API_PORT}`);
      
      // Connect dashboard-events to integrated server
      if (dashboardEvents && dashboardEvents.setIntegratedServer) {
        dashboardEvents.setIntegratedServer(apiServer);
      }
    } else {
      console.log('⚠️ API Server could not start (port may be in use)');
      console.log('   Bot will continue without API server');
    }
  } catch (err) {
    console.log('⚠️ Could not start integrated API server:', err.message);
    console.log('   Bot will continue without API server');
    apiServer = null; // Ensure apiServer is null if it fails
  }

  console.log("🌐 Starting browser...");
  const chromiumPath = getChromiumPath();
  const launchOptions = {
    headless: true,
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
  };
  
  // Only set executablePath if we found a system browser
  if (chromiumPath) {
    launchOptions.executablePath = chromiumPath;
  }
  // Otherwise, let Puppeteer use its bundled Chromium (installed during build via npx puppeteer browsers install chrome)
  
  const browser = await puppeteer.launch(launchOptions);
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
    try {
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
    } catch (cookieError) {
      console.log("⚠️ Warning: Could not set session cookie:", cookieError.message);
      console.log("   Will try to login with credentials if available...");
    }
  }

  console.log("📱 Navigating to Instagram...");
  try {
    await page.goto("https://www.instagram.com/", { 
      waitUntil: "domcontentloaded", // Changed from networkidle2 to domcontentloaded (faster)
      timeout: 60000 // Increased from 30000 to 60000 (60 seconds)
    });
    await delay(5000);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log("⚠️ Navigation timeout - trying with load strategy...");
      try {
        await page.goto("https://www.instagram.com/", { 
          waitUntil: "load",
          timeout: 60000
        });
        await delay(5000);
      } catch (retryError) {
        console.error("❌ Failed to load Instagram after retry:", retryError.message);
        throw new Error(`Failed to navigate to Instagram: ${retryError.message}. Session may be expired or network issue.`);
      }
    } else {
      throw error;
    }
  }

  const loggedIn = await page.evaluate(
    () => !!document.querySelector('a[href*="/direct/inbox"]'),
  );
  console.log(`🔍 Login status: ${loggedIn ? "✅ Logged in" : "❌ Not logged in"}`);

  if (!loggedIn) {
    // Check if we have credentials for login
    const username = INSTAGRAM_USERNAME ? String(INSTAGRAM_USERNAME) : '';
    const password = INSTAGRAM_PASSWORD ? String(INSTAGRAM_PASSWORD) : '';
    
    if (!username || !password) {
      if (INSTA_SESSION) {
        throw new Error('Not logged in despite INSTA_SESSION being set. The session cookie may be expired. Please update INSTA_SESSION or set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD for fresh login.');
      } else {
        throw new Error('Not logged in. Please set either INSTA_SESSION (for cookie-based login) or INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD (for credential-based login) in environment variables.');
      }
    }
    
    console.log("🔐 Logging in...");
    
    try {
      await page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "domcontentloaded",
        timeout: 60000
      });
      await delay(2000);
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log("⚠️ Login page timeout - trying with load strategy...");
        await page.goto("https://www.instagram.com/accounts/login/", {
          waitUntil: "load",
          timeout: 60000
        });
        await delay(2000);
      } else {
        throw error;
      }
    }

    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 15000 });
    await page.type('input[name="username"]', username, { delay: 40 });
    await page.type('input[name="password"]', password, { delay: 40 });
    await page.click('button[type="submit"]');
    await delay(5000);
    console.log("✅ Login complete");
  }

  console.log("✅ Opening messages...");
  try {
    await page.goto("https://www.instagram.com/direct/inbox/", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await delay(3000);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log("⚠️ Inbox page timeout - trying with load strategy...");
      await page.goto("https://www.instagram.com/direct/inbox/", {
        waitUntil: "load",
        timeout: 60000
      });
      await delay(3000);
    } else {
      throw error;
    }
  }

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
      // Check if bot is paused (from API server)
      if (apiServer) {
        const status = apiServer.getBotStatus();
        if (status && status.paused) {
          console.log("⏸️ Bot is paused. Waiting...");
          await delay(5000);
          continue;
        }
        if (status && !status.running) {
          console.log("🛑 Bot is stopped. Exiting...");
          break;
        }
      }

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
