const fetch = require('node-fetch');

/**
 * WooCommerce API Client
 * Handles authentication and API requests to WooCommerce REST API
 */
class WooCommerceClient {
  constructor() {
    this.apiKey = process.env.WC_API_KEY;
    this.apiSecret = process.env.WC_API_SECRET;
    this.baseURL = (process.env.WC_API_URL || 'https://luxirana.com').replace(/\/$/, '');
    this.apiBase = `${this.baseURL}/wp-json/wc/v3`;
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ WooCommerce API credentials not found in environment variables');
    }
  }

  /**
   * Create basic auth header
   */
  getAuthHeader() {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('WooCommerce API credentials are required');
    }
    
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make GET request to WooCommerce API
   * @param {string} endpoint - API endpoint (e.g., '/products')
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

      // Add authentication as query params (WooCommerce REST API method)
      url.searchParams.append('consumer_key', this.apiKey);
      url.searchParams.append('consumer_secret', this.apiSecret);

      console.log(`📡 WooCommerce API: GET ${url.pathname}${url.search.replace(/consumer_secret=[^&]+/, 'consumer_secret=***')}`);

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
        throw new Error(`WooCommerce API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ WooCommerce API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch products with search and filters
   * @param {Object} options - Search options
   * @param {string} options.search - Search query
   * @param {string} options.attribute - Attribute name (e.g., 'pa_brand')
   * @param {string} options.attribute_term - Attribute term value
   * @param {number} options.per_page - Results per page (max 100)
   * @param {number} options.page - Page number
   * @returns {Promise<Array>} Array of products
   */
  async getProducts(options = {}) {
    const params = {
      per_page: options.per_page || 100,
      page: options.page || 1,
      status: 'publish' // Only published products
    };

    if (options.search) {
      params.search = options.search;
    }

    if (options.attribute && options.attribute_term) {
      params.attribute = options.attribute;
      params.attribute_term = options.attribute_term;
    }

    return await this.get('/products', params);
  }

  /**
   * Get single product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Product object
   */
  async getProduct(productId) {
    return await this.get(`/products/${productId}`);
  }
}

// Singleton instance
let clientInstance = null;

/**
 * Get WooCommerce client instance
 * @returns {WooCommerceClient}
 */
function getClient() {
  if (!clientInstance) {
    clientInstance = new WooCommerceClient();
  }
  return clientInstance;
}

module.exports = {
  WooCommerceClient,
  getClient
};

