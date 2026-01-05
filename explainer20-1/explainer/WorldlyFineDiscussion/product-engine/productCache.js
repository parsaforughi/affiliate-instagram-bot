/**
 * Product Cache
 * In-memory cache with TTL for WooCommerce API responses
 */

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

class ProductCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate cache key from search parameters
   * @param {string} query - Search query
   * @param {string} brand - Brand name
   * @returns {string} Cache key
   */
  generateKey(query, brand = null) {
    const parts = [];
    if (query) parts.push(`q:${query.toLowerCase().trim()}`);
    if (brand) parts.push(`b:${brand.toLowerCase().trim()}`);
    return parts.length > 0 ? parts.join('|') : 'all';
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Array|null} Cached products or null if expired/not found
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      console.log(`🗑️ Cache expired for key: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {Array} data - Products array (can be empty)
   */
  set(key, data) {
    const expiresAt = Date.now() + CACHE_TTL;
    this.cache.set(key, {
      data: Array.isArray(data) ? data : [],
      expiresAt: expiresAt,
      cachedAt: Date.now()
    });
    console.log(`💾 Cached ${data.length} products for key: ${key} (expires in 10min)`);
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${size} cache entries`);
  }

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    console.log(`🗑️ Deleted cache entry: ${key}`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }
}

// Singleton instance
let cacheInstance = null;

/**
 * Get cache instance
 * @returns {ProductCache}
 */
function getCache() {
  if (!cacheInstance) {
    cacheInstance = new ProductCache();
    
    // Clean expired entries every 5 minutes
    setInterval(() => {
      cacheInstance.cleanExpired();
    }, 5 * 60 * 1000);
  }
  return cacheInstance;
}

module.exports = {
  ProductCache,
  getCache
};

