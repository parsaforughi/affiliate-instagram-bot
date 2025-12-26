const fetch = require('node-fetch');

// Helper function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// PRODUCT CARD FORMATTER
// ========================================

class ProductCardFormatter {
  // Format product as Rich Text Card (for Puppeteer)
  static formatAsRichTextCard(product) {
    const card = `
━━━━━━━━━━━━━━━━━━━━
🛍️ ${product.name}
━━━━━━━━━━━━━━━━━━━━

💰 قیمت مصرف‌کننده:
   ${product.price} تومان

✨ قیمت همکاری (۴۰٪ تخفیف):
   ${product.discountPrice} تومان

📦 برند: ${product.brand || 'لوکسیرانا'}

━━━━━━━━━━━━━━━━━━━━
🔗 لینک خرید:
${product.productUrl}
━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    return card;
  }

  // Format multiple products as cards
  static formatMultipleProducts(products) {
    let cards = '🛍️ محصولات پیشنهادی:\n\n';
    
    products.forEach((product, index) => {
      cards += `━━━━━━━━━━━━━━━━━━━━
${index + 1}. ${product.name}
💰 ${product.price} → ✨ ${product.discountPrice}
📦 ${product.brand || 'لوکسیرانا'}
🔗 ${product.productUrl}
━━━━━━━━━━━━━━━━━━━━\n\n`;
    });
    
    return cards.trim();
  }
}

// ========================================
// INSTAGRAM GRAPH API CARD SENDER
// ========================================

class InstagramCardSender {
  constructor(pageAccessToken) {
    this.token = pageAccessToken;
    this.apiVersion = 'v18.0';
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
    this.enabled = !!pageAccessToken;
  }

  // Send Product Card via Instagram Graph API
  async sendProductCard(recipientId, product) {
    if (!this.enabled) {
      return { success: false, reason: 'api_not_configured' };
    }

    try {
      const message = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: product.name,
                subtitle: `قیمت: ${product.price} → ${product.discountPrice} (۴۰٪ تخفیف)`,
                image_url: product.imageUrl || this.getDefaultImage(product.brand),
                default_action: {
                  type: 'web_url',
                  url: product.productUrl,
                  webview_height_ratio: 'tall'
                },
                buttons: [{
                  type: 'web_url',
                  url: product.checkoutUrl || product.productUrl,
                  title: '🛒 نهایی‌سازی سفارش',
                  webview_height_ratio: 'tall',
                  messenger_extensions: true
                }]
              }]
            }
          }
        }
      };

      const response = await fetch(
        `${this.baseURL}/me/messages?access_token=${this.token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        }
      );

      const data = await response.json();

      if (data.error) {
        console.error('Instagram API Error:', data.error);
        return { success: false, error: data.error };
      }

      return { success: true, messageId: data.message_id };
    } catch (error) {
      console.error('Send card error:', error);
      return { success: false, error: error.message };
    }
  }

  getDefaultImage(brand) {
    const brandImages = {
      'میسویک': 'https://luxirana.com/images/misswake-default.jpg',
      'کلامین': 'https://luxirana.com/images/collamin-default.jpg',
      'آیس‌بال': 'https://luxirana.com/images/iceball-default.jpg',
      'دافی': 'https://luxirana.com/images/dafi-default.jpg',
      'آمبرلا': 'https://luxirana.com/images/umbrella-default.jpg',
      'پیکسل': 'https://luxirana.com/images/pixel-default.jpg'
    };
    
    return brandImages[brand] || 'https://luxirana.com/images/default-product.jpg';
  }
}

// ========================================
// UNIFIED PRODUCT CARD SENDER
// ========================================

class ProductCardSender {
  constructor(pageAccessToken = null) {
    this.apiSender = new InstagramCardSender(pageAccessToken);
    this.formatter = new ProductCardFormatter();
  }

  // Send product card (tries API first, falls back to Rich Text)
  async sendProductCard(page, username, product, useAPI = false) {
    // For now, always use Rich Text (Puppeteer)
    // API support can be added later when we have user IDs
    return this.sendRichTextCard(page, username, product);
  }

  // Send Rich Text Card via Puppeteer
  async sendRichTextCard(page, username, product) {
    try {
      const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
      
      if (!textarea) {
        return { success: false, error: 'Textarea not found' };
      }

      // Format as card
      const cardMessage = this.formatter.formatAsRichTextCard(product);

      // Send card message
      await textarea.click();
      await delay(300);
      await textarea.type(cardMessage, { delay: 20 });
      await delay(500);
      await page.keyboard.press("Enter");
      
      await delay(1000);

      // Send link separately (Instagram will auto-preview it)
      await textarea.click();
      await delay(300);
      await textarea.type(product.productUrl, { delay: 20 });
      await delay(500);
      await page.keyboard.press("Enter");

      console.log(`✅ [${username}] Product card sent (Rich Text)`);
      return { success: true, method: 'rich_text' };
    } catch (error) {
      console.error(`❌ [${username}] Error sending card:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send multiple products as cards
  async sendMultipleProductCards(page, username, products) {
    try {
      console.log(`📤 [${username}] Looking for textarea to send ${products.length} cards...`);
      const textarea = await page.$('textarea[placeholder*="Message"], textarea[aria-label*="Message"], div[contenteditable="true"]');
      
      if (!textarea) {
        console.error(`❌ [${username}] Textarea not found!`);
        return { success: false, error: 'Textarea not found' };
      }
      
      console.log(`✅ [${username}] Textarea found, starting to send cards...`);

      // Send each product as a separate card
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        console.log(`📤 [${username}] Sending card ${i + 1}/${products.length}: ${product.name}`);
        const cardMessage = this.formatter.formatAsRichTextCard(product);

        await textarea.click();
        await delay(300);
        await textarea.type(cardMessage, { delay: 20 });
        await delay(500);
        await page.keyboard.press("Enter");
        console.log(`✅ [${username}] Card message ${i + 1} sent`);
        
        await delay(1000);

        // Send link
        await textarea.click();
        await delay(300);
        await textarea.type(product.productUrl, { delay: 20 });
        await delay(500);
        await page.keyboard.press("Enter");
        console.log(`✅ [${username}] Link ${i + 1} sent: ${product.productUrl}`);
        
        // Delay between cards
        if (i < products.length - 1) {
          await delay(1500);
        }
      }

      console.log(`✅ [${username}] ${products.length} product cards sent`);
      return { success: true, method: 'rich_text' };
    } catch (error) {
      console.error(`❌ [${username}] Error sending cards:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  ProductCardSender,
  ProductCardFormatter,
  InstagramCardSender
};

