/**
 * WordPress Product Engine - Main Orchestrator
 * Coordinates: cache → WP API → brand resolution → price scraping → normalization
 */

const { getClient } = require('./wpClient');
const { normalizeProducts } = require('./normalizeProduct');
const { scrapePrices } = require('./priceScraper');
const { getCache } = require('./productCache');

/**
 * Get products by brand ID
 * @param {number} brandId - Product brand taxonomy ID
 * @param {boolean} includePrices - Whether to scrape prices (default: true)
 * @returns {Promise<Array>} Normalized products array
 */
async function getProductsByBrand(brandId, includePrices = true) {
  if (!brandId || isNaN(Number(brandId))) {
    console.error(`❌ Invalid brand ID: ${brandId}`);
    return [];
  }

  const brandIdNum = Number(brandId);
  const cache = getCache();
  const cacheKey = cache.generateKey(brandIdNum);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    console.log(`✅ Returning ${cached.length} cached products for brand ${brandIdNum}`);
    return cached;
  }

  try {
    const client = getClient();
    
    // Fetch products from WordPress API
    console.log(`📡 Fetching products for brand ID: ${brandIdNum}`);
    const wpProducts = await client.get('/product', {
      product_brand: brandIdNum,
      per_page: 100,
      status: 'publish',
      _embed: true // Include embedded data (featured images, etc.)
    });

    if (!Array.isArray(wpProducts) || wpProducts.length === 0) {
      console.log(`⚠️ No products found for brand ID: ${brandIdNum}`);
      // Cache empty result to avoid repeated API calls
      cache.set(cacheKey, []);
      return [];
    }

    console.log(`📦 Fetched ${wpProducts.length} products from WordPress API`);

    // Build brand map (extract unique brand IDs and fetch brand details)
    const brandMap = {};
    const uniqueBrandIds = new Set();
    
    wpProducts.forEach(p => {
      if (p.product_brand && Array.isArray(p.product_brand)) {
        p.product_brand.forEach(bid => uniqueBrandIds.add(bid));
      }
    });

    // Fetch brand details for all unique brands
    for (const bid of uniqueBrandIds) {
      try {
        const brand = await client.get(`/product_brand/${bid}`);
        if (brand && brand.id) {
          brandMap[bid] = brand;
        }
      } catch (error) {
        console.error(`⚠️ Could not fetch brand ${bid}: ${error.message}`);
      }
    }

    // Normalize products (without prices first)
    let normalizedProducts = normalizeProducts(wpProducts, brandMap, {});

    // Scrape prices if requested
    if (includePrices && normalizedProducts.length > 0) {
      console.log(`💰 Scraping prices for ${normalizedProducts.length} products...`);
      
      // Create price map
      const priceMap = {};
      
      // Scrape prices with rate limiting
      for (const product of normalizedProducts) {
        if (product.link) {
          try {
            const { scrapePrice } = require('./priceScraper');
            const price = await scrapePrice(product.link);
            if (price) {
              priceMap[product.id] = price;
            }
            // Rate limit: 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`⚠️ Error scraping price for product ${product.id}: ${error.message}`);
          }
        }
      }

      // Re-normalize with prices
      normalizedProducts = normalizeProducts(wpProducts, brandMap, priceMap);
    }

    // Cache the results
    cache.set(cacheKey, normalizedProducts);

    console.log(`✅ Returning ${normalizedProducts.length} normalized products for brand ${brandIdNum}`);
    return normalizedProducts;
  } catch (error) {
    console.error(`❌ Error fetching products for brand ${brandIdNum}: ${error.message}`);
    // Cache empty result on error to prevent repeated failures
    cache.set(cacheKey, []);
    return [];
  }
}

/**
 * Search products by query
 * @param {string} query - Search query
 * @param {number} brandId - Optional brand ID filter
 * @returns {Promise<Array>} Normalized products array
 */
async function searchProducts(query, brandId = null) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return [];
  }

  try {
    const client = getClient();
    
    const params = {
      search: query.trim(),
      per_page: 100,
      status: 'publish',
      _embed: true
    };

    if (brandId) {
      params.product_brand = Number(brandId);
    }

    console.log(`🔍 Searching WordPress API: "${query}"${brandId ? ` (brand: ${brandId})` : ''}`);
    const wpProducts = await client.get('/product', params);

    if (!Array.isArray(wpProducts) || wpProducts.length === 0) {
      console.log(`⚠️ No products found for query: "${query}"`);
      return [];
    }

    // Build brand map
    const brandMap = {};
    const uniqueBrandIds = new Set();
    
    wpProducts.forEach(p => {
      if (p.product_brand && Array.isArray(p.product_brand)) {
        p.product_brand.forEach(bid => uniqueBrandIds.add(bid));
      }
    });

    for (const bid of uniqueBrandIds) {
      try {
        const brand = await client.get(`/product_brand/${bid}`);
        if (brand && brand.id) {
          brandMap[bid] = brand;
        }
      } catch (error) {
        console.error(`⚠️ Could not fetch brand ${bid}: ${error.message}`);
      }
    }

    // Normalize (without prices for search - faster)
    const normalizedProducts = normalizeProducts(wpProducts, brandMap, {});

    console.log(`✅ Found ${normalizedProducts.length} products for query: "${query}"`);
    return normalizedProducts;
  } catch (error) {
    console.error(`❌ Error searching products: ${error.message}`);
    return [];
  }
}

/**
 * Clear cache for a specific brand or all cache
 * @param {number} brandId - Optional brand ID to clear specific cache
 */
function clearCache(brandId = null) {
  const cache = getCache();
  if (brandId) {
    const key = cache.generateKey(Number(brandId));
    cache.delete(key);
  } else {
    cache.clear();
  }
}

module.exports = {
  getProductsByBrand,
  searchProducts,
  clearCache
};

