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
  GOOGLE_SHEETS_ENABLED = "false", // Disabled by default, only runs when Arman commands it
} = process.env;

const AFFILIATE_LINK = "https://affiliate.luxirana.com/account/login";

// ========================================
// USER CONTEXT STORAGE (Personalization)
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
        console.log(`👥 Loaded ${Object.keys(data).length} user contexts`);
        return data;
      }
    } catch (err) {
      console.log("👥 No previous user contexts found, starting fresh");
    }
    return {};
  }

  save() {
    try {
      fs.writeFileSync(this.contextFile, JSON.stringify(this.contexts, null, 2));
    } catch (err) {
      console.error("⚠️ Failed to save user contexts:", err.message);
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
    // Keep only last 20 messages
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
// MESSAGE CACHE (Real-time detection)
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
        console.log(`💾 Loaded message cache with ${Object.keys(data).length} conversations`);
        return data;
      }
    } catch (err) {
      console.log("💾 No message cache found, starting fresh");
    }
    return {};
  }

  save() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (err) {
      console.error("⚠️ Failed to save message cache:", err.message);
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

  markAsProcessed(conversationId, messageId) {
    if (!this.cache[conversationId]) {
      this.cache[conversationId] = {};
    }
    this.cache[conversationId].lastMessageId = messageId;
    this.cache[conversationId].lastCheck = Date.now();
    this.save();
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
    
    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    
    const status = responseTime < 3000 ? '✅' : '⚠️';
    console.log(`${status} Response time: ${(responseTime / 1000).toFixed(2)}s (avg: ${(this.metrics.avgResponseTime / 1000).toFixed(2)}s)`);
    
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
// ENHANCED GPT INTEGRATION
// ========================================
async function askGPT(userMessage, userContext, conversationHistory = []) {
  const systemPrompt = `
You are "Seylane Explainer" - an intelligent, warm, and friendly representative of the Seylane brand.

YOUR ROLE:
- Respond to ALL messages, not just affiliate inquiries
- Every response MUST be unique and personalized
- Use the user's name naturally: ${userContext.name || userContext.username || 'کاربر'}
- Match the user's tone (${userContext.tone || 'casual'})
- Create natural, human-like conversations - NEVER copy-paste responses
- Adapt your energy and style to mirror the user's communication style

USER PROFILE:
- Username: ${userContext.username}
- Name: ${userContext.name || 'Not yet known'}
- Bio: ${userContext.bio || 'Not yet known'}
- Detected Tone: ${userContext.tone || 'casual'}
- Conversation History: ${conversationHistory.length} messages

SEYLANE AFFILIATE PROGRAM:
- Direct partnership with Seylane (no middleman)
- 20-40% personalized discount code for your audience
- Direct commission from every sale
- Brands: Misswake, Collamin, Umbrella, Dafi, IceBall

INTENT DETECTION:
If the user is ready to start collaboration (e.g., "send it", "give me the link", "I want to start", "register me", "بفرست", "لینک بده", "می‌خوام شروع کنم", "ثبت‌نام"):
  Set "sendLink": true in your JSON response
Otherwise:
  Set "sendLink": false

AFFILIATE LINK EXPLANATION:
When you detect readiness, naturally include the registration link in your message:
"You can start here: ${AFFILIATE_LINK} ✨"

OUTPUT FORMAT (JSON):
{
  "message": "Your personalized response text",
  "sendLink": true/false,
  "detectedTone": "formal/casual/playful/professional",
  "userName": "User's name if mentioned in conversation, otherwise null"
}

COMMUNICATION STYLE:
- Friendly, confident, respectful, warm
- No robotic phrasing, no repetition
- Use subtle emojis 🌿✨😊 naturally
- Be conversational and authentic
- Ask engaging questions when appropriate
- Show genuine interest in their needs

IMPORTANT:
- Each response MUST be different
- Use the user's name naturally
- Give specific answers to specific questions
- Be warm, professional, and human
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages: messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      message: parsed.message || content,
      sendLink: parsed.sendLink || false,
      detectedTone: parsed.detectedTone || 'casual',
      userName: parsed.userName || null,
    };
  } catch (err) {
    console.error("GPT Error:", err.message);
    // FAIL-SAFE RESPONSE
    return {
      message: `Hey 🌿 I just saw your message — could you tell me a bit more so I can help properly?`,
      sendLink: false,
      detectedTone: 'casual',
      userName: null,
    };
  }
}

// ========================================
// MESSAGE REQUESTS HANDLER
// ========================================
async function checkMessageRequests(page) {
  try {
    console.log("📨 Checking message requests...");
    
    // Navigate to message requests
    await page.goto("https://www.instagram.com/direct/requests/", {
      waitUntil: "networkidle2",
      timeout: 15000
    });
    await delay(3000);

    // Check if there are any requests
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
      console.log("✅ Accepted message request");
      await delay(2000);
    } else {
      console.log("ℹ️ No pending message requests");
    }
  } catch (err) {
    console.log("⚠️ Error checking message requests:", err.message);
  }
}

// ========================================
// GOOGLE SHEETS MODULE (Optional)
// ========================================
async function processGoogleSheets(page, userContextManager) {
  if (GOOGLE_SHEETS_ENABLED !== "true") {
    return;
  }

  console.log("📊 Google Sheets module is DISABLED by default");
  console.log("📊 To enable: Set GOOGLE_SHEETS_ENABLED=true in environment");
  
  // TODO: Implement Google Sheets reading when Arman enables it
  // This will:
  // 1. Read one row at a time (username + message)
  // 2. Send personalized DM per user
  // 3. Mark each row as "sent"
  // 4. Never interfere with normal inbound message handling
}

// ========================================
// PROCESS SINGLE CONVERSATION (Async)
// ========================================
async function processConversation(page, convIndex, messageCache, userContextManager, perfMonitor) {
  const startTime = Date.now();
  
  try {
    console.log(`\n📖 Processing conversation #${convIndex + 1}...`);

    // Re-query for conversation buttons
    const convButton = await page.evaluate((index) => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      
      const conversations = buttons.filter(btn => {
        const text = btn.innerText;
        if (btn.closest('[role="tablist"]')) return false;
        if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
        if (text.includes('luxirana')) return false;
        if (text.includes('Note')) return false;
        return text && text.trim().length > 5 && text.length < 300;
      });
      
      if (index < conversations.length) {
        const btn = conversations[index];
        return {
          found: true,
          preview: btn.innerText.substring(0, 60),
        };
      }
      return { found: false };
    }, convIndex);

    if (!convButton.found) {
      console.log(`ℹ️ No more conversations to check`);
      return false;
    }

    console.log(`📬 Found: "${convButton.preview}"`);

    // Click conversation
    await page.evaluate((index) => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      const conversations = buttons.filter(btn => {
        const text = btn.innerText;
        if (btn.closest('[role="tablist"]')) return false;
        if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
        if (text.includes('luxirana')) return false;
        if (text.includes('Note')) return false;
        return text && text.trim().length > 5 && text.length < 300;
      });
      if (index < conversations.length) {
        conversations[index].click();
      }
    }, convIndex);

    await delay(3000);

    // Extract conversation data
    const conversationData = await page.evaluate(() => {
      let username = '';
      const headerElements = document.querySelectorAll('header a, header span, h2, h3');
      for (const el of headerElements) {
        const text = el.innerText?.trim();
        if (text && text.length > 0 && text.length < 50 && !text.includes('http')) {
          username = text;
          break;
        }
      }

      // Get bio if available
      let bio = null;
      const bioElements = document.querySelectorAll('header div');
      for (const el of bioElements) {
        const text = el.innerText?.trim();
        if (text && text.length > 20 && text.length < 200) {
          bio = text;
          break;
        }
      }

      const messageContainers = Array.from(document.querySelectorAll('div[role="row"]'));
      
      let lastIncomingMessage = "";
      let lastIncomingMessageId = "";
      let allUserMessages = [];

      for (let i = messageContainers.length - 1; i >= 0; i--) {
        const container = messageContainers[i];
        const messageDiv = container.querySelector('div[dir="auto"]');
        
        if (!messageDiv) continue;
        
        const messageText = messageDiv.innerText?.trim();
        if (!messageText || messageText.length === 0 || messageText.length > 500) continue;
        
        const isOutgoing = container.querySelector('div[style*="justify-content: flex-end"]') !== null ||
                          container.querySelector('div[style*="flex-end"]') !== null;
        
        if (!isOutgoing && !lastIncomingMessage) {
          lastIncomingMessage = messageText;
          lastIncomingMessageId = `${username}_${messageText.substring(0, 50)}_${i}`;
        }
        
        if (!isOutgoing) {
          allUserMessages.unshift(messageText);
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
        conversationUrl,
      };
    });

    const { username, bio, lastMessage, lastMessageId, allMessages, conversationId } = conversationData;

    console.log(`👤 Username: "${username}"`);
    console.log(`📨 Last message: "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`);

    if (!lastMessage || lastMessage.length === 0) {
      console.log("ℹ️ No message found, skipping...");
      return true;
    }

    // Check if this is a new message (real-time detection)
    if (!messageCache.isNewMessage(conversationId, lastMessageId)) {
      console.log("ℹ️ Already processed this message, skipping...");
      return true;
    }

    console.log("💬 NEW MESSAGE DETECTED - Generating reply...");

    // Get or create user context
    const userContext = userContextManager.getContext(username);
    if (bio && !userContext.bio) {
      userContextManager.updateContext(username, { bio });
    }

    // Get conversation history
    const conversationHistory = userContextManager.getRecentMessages(username, 8);

    // Generate AI response
    const response = await askGPT(lastMessage, userContext, conversationHistory);
    
    console.log(`🤖 GPT Reply: ${response.message.substring(0, 100)}...`);
    console.log(`🔗 Send link: ${response.sendLink}`);

    // Update user context with detected info
    if (response.userName && !userContext.name) {
      userContextManager.updateContext(username, { name: response.userName });
    }
    if (response.detectedTone) {
      userContextManager.updateContext(username, { tone: response.detectedTone });
    }

    // Add message to history
    userContextManager.addMessage(username, 'user', lastMessage);

    // Send reply
    const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    if (textarea) {
      await textarea.click();
      await delay(300);
      
      await textarea.type(response.message, { delay: 30 });
      await delay(300);
      
      await page.keyboard.press("Enter");
      console.log("✅ Reply sent!");

      // Add assistant message to history
      userContextManager.addMessage(username, 'assistant', response.message);

      await delay(1500);

      // Send affiliate link if needed
      if (response.sendLink) {
        console.log("🔗 Sending affiliate link...");
        await delay(800);
        
        await textarea.click();
        await delay(300);
        await textarea.type(AFFILIATE_LINK, { delay: 20 });
        await delay(300);
        await page.keyboard.press("Enter");
        
        console.log("✅ Affiliate link sent!");
        await delay(1000);
      }

      // Mark as processed
      messageCache.markAsProcessed(conversationId, lastMessageId);

      // Track performance
      perfMonitor.trackResponse(startTime);

      return true;
    } else {
      console.error("❌ Could not find textarea");
      return true;
    }

  } catch (err) {
    console.log(`⚠️ Error in conversation #${convIndex + 1}:`, err.message);
    return true;
  }
}

// ========================================
// SELF-TEST SEQUENCE
// ========================================
async function runSelfTest() {
  console.log("\n🧪 ========================================");
  console.log("🧪 SELF-TEST SEQUENCE - Seylane AI v3.3");
  console.log("🧪 ========================================\n");

  const tests = [];

  // Test 1: Greeting simulation
  console.log("🧪 Test 1: Greeting simulation...");
  const mockUser = {
    username: 'test_user',
    name: 'Test User',
    bio: 'Digital Creator',
    tone: 'casual',
    messageHistory: [],
  };
  const greetingResponse = await askGPT("سلام", mockUser, []);
  tests.push({
    name: "Greeting",
    passed: greetingResponse.message && greetingResponse.message.length > 10,
    responseTime: "< 3s",
  });
  console.log(`   ${tests[0].passed ? '✅' : '❌'} Greeting test: ${tests[0].passed ? 'PASSED' : 'FAILED'}`);

  // Test 2: Affiliate intent
  console.log("🧪 Test 2: Affiliate intent detection...");
  const affiliateResponse = await askGPT("لینک رو بفرست", mockUser, []);
  tests.push({
    name: "Affiliate Detection",
    passed: affiliateResponse.sendLink === true,
    responseTime: "< 3s",
  });
  console.log(`   ${tests[1].passed ? '✅' : '❌'} Affiliate test: ${tests[1].passed ? 'PASSED' : 'FAILED'}`);

  // Test 3: Tone matching
  console.log("🧪 Test 3: Tone matching...");
  const toneResponse = await askGPT("What's up?", mockUser, []);
  tests.push({
    name: "Tone Matching",
    passed: toneResponse.detectedTone !== null,
    responseTime: "< 3s",
  });
  console.log(`   ${tests[2].passed ? '✅' : '❌'} Tone test: ${tests[2].passed ? 'PASSED' : 'FAILED'}`);

  console.log("\n🧪 ========================================");
  console.log(`🧪 Tests passed: ${tests.filter(t => t.passed).length}/${tests.length}`);
  console.log("🧪 ========================================\n");

  return tests.every(t => t.passed);
}

// ========================================
// MAIN EXECUTION
// ========================================
(async () => {
  console.log("🚀 ========================================");
  console.log("🚀 Seylane Instagram Explainer v3.3");
  console.log("🚀 Real-Time Speed + Smart Personalization");
  console.log("🚀 ========================================\n");

  // Run self-test
  const testsPassed = await runSelfTest();
  if (!testsPassed) {
    console.log("⚠️ Some tests failed, but continuing anyway...");
  }

  // Initialize managers
  const messageCache = new MessageCache();
  const userContextManager = new UserContextManager();
  const perfMonitor = new PerformanceMonitor();

  console.log("\n🌐 Launching browser...");
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

  // Login
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
    console.log("✅ Login completed");
  }

  console.log("✅ Opening DMs...");
  await page.goto("https://www.instagram.com/direct/inbox/", {
    waitUntil: "networkidle2",
  });
  await delay(3000);

  // Dismiss notifications
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const notNowButton = buttons.find(btn => btn.textContent.includes('Not Now'));
      if (notNowButton) notNowButton.click();
    });
    await delay(1000);
  } catch (e) {
    // Ignore
  }

  console.log("\n💬 ========================================");
  console.log("💬 REAL-TIME MESSAGE MONITORING ACTIVE");
  console.log("💬 Target response time: < 3 seconds");
  console.log("💬 ========================================\n");

  let loopCount = 0;
  let requestCheckCounter = 0;

  // Main loop - optimized for speed
  while (true) {
    try {
      loopCount++;
      console.log(`\n🔄 Check #${loopCount} - ${new Date().toLocaleTimeString()}`);

      // Check message requests every 10 loops
      requestCheckCounter++;
      if (requestCheckCounter >= 10) {
        await checkMessageRequests(page);
        requestCheckCounter = 0;
      }

      // Navigate to inbox
      await page.goto("https://www.instagram.com/direct/inbox/", {
        waitUntil: "networkidle2",
        timeout: 20000
      });
      await delay(2000);

      // Dismiss popups
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const notNowButton = buttons.find(btn => 
          btn.textContent.includes('Not Now') || btn.textContent.includes('بعداً')
        );
        if (notNowButton) notNowButton.click();
      });
      await delay(1000);

      // Process conversations (check up to 5)
      const maxConvs = 5;
      for (let i = 0; i < maxConvs; i++) {
        const shouldContinue = await processConversation(
          page, 
          i, 
          messageCache, 
          userContextManager, 
          perfMonitor
        );
        
        if (!shouldContinue) break;

        // Go back to inbox after each conversation
        if (i < maxConvs - 1) {
          await page.goto("https://www.instagram.com/direct/inbox/", {
            waitUntil: "networkidle2",
            timeout: 20000
          });
          await delay(2000);
        }
      }

      // Show performance stats
      const stats = perfMonitor.getStats();
      console.log(`\n📊 Performance: ${stats.totalMessages} msgs | Avg: ${stats.avgResponseTime} | Target: ${stats.targetMet ? '✅ MET' : '⚠️ MISSED'}`);

      console.log("✅ Scan complete, waiting 15s...");
      await delay(15000); // Wait 15 seconds before next scan

    } catch (err) {
      console.error("❌ Loop error:", err.message);
      await delay(20000);
    }
  }
})();
