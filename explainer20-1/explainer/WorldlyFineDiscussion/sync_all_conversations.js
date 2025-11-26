const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { execSync } = require("child_process");
const fs = require('fs');
puppeteer.use(StealthPlugin());

const {
  OPENAI_API_KEY,
  INSTAGRAM_USERNAME,
  INSTAGRAM_PASSWORD,
  INSTA_SESSION,
} = process.env;

const MY_USERNAME = INSTAGRAM_USERNAME || "luxirana";
const OUTPUT_PATH = './user_contexts.json';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getChromiumPath = () => {
  try {
    return execSync("which chromium").toString().trim();
  } catch (err) {
    console.error("❌ Chromium not found");
    process.exit(1);
  }
};

async function extractAllInboxConversations(page) {
  console.log("\n🔍 STEP 1: Extracting ALL conversations from inbox...");
  
  return await page.evaluate((myUsername) => {
    const conversations = [];
    const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
    
    console.log(`DEBUG: Total buttons found: ${buttons.length}`);
    
    const convButtons = buttons.filter(btn => {
      const text = btn.innerText;
      if (btn.closest('[role="tablist"]')) return false;
      if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
      if (text.includes(myUsername)) return false;
      if (text.includes('Note')) return false;
      return text && text.trim().length > 0 && text.length < 500;
    });

    console.log(`DEBUG: Found ${convButtons.length} conversation buttons after filtering`);

    convButtons.forEach((btn, index) => {
      const preview = btn.innerText.substring(0, 150);
      const lines = preview.split('\n').filter(l => l.trim());
      
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
            !trimmedLine.includes('·') &&
            !trimmedLine.includes('http')) {
          username = trimmedLine;
          break;
        }
      }
      
      if (!username) {
        username = `user_${index}`;
      }
      
      conversations.push({
        index,
        preview,
        username: username.trim(),
      });
    });

    return conversations;
  }, MY_USERNAME);
}

async function extractAllMessagesFromConversation(page, fallbackUsername, myUsername) {
  return await page.evaluate((myUsername, fallback) => {
    let username = '';
    const headerLinks = document.querySelectorAll('header a[href^="/"]');
    for (const link of headerLinks) {
      const href = link.getAttribute('href');
      if (href && href !== '/' && !href.includes(myUsername)) {
        const match = href.match(/^\/([^\/]+)/);
        if (match && match[1]) {
          username = match[1];
          break;
        }
      }
    }
    
    if (!username && fallback) {
      username = fallback;
    }

    const messageContainers = Array.from(document.querySelectorAll('div[role="row"]'));
    const messages = [];

    messageContainers.forEach(container => {
      const messageDiv = container.querySelector('div[dir="auto"]');
      if (!messageDiv) return;

      const messageText = messageDiv.innerText?.trim();
      if (!messageText || messageText.length === 0 || messageText.length > 1000) return;

      // OFFICIAL INSTAGRAM SENDER DETECTION: Use data-testid attribute
      let isOutgoing = false;
      
      // Find the message bubble element by data-testid
      let messageBubble = container.querySelector('[data-testid="message-bubble-self"]') ||
                         container.querySelector('[data-testid="message-bubble"]');
      
      // If not found in container, check siblings and parent
      if (!messageBubble && container.parentElement) {
        messageBubble = container.parentElement.querySelector('[data-testid="message-bubble-self"]') ||
                       container.parentElement.querySelector('[data-testid="message-bubble"]');
      }
      
      let roleAttr = messageBubble?.getAttribute('data-testid');
      
      if (roleAttr === 'message-bubble-self') {
        isOutgoing = true;  // Message from bot (Luxirana)
      } else if (roleAttr === 'message-bubble') {
        isOutgoing = false; // Message from user
      } else {
        // Fallback: if no data-testid found, mark as user message
        isOutgoing = false;
      }

      let timestamp = Date.now();
      const timeElement = container.querySelector('time');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          timestamp = new Date(datetime).getTime();
        }
      }

      messages.push({
        text: messageText,
        role: isOutgoing ? 'assistant' : 'user',
        timestamp: timestamp
      });
    });

    return {
      username: username || fallback || 'unknown',
      messages: messages.sort((a, b) => a.timestamp - b.timestamp)
    };
  }, MY_USERNAME, fallbackUsername);
}

async function scrollToLoadAllMessages(page) {
  console.log("   📜 Scrolling to load all messages...");
  await page.evaluate(() => {
    const container = document.querySelector('div[role="row"]:first-of-type')?.closest('div[style*="overflow"]') || 
                     document.querySelector('div[style*="flex-col"]') ||
                     document.querySelector('main');
    if (container) {
      for (let i = 0; i < 10; i++) {
        container.scrollTop = 0;
      }
    }
  });
  await delay(1500);
}

async function syncAllConversations() {
  console.log("\n🔄 ========================================");
  console.log("🔄 FULL LUXIRANA DM INBOX SYNC");
  console.log("🔄 (ALL 9 CONVERSATIONS - NO FILTERING)");
  console.log("🔄 ========================================\n");

  const chromiumPath = getChromiumPath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumPath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--disable-blink-features=AutomationControlled",
      "--disable-gpu",
    ],
    dumpio: false,
    ignoreHTTPSErrors: true,
    timeout: 60000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  if (INSTA_SESSION) {
    console.log("🍪 Setting session cookie...");
    await page.setCookie({
      name: "sessionid",
      value: INSTA_SESSION,
      domain: ".instagram.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
  }

  console.log("📱 Navigating to Instagram...");
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2", timeout: 30000 });
  await delay(3000);

  const loggedIn = await page.evaluate(() => !!document.querySelector('a[href*="/direct/inbox"]'));
  console.log(`🔍 Login status: ${loggedIn ? "✅ Logged in" : "❌ Not logged in"}`);

  if (!loggedIn) {
    console.log("🔐 Logging in...");
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" });
    await delay(2000);
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 15000 });
    await page.type('input[name="username"]', INSTAGRAM_USERNAME, { delay: 40 });
    await page.type('input[name="password"]', INSTAGRAM_PASSWORD, { delay: 40 });
    await page.click('button[type="submit"]');
    await delay(5000);
  }

  console.log("✅ Opening messages inbox...");
  await page.goto("https://www.instagram.com/direct/inbox/", { waitUntil: "networkidle2" });
  await delay(3000);

  const conversations = await extractAllInboxConversations(page);
  console.log(`✅ Found ${conversations.length} TOTAL conversations in inbox\n`);

  if (conversations.length === 0) {
    console.log("❌ ERROR: No conversations found in inbox!");
    await browser.close();
    process.exit(1);
  }

  const userContexts = {};
  let processed = 0;
  let skipped = 0;
  const skipLog = [];

  for (const conv of conversations) {
    const convNum = processed + skipped + 1;
    console.log(`\n📨 [${convNum}/${conversations.length}] Processing: "${conv.username}"`);

    try {
      const clickSuccess = await page.evaluate((index, myUsername) => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        const convButtons = buttons.filter(btn => {
          const text = btn.innerText;
          if (btn.closest('[role="tablist"]')) return false;
          if (text.includes('Primary') || text.includes('General') || text.includes('Requests')) return false;
          if (text.includes(myUsername)) return false;
          if (text.includes('Note')) return false;
          return text && text.trim().length > 0 && text.length < 500;
        });
        
        if (index < convButtons.length) {
          convButtons[index].click();
          return true;
        }
        return false;
      }, conv.index, MY_USERNAME);

      if (!clickSuccess) {
        throw new Error("Could not click conversation button");
      }

      await delay(2000);
      await scrollToLoadAllMessages(page);

      const msgData = await extractAllMessagesFromConversation(page, conv.username);
      const username = msgData.username || conv.username;

      const now = Date.now();
      const messages = msgData.messages && msgData.messages.length > 0 ? msgData.messages : [];
      
      userContexts[username] = {
        username: username,
        name: username.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        bio: null,
        tone: "casual",
        messageHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.text,
          timestamp: msg.timestamp
        })),
        firstSeen: messages.length > 0 ? messages[0].timestamp : now,
        lastSeen: messages.length > 0 ? messages[messages.length - 1].timestamp : now,
        lastGreetingDate: now
      };

      console.log(`   ✅ SUCCESS - ${messages.length} messages extracted`);
      console.log(`   ✅ Saved as: "${username}"`);
      processed++;
      
      await delay(800);
      await page.goto("https://www.instagram.com/direct/inbox/", { waitUntil: "networkidle2", timeout: 15000 });
      await delay(1500);

    } catch (err) {
      const skipReason = `ERROR: ${err.message}`;
      console.log(`   ⚠️  SKIPPED - ${skipReason}`);
      skipLog.push({ conversation: conv.username, reason: skipReason });
      skipped++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ SYNC COMPLETE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`✅ Processed: ${processed} conversations`);
  console.log(`⚠️  Skipped: ${skipped} conversations`);
  console.log(`📊 Total in user_contexts.json: ${Object.keys(userContexts).length}`);

  if (skipLog.length > 0) {
    console.log(`\n⚠️  SKIPPED CONVERSATIONS LOG:`);
    skipLog.forEach((log, idx) => {
      console.log(`   ${idx + 1}. "${log.conversation}" - ${log.reason}`);
    });
  }

  console.log(`\n💾 Writing ${Object.keys(userContexts).length} conversations to user_contexts.json...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(userContexts, null, 2));
  console.log(`✅ Successfully saved user_contexts.json\n`);

  await browser.close();
  console.log("✅ Sync session closed!\n");
}

syncAllConversations().catch(err => {
  console.error("❌ FATAL ERROR:", err.message);
  process.exit(1);
});
