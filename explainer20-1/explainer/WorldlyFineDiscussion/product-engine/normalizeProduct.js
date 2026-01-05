/**
 * Product Normalization
 * Transforms WooCommerce product objects to standardized format
 */

/**
 * Normalize Persian characters
 */
function normalizePersian(text) {
  if (!text) return '';
  return String(text)
    .replace(/ك/g, 'ک')  // Arabic kaf → Persian kaf
    .replace(/ي/g, 'ی')  // Arabic yeh → Persian yeh
    .replace(/ئ/g, 'ی')  // Hamza on yeh → Persian yeh
    .replace(/أ/g, 'ا')  // Hamza on alef → Plain alef
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ة/g, 'ه')  // Teh marbuta → Heh
    .trim();
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format price to Persian Toman
 */
function formatPrice(price) {
  if (!price || price === '' || price === '0') {
    return 'تماس بگیرید';
  }

  // Convert to number
  const numericPrice = parseFloat(String(price).replace(/[^\d.]/g, ''));
  
  if (isNaN(numericPrice) || numericPrice === 0) {
    return 'تماس بگیرید';
  }

  // Format with Persian locale
  const formatted = new Intl.NumberFormat('fa-IR').format(Math.round(numericPrice));
  return formatted;
}

/**
 * Extract brand from WooCommerce product attributes
 * Looks for brand in attributes (pa_brand, brand, etc.)
 */
function extractBrand(attributes) {
  if (!attributes || !Array.isArray(attributes)) {
    return null;
  }

  // Brand attribute names to check
  const brandAttributeNames = ['pa_brand', 'brand', 'برند', 'pa_برند'];
  
  for (const attr of attributes) {
    if (!attr || !attr.name) continue;
    
    const attrName = normalizePersian(attr.name.toLowerCase());
    
    // Check if this is a brand attribute
    for (const brandName of brandAttributeNames) {
      if (attrName.includes(brandName.toLowerCase()) || attrName === brandName.toLowerCase()) {
        // Get brand value
        if (attr.options && attr.options.length > 0) {
          return normalizePersian(attr.options[0]);
        }
        if (attr.option) {
          return normalizePersian(attr.option);
        }
      }
    }
  }

  return null;
}

/**
 * Normalize WooCommerce product to standard format
 * @param {Object} wcProduct - WooCommerce product object
 * @returns {Object} Normalized product
 */
function normalizeProduct(wcProduct) {
  if (!wcProduct || !wcProduct.id) {
    throw new Error('Invalid WooCommerce product object');
  }

  // Extract images
  const images = [];
  if (wcProduct.images && Array.isArray(wcProduct.images)) {
    wcProduct.images.forEach(img => {
      if (img.src) {
        images.push(img.src);
      }
    });
  }

  // Get product URL (permalink)
  const url = wcProduct.permalink || wcProduct.link || '';

  // Extract brand from attributes
  const brand = extractBrand(wcProduct.attributes);

  // Get prices
  const regularPrice = wcProduct.regular_price || wcProduct.price || '';
  const salePrice = wcProduct.sale_price || null;
  const currentPrice = salePrice || regularPrice;

  // Check stock status
  const inStock = wcProduct.stock_status === 'instock' || 
                 (wcProduct.manage_stock && wcProduct.stock_quantity > 0);

  // Normalize product
  const normalized = {
    id: String(wcProduct.id),
    name: normalizePersian(wcProduct.name || ''),
    price: formatPrice(currentPrice),
    regular_price: formatPrice(regularPrice),
    sale_price: salePrice ? formatPrice(salePrice) : null,
    in_stock: inStock,
    description: stripHTML(wcProduct.description || ''),
    short_description: stripHTML(wcProduct.short_description || ''),
    brand: brand,
    url: url,
    images: images
  };

  return normalized;
}

/**
 * Normalize array of WooCommerce products
 * @param {Array} wcProducts - Array of WooCommerce product objects
 * @returns {Array} Array of normalized products
 */
function normalizeProducts(wcProducts) {
  if (!Array.isArray(wcProducts)) {
    return [];
  }

  return wcProducts
    .filter(p => p && p.id) // Filter invalid products
    .map(p => {
      try {
        return normalizeProduct(p);
      } catch (error) {
        console.error(`⚠️ Error normalizing product ${p.id}: ${error.message}`);
        return null;
      }
    })
    .filter(p => p !== null); // Remove failed normalizations
}

module.exports = {
  normalizeProduct,
  normalizeProducts,
  normalizePersian,
  stripHTML,
  formatPrice,
  extractBrand
};

