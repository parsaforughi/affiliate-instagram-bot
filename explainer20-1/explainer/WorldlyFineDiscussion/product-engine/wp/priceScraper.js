const fetch = require('node-fetch');

/**
 * Price Scraper
 * Extracts price from product HTML page using WooCommerce selectors
 */

/**
 * Scrape price from product page HTML
 * @param {string} productUrl - Product page URL
 * @returns {Promise<string|null>} Price as plain number string or null
 */
async function scrapePrice(productUrl) {
  try {
    if (!productUrl || !productUrl.startsWith('http')) {
      console.log(`⚠️ Invalid product URL for price scraping: ${productUrl}`);
      return null;
    }

    console.log(`💰 Scraping price from: ${productUrl}`);

    const response = await fetch(productUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Extract price using WooCommerce selectors
    // Try multiple selectors for robustness
    const priceSelectors = [
      /<span[^>]*class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>([^<]+)<\/span>/i,
      /<p[^>]*class="[^"]*price[^"]*"[^>]*>.*?<span[^>]*class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>([^<]+)<\/span>/is,
      /woocommerce-Price-amount[^>]*>([^<]+)</i,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?(\d[\d,]*)\s*تومان/is
    ];

    let price = null;

    for (const selector of priceSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        // Extract numeric value
        const priceText = match[1].trim();
        // Remove Persian digits and convert to English
        const persianToEnglish = {
          '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
          '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
        };
        
        let normalizedPrice = priceText;
        for (const [persian, english] of Object.entries(persianToEnglish)) {
          normalizedPrice = normalizedPrice.replace(new RegExp(persian, 'g'), english);
        }
        
        // Extract only digits and commas
        const numericPrice = normalizedPrice.replace(/[^\d,]/g, '').replace(/,/g, '');
        
        if (numericPrice && numericPrice.length > 0) {
          price = numericPrice;
          console.log(`✅ Price scraped: ${price} تومان`);
          break;
        }
      }
    }

    if (!price) {
      console.log(`⚠️ Could not extract price from: ${productUrl}`);
      return null;
    }

    return price;
  } catch (error) {
    console.error(`❌ Error scraping price from ${productUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Scrape prices for multiple products (with rate limiting)
 * @param {Array} products - Array of products with URLs
 * @param {number} delayMs - Delay between requests (default 500ms)
 * @returns {Promise<Array>} Products with prices added
 */
async function scrapePrices(products, delayMs = 500) {
  const productsWithPrices = [];
  
  for (const product of products) {
    if (product.link) {
      const price = await scrapePrice(product.link);
      productsWithPrices.push({
        ...product,
        price: price
      });
      
      // Rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } else {
      productsWithPrices.push(product);
    }
  }
  
  return productsWithPrices;
}

module.exports = {
  scrapePrice,
  scrapePrices
};

