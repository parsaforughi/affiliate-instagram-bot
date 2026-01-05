/**
 * Product Engine - Unified Interface
 * Single source of truth for all product data from WooCommerce API
 */

const { searchProducts } = require('./searchProducts');
const { fetchProductsByBrand, fetchProductsBySearch, fetchProductById } = require('./fetchProducts');
const { normalizeProduct, normalizeProducts } = require('./normalizeProduct');
const { getCache } = require('./productCache');

/**
 * Main search function - compatible with existing searchProduct() signature
 */
async function searchProduct(productName, contextBrand = null, conversationHistory = []) {
  return await searchProducts(productName, contextBrand, conversationHistory);
}

/**
 * Clear product cache
 */
function clearCache() {
  const cache = getCache();
  cache.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  const cache = getCache();
  return cache.getStats();
}

module.exports = {
  // Main search (compatible with existing code)
  searchProduct,
  
  // Direct API access
  fetchProductsByBrand,
  fetchProductsBySearch,
  fetchProductById,
  
  // Normalization
  normalizeProduct,
  normalizeProducts,
  
  // Cache management
  clearCache,
  getCacheStats
};

