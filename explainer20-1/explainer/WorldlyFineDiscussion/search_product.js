/**
 * Product Search Module
 * Uses product-engine to fetch products from WooCommerce API
 * All product data comes exclusively from the website API
 */

const { searchProduct: searchProductsFromEngine } = require('./product-engine');

// Normalize Persian characters - critical for matching
function normalizePersian(text) {
  if (!text) return '';
  return text
    .replace(/ك/g, 'ک')  // Arabic kaf → Persian kaf
    .replace(/ي/g, 'ی')  // Arabic yeh → Persian yeh
    .replace(/ئ/g, 'ی')  // Hamza on yeh → Persian yeh
    .replace(/أ/g, 'ا')  // Hamza on alef → Plain alef
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ة/g, 'ه')  // Teh marbuta → Heh
    .trim();
}

// Format number to Persian digits with separators
function formatPersianPrice(price) {
  if (!price || price === 'تماس بگیرید') return 'تماس بگیرید';
  
  // Remove any non-digit characters
  const numericPrice = String(price).replace(/[^\d]/g, '');
  if (!numericPrice) return 'تماس بگیرید';
  
  // Format with Persian locale
  const formatted = new Intl.NumberFormat('fa-IR').format(parseInt(numericPrice));
  return formatted;
}

// Calculate 40% discounted price
function calculateDiscount(price) {
  if (!price || price === 'تماس بگیرید') return 'تماس بگیرید';
  
  const numericPrice = String(price).replace(/[^\d]/g, '');
  if (!numericPrice) return 'تماس بگیرید';
  
  const discounted = Math.round(parseInt(numericPrice) * 0.6);
  return new Intl.NumberFormat('fa-IR').format(discounted);
}

// Normalize numbers - convert English to Persian
function normalizeNumbers(text) {
  const englishToPersian = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
  return text.replace(/[0-9]/g, (d) => englishToPersian[d]);
}

// ========================================
// BRAND EXTRACTION
// ========================================

const ALL_BRANDS_MAP = {
  'میسویک': { name: 'میسویک', englishName: 'Misswake', keywords: ['میسویک', 'misswake'] },
  'کلامین': { name: 'کلامین', englishName: 'Collamin', keywords: ['کلامین', 'collamin'] },
  'آیس‌بال': { name: 'آیس‌بال', englishName: 'Ice Ball', keywords: ['آیس‌بال', 'iceball', 'ice ball', 'آیس بال', 'ایس بال'] },
  'دافی': { name: 'دافی', englishName: 'Dafi', keywords: ['دافی', 'dafi'] },
  'آمبرلا': { name: 'آمبرلا', englishName: 'Umbrella', keywords: ['آمبرلا', 'umbrella'] },
  'پیکسل': { name: 'پیکسل', englishName: 'Pixel', keywords: ['پیکسل', 'pixel', 'pixxel'] }
};

// Extract brand from text
function extractBrandFromText(text, conversationHistory = []) {
  if (!text) return null;
  
  const normalizedText = normalizePersian(text.toLowerCase());
  
  // Check current message first
  for (const [brandKey, brandData] of Object.entries(ALL_BRANDS_MAP)) {
    for (const keyword of brandData.keywords) {
      const normalizedKeyword = normalizePersian(keyword.toLowerCase());
      if (normalizedText.includes(normalizedKeyword)) {
        console.log(`🏷️ Brand found in text: ${brandData.name}`);
        return brandData.name;
      }
    }
  }
  
  // Check conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-5);
    const allText = recentMessages
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();
    const normalizedHistory = normalizePersian(allText);
    
    for (const [brandKey, brandData] of Object.entries(ALL_BRANDS_MAP)) {
      for (const keyword of brandData.keywords) {
        const normalizedKeyword = normalizePersian(keyword.toLowerCase());
        if (normalizedHistory.includes(normalizedKeyword)) {
          console.log(`🏷️ Brand found in conversation history: ${brandData.name}`);
          return brandData.name;
        }
      }
    }
  }
  
  return null;
}

// ========================================
// PRODUCT SEARCH
// ========================================

/**
 * Search for products using WooCommerce API
 * All product data comes exclusively from the website
 * 
 * @param {string} productName - Product name or search query
 * @param {string} contextBrand - Optional brand context
 * @param {Array} conversationHistory - Optional conversation history
 * @returns {Promise<Array>} Array of products from WooCommerce API
 */
async function searchProduct(productName, contextBrand = null, conversationHistory = []) {
  try {
    // Use product-engine to fetch from WooCommerce API
    const products = await searchProductsFromEngine(productName, contextBrand, conversationHistory);
    
    // Return products in expected format (already formatted by product-engine)
    return products;
    
  } catch (error) {
    console.error(`\n❌ ERROR searching products: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return [];
  }
}

module.exports = { 
  searchProduct, 
  formatPersianPrice, 
  calculateDiscount, 
  normalizePersian,
  extractBrandFromText,
  ALL_BRANDS_MAP
};
