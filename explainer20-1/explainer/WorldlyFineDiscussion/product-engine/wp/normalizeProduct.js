/**
 * WordPress Product Normalization
 * Transforms WP product post objects to standardized format
 */

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
 * Normalize WordPress product post to standard format
 * @param {Object} wpProduct - WordPress product post object
 * @param {Object} brand - Brand object from taxonomy
 * @param {string} scrapedPrice - Price scraped from HTML (optional)
 * @returns {Object} Normalized product
 */
function normalizeProduct(wpProduct, brand = null, scrapedPrice = null) {
  if (!wpProduct || !wpProduct.id) {
    throw new Error('Invalid WordPress product object');
  }

  // Extract image (featured image or first image)
  let image = null;
  if (wpProduct.featured_media && wpProduct._embedded && wpProduct._embedded['wp:featuredmedia']) {
    const featuredMedia = wpProduct._embedded['wp:featuredmedia'][0];
    if (featuredMedia && featuredMedia.source_url) {
      image = featuredMedia.source_url;
    }
  }

  // Extract brand information
  let brandInfo = null;
  if (brand && brand.id) {
    brandInfo = {
      id: brand.id,
      name: brand.name || '',
      slug: brand.slug || ''
    };
  } else if (wpProduct.product_brand && wpProduct.product_brand.length > 0) {
    // Fallback: use brand ID if brand object not provided
    brandInfo = {
      id: wpProduct.product_brand[0],
      name: '',
      slug: ''
    };
  }

  // Use scraped price or default
  const rawPrice = scrapedPrice || null;
  const formattedPrice = rawPrice ? formatPrice(rawPrice) : 'تماس بگیرید';

  // Normalize product
  const normalized = {
    id: String(wpProduct.id),
    title: wpProduct.title?.rendered || wpProduct.title || '',
    slug: wpProduct.slug || '',
    link: wpProduct.link || wpProduct.permalink || '',
    brand: brandInfo,
    price: formattedPrice,
    rawPrice: rawPrice,
    image: image
  };

  return normalized;
}

/**
 * Normalize array of WordPress products
 * @param {Array} wpProducts - Array of WordPress product post objects
 * @param {Object} brandMap - Map of brand IDs to brand objects
 * @param {Object} priceMap - Map of product IDs to scraped prices
 * @returns {Array} Array of normalized products
 */
function normalizeProducts(wpProducts, brandMap = {}, priceMap = {}) {
  if (!Array.isArray(wpProducts)) {
    return [];
  }

  return wpProducts
    .filter(p => p && p.id) // Filter invalid products
    .map(p => {
      try {
        // Get brand for this product
        let brand = null;
        if (p.product_brand && p.product_brand.length > 0) {
          const brandId = p.product_brand[0];
          brand = brandMap[brandId] || null;
        }

        // Get scraped price
        const scrapedPrice = priceMap[p.id] || null;

        return normalizeProduct(p, brand, scrapedPrice);
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
  formatPrice
};

