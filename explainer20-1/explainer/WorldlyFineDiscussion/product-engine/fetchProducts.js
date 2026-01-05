const { getClient } = require('./wooClient');
const { normalizeProducts } = require('./normalizeProduct');
const { getCache } = require('./productCache');

/**
 * Fetch products from WooCommerce API
 */

/**
 * Map brand names to WooCommerce attribute terms
 * This maps Persian brand names to their WooCommerce attribute values
 */
const BRAND_MAP = {
  'میسویک': 'misswake',
  'misswake': 'misswake',
  'کلامین': 'collamin',
  'collamin': 'collamin',
  'آیس‌بال': 'iceball',
  'iceball': 'iceball',
  'ice ball': 'iceball',
  'آیس بال': 'iceball',
  'ایس بال': 'iceball',
  'دافی': 'dafi',
  'dafi': 'dafi',
  'آمبرلا': 'umbrella',
  'umbrella': 'umbrella',
  'پیکسل': 'pixel',
  'pixel': 'pixel',
  'pixxel': 'pixel'
};

/**
 * Get WooCommerce attribute term for a brand
 * @param {string} brand - Brand name (Persian or English)
 * @returns {string|null} Attribute term or null
 */
function getBrandAttributeTerm(brand) {
  if (!brand) return null;
  
  const normalized = brand.toLowerCase().trim();
  return BRAND_MAP[normalized] || null;
}

/**
 * Fetch products by brand
 * @param {string} brand - Brand name
 * @returns {Promise<Array>} Normalized products
 */
async function fetchProductsByBrand(brand) {
  const cache = getCache();
  const cacheKey = cache.generateKey(null, brand);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const client = getClient();
    const attributeTerm = getBrandAttributeTerm(brand);
    
    if (!attributeTerm) {
      console.log(`⚠️ Unknown brand: ${brand}, cannot fetch products`);
      cache.set(cacheKey, []); // Cache empty result
      return [];
    }

    console.log(`🔍 Fetching products for brand: ${brand} (${attributeTerm})`);
    
    // Fetch products with brand attribute filter
    const products = await client.getProducts({
      attribute: 'pa_brand', // WooCommerce brand attribute
      attribute_term: attributeTerm,
      per_page: 100
    });

    // Handle pagination if needed
    let allProducts = [...products];
    if (products.length === 100) {
      // Might have more pages, fetch next page
      let page = 2;
      let hasMore = true;
      
      while (hasMore && page <= 5) { // Limit to 5 pages (500 products max)
        const nextPage = await client.getProducts({
          attribute: 'pa_brand',
          attribute_term: attributeTerm,
          per_page: 100,
          page: page
        });
        
        if (nextPage.length === 0) {
          hasMore = false;
        } else {
          allProducts = allProducts.concat(nextPage);
          if (nextPage.length < 100) {
            hasMore = false;
          }
          page++;
        }
      }
    }

    // Normalize products
    const normalized = normalizeProducts(allProducts);
    
    // Cache results
    cache.set(cacheKey, normalized);
    
    console.log(`✅ Fetched ${normalized.length} products for brand: ${brand}`);
    return normalized;
    
  } catch (error) {
    console.error(`❌ Error fetching products for brand ${brand}: ${error.message}`);
    // Cache empty result to avoid repeated failed API calls
    cache.set(cacheKey, []);
    return [];
  }
}

/**
 * Fetch products by search query
 * @param {string} query - Search query
 * @param {string} brand - Optional brand filter
 * @returns {Promise<Array>} Normalized products
 */
async function fetchProductsBySearch(query, brand = null) {
  const cache = getCache();
  const cacheKey = cache.generateKey(query, brand);
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const client = getClient();
    
    console.log(`🔍 Searching products: "${query}"${brand ? ` (brand: ${brand})` : ''}`);
    
    const options = {
      search: query,
      per_page: 100
    };

    // Add brand filter if provided
    if (brand) {
      const attributeTerm = getBrandAttributeTerm(brand);
      if (attributeTerm) {
        options.attribute = 'pa_brand';
        options.attribute_term = attributeTerm;
      }
    }

    const products = await client.getProducts(options);
    
    // Normalize products
    const normalized = normalizeProducts(products);
    
    // Cache results
    cache.set(cacheKey, normalized);
    
    console.log(`✅ Found ${normalized.length} products for search: "${query}"`);
    return normalized;
    
  } catch (error) {
    console.error(`❌ Error searching products: ${error.message}`);
    // Cache empty result
    cache.set(cacheKey, []);
    return [];
  }
}

/**
 * Fetch single product by ID
 * @param {number|string} productId - Product ID
 * @returns {Promise<Object|null>} Normalized product or null
 */
async function fetchProductById(productId) {
  try {
    const client = getClient();
    const product = await client.getProduct(productId);
    
    if (!product || !product.id) {
      return null;
    }

    const { normalizeProduct } = require('./normalizeProduct');
    return normalizeProduct(product);
    
  } catch (error) {
    console.error(`❌ Error fetching product ${productId}: ${error.message}`);
    return null;
  }
}

module.exports = {
  fetchProductsByBrand,
  fetchProductsBySearch,
  fetchProductById,
  getBrandAttributeTerm
};

