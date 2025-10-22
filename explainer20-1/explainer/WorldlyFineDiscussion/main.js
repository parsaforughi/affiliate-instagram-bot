const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fetch = require("node-fetch");
const { execSync } = require("child_process");
const fs = require('fs');
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
      };
    }
    this.contexts[username].lastSeen = Date.now();
    return this.contexts[username];
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
// N8N WEBHOOK INTEGRATION (GPT Processing via n8n)
// ========================================
async function askGPT(userMessage, userContext, conversationHistory = []) {
  const systemPrompt = `
تو «سیلانه اکسپلینر» هستی - نماینده باهوش، گرم و دوستانه برند سیلانه.

وظیفه تو:
- به همه پیام‌ها پاسخ بده، نه فقط پیام‌های همکاری
- هر پاسخ باید منحصر به فرد و شخصی‌سازی شده باشد
- از نام کاربر به طور طبیعی استفاده کن: ${userContext.name || userContext.username || 'عزیز'}
- لحن را با لحن کاربر تطبیق بده (${userContext.tone || 'صمیمانه'})
- گفتگوی طبیعی و انسانی داشته باش - هرگز پاسخ کپی‌پیست نده
- انرژی و سبک خودت رو با کاربر هماهنگ کن

پروفایل کاربر:
- نام کاربری: ${userContext.username}
- نام: ${userContext.name || 'هنوز مشخص نیست'}
- بیو: ${userContext.bio || 'هنوز مشخص نیست'}
- لحن: ${userContext.tone || 'صمیمانه'}
- تاریخچه: ${conversationHistory.length} پیام

برنامه افیلیت سیلانه:
- همکاری مستقیم با سیلانه (بدون واسطه)
- کد تخفیف ۲۰ تا ۴۰٪ شخصی‌سازی شده برای مخاطبانت
- کمیسیون مستقیم از هر فروش
- برندها: Misswake, Collamin, Umbrella, Dafi, IceBall

تشخیص قصد:
اگر کاربر آماده شروع همکاری است (مثل "بفرست"، "لینک بده"، "می‌خوام شروع کنم"، "ثبت‌نام"):
  "sendLink": true بذار
در غیر این صورت:
  "sendLink": false

وقتی کاربر آماده است، لینک رو به طور طبیعی توی پیامت بنویس:
"می‌تونی از اینجا شروع کنی: ${AFFILIATE_LINK} ✨"

فرمت خروجی (JSON):
{
  "message": "متن پاسخ به فارسی",
  "sendLink": true/false,
  "detectedTone": "formal/casual/playful/professional",
  "userName": "اسم کاربر اگر توی گفتگو ذکر شد، در غیر این صورت null"
}

سبک ارتباطی:
- دوستانه، با اعتماد به نفس، محترمانه، گرم
- بدون عبارات رباتیک، بدون تکرار
- از ایموجی‌های ظریف 🌿✨😊 به طور طبیعی استفاده کن
- گفتگوی واقعی و اصیل داشته باش
- در صورت نیاز سوالات جذاب بپرس
- علاقه واقعی به نیازهای کاربر نشان بده

مهم:
- هر پاسخ باید متفاوت باشد
- از نام کاربر به طور طبیعی استفاده کن
- به سوالات مشخص، پاسخ‌های مشخص بده
- گرم، حرفه‌ای و انسانی باش
- همیشه به فارسی پاسخ بده
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

    console.log("🌐 Sending to n8n webhook...");
    
    const res = await fetch("https://parsaforughi.app.n8n.cloud/webhook-test/replit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage: userMessage,
        userContext: userContext,
        conversationHistory: conversationHistory,
        systemPrompt: systemPrompt,
        affiliateLink: AFFILIATE_LINK,
        messages: messages,
      }),
    });

    if (!res.ok) {
      throw new Error(`n8n webhook error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log("✅ Response received from n8n");
    console.log("📦 n8n response data:", JSON.stringify(data));
    
    return {
      message: data.message || data.response || data.text || JSON.stringify(data),
      sendLink: data.sendLink || false,
      detectedTone: data.detectedTone || 'casual',
      userName: data.userName || null,
    };
  } catch (err) {
    console.error("n8n Webhook Error:", err.message);
    // FAIL-SAFE RESPONSE - IN PERSIAN (bot still responds in Persian to users)
    return {
      message: `سلام 🌿 پیامت رو دیدم - می‌تونی یکم بیشتر بگی تا بتونم درست کمکت کنم؟`,
      sendLink: false,
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
      let messageTimestamp = null;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

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
        conversationId,
        messageTimestamp: messageTimestamp ? messageTimestamp.toISOString() : null,
        isTodayMessage: !!lastIncomingMessage,
      };
    }, MY_USERNAME, conv.username);

    const { username, bio, lastMessage, lastMessageId, allMessages, conversationId, messageTimestamp, isTodayMessage } = conversationData;

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

    // Generate AI response
    const response = await askGPT(lastMessage, userContext, conversationHistory);
    
    console.log(`🤖 [${username}] Response ready`);

    // Update context
    if (response.userName && !userContext.name) {
      userContextManager.updateContext(username, { name: response.userName });
    }
    if (response.detectedTone) {
      userContextManager.updateContext(username, { tone: response.detectedTone });
    }

    userContextManager.addMessage(username, 'user', lastMessage);

    // Send reply
    const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    if (textarea) {
      await textarea.click();
      await delay(300);
      
      await textarea.type(response.message, { delay: 25 });
      await delay(300);
      
      await page.keyboard.press("Enter");
      console.log(`✅ [${username}] Response sent!`);

      userContextManager.addMessage(username, 'assistant', response.message);

      await delay(1500);

      if (response.sendLink) {
        console.log(`🔗 [${username}] Sending affiliate link...`);
        await delay(800);
        
        await textarea.click();
        await delay(300);
        await textarea.type(AFFILIATE_LINK, { delay: 20 });
        await delay(300);
        await page.keyboard.press("Enter");
        
        console.log(`✅ [${username}] Affiliate link sent!`);
        await delay(1000);
      }

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
    passed: greetingResponse.message && greetingResponse.message.length > 10,
    responseTime: t1Time,
  });
  console.log(`   ${tests[0].passed ? '✅' : '❌'} Greeting: ${tests[0].passed ? 'Passed' : 'Failed'} (${(t1Time/1000).toFixed(2)}s)`);

  console.log("🧪 Test 2: Affiliate Detection...");
  const t2Start = Date.now();
  const affiliateResponse = await askGPT("لینک رو بفرست", mockUser, []);
  const t2Time = Date.now() - t2Start;
  tests.push({
    name: "Affiliate",
    passed: affiliateResponse.sendLink === true,
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
    ],
  });
  const page = await browser.newPage();

  if (INSTA_SESSION) {
    console.log("🍪 Using session cookie...");
    await page.setCookie({
      name: "sessionid",
      value: INSTA_SESSION,
      domain: ".instagram.com",
      path: "/",
      httpOnly: true,
      secure: true,
    });
  }

  console.log("📱 Navigating to Instagram...");
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2" });
  await delay(3000);

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

      // Check message requests every 10 loops
      requestCheckCounter++;
      if (requestCheckCounter >= 10) {
        await checkMessageRequests(page);
        await page.goto("https://www.instagram.com/direct/inbox/", {
          waitUntil: "networkidle2",
          timeout: 15000
        });
        await delay(2000);
        requestCheckCounter = 0;
      }

      // Refresh inbox
      await page.reload({ waitUntil: "networkidle2", timeout: 15000 });
      await delay(1500);

      // Dismiss popups
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const notNowButton = buttons.find(btn => 
          btn.textContent.includes('Not Now') || btn.textContent.includes('بعداً')
        );
        if (notNowButton) notNowButton.click();
      });
      await delay(500);

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

      // Process only top 2 UNREAD conversations (reduced to prevent GPT overload)
      const toProcess = unreadConvs.slice(0, 2);
      console.log(`⚡ Processing ${toProcess.length} unread conversations...`);
      
      let processedCount = 0;
      for (const conv of toProcess) {
        const result = await processConversation(page, conv, messageCache, userContextManager, perfMonitor);
        
        // If we successfully processed a message, increment counter and add delay to prevent GPT overload
        if (result.processed) {
          processedCount++;
          console.log(`✅ Processed: ${processedCount} messages in this cycle`);
          
          // Add delay between GPT calls to prevent rate limiting
          if (processedCount < toProcess.length) {
            console.log(`⏱️ 3 second delay to prevent GPT overload...`);
            await delay(3000);
          }
        }
        
        // Go back to inbox after each
        await page.goto("https://www.instagram.com/direct/inbox/", {
          waitUntil: "networkidle2",
          timeout: 15000
        });
        await delay(2000);
      }

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
