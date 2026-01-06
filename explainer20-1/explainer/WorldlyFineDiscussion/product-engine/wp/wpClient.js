const fetch = require('node-fetch');

/**
 * WordPress REST API Client
 * Uses wp/v2 endpoints (NOT WooCommerce v3)
 */
class WordPressClient {
  constructor() {
    this.baseURL = (process.env.WC_API_URL || 'https://luxirana.com').replace(/\/$/, '');
    this.apiBase = `${this.baseURL}/wp-json/wp/v2`;
  }

  /**
   * Make GET request to WordPress REST API
   * @param {string} endpoint - API endpoint (e.g., '/product')
   * @param {Object} params - Query parameters
   * @returns {Promise<Array|Object>} API response
   */
  async get(endpoint, params = {}) {
    try {
      const url = new URL(`${this.apiBase}${endpoint}`);
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });

      console.log(`📡 WordPress API: GET ${url.pathname}${url.search}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Instagram-Bot/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ WordPress API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch products by brand ID
   * @param {number} brandId - Product brand taxonomy ID
   * @param {number} perPage - Results per page (default 100)
   * @returns {Promise<Array>} Array of product posts
   */
  async fetchProductsByBrandId(brandId, perPage = 100) {
    return await this.get('/product', {
      product_brand: brandId,
      per_page: perPage,
      status: 'publish' // Only published products
    });
  }

  /**
   * Fetch brand information by product post ID
   * @param {number} productId - Product post ID
   * @returns {Promise<Object|null>} Brand object or null
   */
  async fetchBrandByPostId(productId) {
    try {
      const product = await this.get(`/product/${productId}`);
      
      if (!product || !product.product_brand || product.product_brand.length === 0) {
        return null;
      }

      // Get brand ID (first brand in array)
      const brandId = product.product_brand[0];
      
      // Fetch brand details
      const brand = await this.get(`/product_brand/${brandId}`);
      return brand;
    } catch (error) {
      console.error(`❌ Error fetching brand for product ${productId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch single product by ID
   * @param {number} productId - Product post ID
   * @returns {Promise<Object>} Product post object
   */
  async fetchProduct(productId) {
    return await this.get(`/product/${productId}`);
  }

  /**
   * Search products by query
   * @param {string} search - Search query
   * @param {number} brandId - Optional brand ID filter
   * @returns {Promise<Array>} Array of product posts
   */
  async searchProducts(search, brandId = null) {
    const params = {
      search: search,
      per_page: 100,
      status: 'publish'
    };

    if (brandId) {
      params.product_brand = brandId;
    }

    return await this.get('/product', params);
  }
}

// Singleton instance
let clientInstance = null;

/**
 * Get WordPress client instance
 * @returns {WordPressClient}
 */
function getClient() {
  if (!clientInstance) {
    clientInstance = new WordPressClient();
  }
  return clientInstance;
}

module.exports = {
  WordPressClient,
  getClient
};

