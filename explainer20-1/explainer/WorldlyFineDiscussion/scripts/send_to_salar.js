// Auto-send reply to Salar
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const INSTA_SESSION = process.env.INSTA_SESSION;

function getChromiumPath() {
  try {
    return execSync("which chromium").toString().trim();
  } catch (err) {
    console.error("❌ Chromium not found");
    process.exit(1);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendToSalar() {
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
  await page.setViewport({ width: 1366, height: 768 });

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

  console.log("📱 Opening Instagram messages...");
  await page.goto("https://www.instagram.com/direct/inbox/", {
    waitUntil: "networkidle2",
  });
  await delay(3000);

  console.log("🔍 Finding Salar's conversation...");
  
  const found = await page.evaluate(() => {
    const conversations = Array.from(document.querySelectorAll('[role="listitem"]'));
    for (const conv of conversations) {
      const text = conv.textContent || '';
      if (text.includes('Salar Eskandari') || text.includes('salar')) {
        conv.click();
        return true;
      }
    }
    return false;
  });

  if (!found) {
    console.log("❌ Salar's conversation not found!");
    await browser.close();
    return;
  }

  console.log("✅ Found Salar's conversation");
  await delay(2000);

  const message = "ما تخفیف‌های ویژه‌ای داریم که بین ۲۰٪ تا ۴۰٪ متغیر است. شما می‌توانید با استفاده از کد تخفیف شخصی خود، این تخفیف‌ها را به دوستانتان نیز ارائه دهید. 😊💰";

  console.log("💬 Typing message...");
  await page.evaluate((msg) => {
    const textarea = document.querySelector('textarea[placeholder*="Message"], div[contenteditable="true"]');
    if (textarea) {
      textarea.focus();
      if (textarea.tagName === 'TEXTAREA') {
        textarea.value = msg;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        textarea.textContent = msg;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, message);

  await delay(1000);

  console.log("📤 Sending message...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const sendButton = buttons.find(btn => {
      const text = btn.textContent || '';
      return text.includes('Send') || text.includes('ارسال') || btn.getAttribute('type') === 'submit';
    });
    if (sendButton) {
      sendButton.click();
    }
  });

  await delay(2000);
  console.log("✅ Message sent to Salar!");
  
  await browser.close();
}

sendToSalar().catch(console.error);
