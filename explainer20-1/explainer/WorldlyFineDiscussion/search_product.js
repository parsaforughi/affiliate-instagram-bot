/**
 * Product Search Module
 * Uses WordPress REST API (wp/v2) - NOT WooCommerce v3
 * All product data comes exclusively from WordPress API
 */

const { getProductsByBrand, searchProducts } = require('./product-engine/wp');

// Brand ID mapping (WordPress taxonomy IDs)
const BRAND_IDS = {
  'میسویک': 2113,      // Misswake
  'misswake': 2113,
  'کلامین': 2112,      // Collamin
  'collamin': 2112,
  'کامون': 2110,       // Comeon
  'comeon': 2110
};

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
// BRAND EXTRACTION & ID RESOLUTION
// ========================================

const ALL_BRANDS_MAP = {
  'میسویک': { name: 'میسویک', englishName: 'Misswake', brandId: 2113, keywords: ['میسویک', 'misswake'] },
  'کلامین': { name: 'کلامین', englishName: 'Collamin', brandId: 2112, keywords: ['کلامین', 'collamin'] },
  'کامون': { name: 'کامون', englishName: 'Comeon', brandId: 2110, keywords: ['کامون', 'comeon'] },
  'آیس‌بال': { name: 'آیس‌بال', englishName: 'Ice Ball', brandId: null, keywords: ['آیس‌بال', 'iceball', 'ice ball', 'آیس بال', 'ایس بال'] },
  'دافی': { name: 'دافی', englishName: 'Dafi', brandId: null, keywords: ['دافی', 'dafi'] },
  'آمبرلا': { name: 'آمبرلا', englishName: 'Umbrella', brandId: null, keywords: ['آمبرلا', 'umbrella'] },
  'پیکسل': { name: 'پیکسل', englishName: 'Pixel', brandId: null, keywords: ['پیکسل', 'pixel', 'pixxel'] }
};

/**
 * Extract brand from text and return brand ID
 * @param {string} text - Text to search
 * @param {Array} conversationHistory - Optional conversation history
 * @returns {number|null} Brand ID or null
 */
function extractBrandFromText(text, conversationHistory = []) {
  if (!text) return null;
  
  const normalizedText = normalizePersian(text.toLowerCase());
  
  // Check current message first
  for (const [brandKey, brandData] of Object.entries(ALL_BRANDS_MAP)) {
    for (const keyword of brandData.keywords) {
      const normalizedKeyword = normalizePersian(keyword.toLowerCase());
      if (normalizedText.includes(normalizedKeyword)) {
        console.log(`🏷️ Brand found: ${brandData.name} (ID: ${brandData.brandId || 'N/A'})`);
        return brandData.brandId; // Return brand ID, not name
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
          console.log(`🏷️ Brand found in history: ${brandData.name} (ID: ${brandData.brandId || 'N/A'})`);
          return brandData.brandId; // Return brand ID, not name
        }
      }
    }
  }
  
  return null;
}

/**
 * Get brand ID from brand name
 * @param {string} brandName - Brand name (Persian or English)
 * @returns {number|null} Brand ID or null
 */
function getBrandId(brandName) {
  if (!brandName) return null;
  
  const normalized = normalizePersian(brandName.toLowerCase());
  
  for (const [key, data] of Object.entries(ALL_BRANDS_MAP)) {
    if (normalizePersian(key.toLowerCase()) === normalized || 
        normalizePersian(data.englishName.toLowerCase()) === normalized) {
      return data.brandId;
    }
  }
  
  return null;
}

// ========================================
// PRODUCT SEARCH
// ========================================

/**
 * Search for products using WordPress REST API (wp/v2)
 * All product data comes exclusively from WordPress API
 * 
 * @param {string} productName - Product name or search query
 * @param {string} contextBrand - Optional brand name (will be converted to brand ID)
 * @param {Array} conversationHistory - Optional conversation history
 * @returns {Promise<Array>} Array of normalized products from WordPress API
 */
async function searchProduct(productName, contextBrand = null, conversationHistory = []) {
  try {
    console.log(`\n🔍 ========== PRODUCT SEARCH START (WordPress API) ==========`);
    console.log(`🔎 Query: "${productName}" | Context Brand: ${contextBrand || 'None'}`);

    // Resolve brand ID if context brand provided
    let brandId = null;
    if (contextBrand) {
      brandId = getBrandId(contextBrand);
      if (brandId) {
        console.log(`🏷️ Resolved brand "${contextBrand}" to ID: ${brandId}`);
      }
    }

    // If no brand ID from context, try extracting from product name
    if (!brandId && productName) {
      brandId = extractBrandFromText(productName, conversationHistory);
    }

    let products = [];

    // If we have a brand ID, fetch products by brand
    if (brandId) {
      console.log(`📡 Fetching products for brand ID: ${brandId}`);
      products = await getProductsByBrand(brandId, true); // Include prices
      
      // If we also have a product name query, filter products
      if (productName && productName.trim() !== '') {
        const normalizedQuery = normalizePersian(productName.toLowerCase());
        products = products.filter(p => {
          const titleNormalized = normalizePersian((p.title || '').toLowerCase());
          return titleNormalized.includes(normalizedQuery);
        });
        console.log(`🔍 Filtered to ${products.length} products matching "${productName}"`);
      }
    } else {
      // No brand ID - search across all products
      console.log(`📡 Searching all products for: "${productName}"`);
      products = await searchProducts(productName, null);
    }

    // Transform to expected format (if needed)
    // WordPress module already returns normalized format, but ensure compatibility
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.title || '',
      price: p.price || 'تماس بگیرید',
      regular_price: p.rawPrice ? formatPersianPrice(p.rawPrice) : null,
      sale_price: null, // Not available in WP API
      discountPrice: p.rawPrice ? calculateDiscount(p.rawPrice) : null,
      in_stock: true, // Assume in stock (not available in WP API)
      description: '', // Not available in WP API
      short_description: '',
      brand: p.brand ? p.brand.name : null,
      url: p.link || '',
      images: p.image ? [p.image] : []
    }));

    console.log(`📊 Total products found: ${formattedProducts.length}`);
    console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);

    return formattedProducts;
    
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
  getBrandId,
  ALL_BRANDS_MAP,
  BRAND_IDS
};
