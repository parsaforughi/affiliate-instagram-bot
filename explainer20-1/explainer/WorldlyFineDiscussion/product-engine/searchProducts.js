const { fetchProductsByBrand, fetchProductsBySearch } = require('./fetchProducts');
const { normalizePersian } = require('./normalizeProduct');

/**
 * Calculate similarity score between two strings (fuzzy matching)
 */
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Method 1: Simple substring match (highest priority)
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.8 + (shorter.length / longer.length) * 0.2; // 0.8-1.0 range
  }
  
  // Method 2: Token-based matching (good for multi-word queries)
  const tokens1 = s1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = s2.split(/\s+/).filter(t => t.length > 0);
  
  let tokenMatches = 0;
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1.includes(t2) || t2.includes(t1) || t1 === t2) {
        tokenMatches++;
        break;
      }
    }
  }
  
  const tokenScore = Math.max(tokens1.length, tokens2.length) > 0 
    ? tokenMatches / Math.max(tokens1.length, tokens2.length)
    : 0;
  
  if (tokenScore > 0.5) return 0.5 + tokenScore * 0.3; // 0.5-0.8 range
  
  // Method 3: Levenshtein distance
  const editDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  const distance = editDistance(longer, shorter);
  const levenScore = (longer.length - distance) / longer.length;
  
  return Math.min(1.0, levenScore);
}

/**
 * Normalize numbers - convert English to Persian
 */
function normalizeNumbers(text) {
  const englishToPersian = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
  return text.replace(/[0-9]/g, (d) => englishToPersian[d]);
}

/**
 * Search products with Persian normalization and fuzzy matching
 * Maintains compatibility with existing searchProduct() signature
 * 
 * @param {string} productName - Product name or search query
 * @param {string} contextBrand - Optional brand context
 * @param {Array} conversationHistory - Optional conversation history
 * @returns {Promise<Array>} Array of normalized products with match scores
 */
async function searchProducts(productName, contextBrand = null, conversationHistory = []) {
  try {
    console.log(`\n🔍 ========== PRODUCT SEARCH START ==========`);
    console.log(`🔎 Search Query: "${productName}"`);
    if (contextBrand) {
      console.log(`🏷️ Brand Context: ${contextBrand}`);
    }
    
    // Normalize search query
    const searchNormalized = normalizePersian(normalizeNumbers(productName.toLowerCase()));
    console.log(`🔤 Normalized search: "${searchNormalized}"`);
    
    // Brand detection
    const ALL_BRANDS = ['کلامین', 'میسویک', 'آیس‌بال', 'دافی', 'آمبرلا', 'پیکسل', 'collamin', 'misswake', 'iceball', 'dafi', 'umbrella', 'pixel'];
    let searchingForBrand = false;
    let targetBrand = '';
    
    // Check if contextBrand is provided
    if (contextBrand) {
      const normalizedContextBrand = normalizePersian(contextBrand.toLowerCase());
      for (const brand of ALL_BRANDS) {
        if (normalizePersian(brand.toLowerCase()) === normalizedContextBrand) {
          searchingForBrand = true;
          targetBrand = contextBrand;
          console.log(`🏷️ Using brand from context: ${targetBrand}`);
          break;
        }
      }
    }
    
    // Check if query contains brand name
    if (!searchingForBrand) {
      for (const brand of ALL_BRANDS) {
        if (searchNormalized.includes(normalizePersian(brand.toLowerCase()))) {
          searchingForBrand = true;
          // Map to Persian brand name
          const brandMap = {
            'collamin': 'کلامین',
            'misswake': 'میسویک',
            'iceball': 'آیس‌بال',
            'dafi': 'دافی',
            'umbrella': 'آمبرلا',
            'pixel': 'پیکسل'
          };
          targetBrand = brandMap[brand.toLowerCase()] || brand;
          console.log(`🏷️ Brand search detected from query: ${targetBrand}`);
          break;
        }
      }
    }
    
    let products = [];
    
    // If searching for a specific brand, fetch all products of that brand
    if (searchingForBrand && targetBrand) {
      console.log(`📦 Fetching all products for brand: ${targetBrand}`);
      products = await fetchProductsByBrand(targetBrand);
      
      // If we have a specific product query, filter results
      if (productName && productName.trim() !== targetBrand) {
        const queryNormalized = normalizePersian(normalizeNumbers(productName.toLowerCase()));
        
        // Score and filter products
        const scoredProducts = products.map(product => {
          const nameNormalized = normalizePersian(normalizeNumbers(product.name.toLowerCase()));
          const score = similarity(queryNormalized, nameNormalized);
          return { ...product, matchScore: score, matchType: 'brand-filtered' };
        });
        
        // Sort by score and filter (min 0.3 similarity)
        products = scoredProducts
          .filter(p => p.matchScore >= 0.3)
          .sort((a, b) => b.matchScore - a.matchScore);
      } else {
        // All brand products, mark as exact-brand match
        products = products.map(p => ({ ...p, matchType: 'exact-brand', matchScore: 1.0 }));
      }
    } else {
      // General search
      console.log(`📦 Searching products: "${productName}"`);
      products = await fetchProductsBySearch(productName, contextBrand);
      
      // Score products by relevance
      const queryNormalized = normalizePersian(normalizeNumbers(productName.toLowerCase()));
      products = products.map(product => {
        const nameNormalized = normalizePersian(normalizeNumbers(product.name.toLowerCase()));
        const brandNormalized = product.brand ? normalizePersian(product.brand.toLowerCase()) : '';
        
        const nameScore = similarity(queryNormalized, nameNormalized);
        const brandScore = brandNormalized ? similarity(queryNormalized, brandNormalized) : 0;
        const maxScore = Math.max(nameScore, brandScore);
        
        let matchType = 'fuzzy';
        if (nameNormalized.includes(queryNormalized) || queryNormalized.includes(nameNormalized.substring(0, 20))) {
          matchType = 'exact-name';
        } else if (maxScore > 0.6) {
          matchType = 'fuzzy';
        }
        
        return { ...product, matchScore: maxScore, matchType };
      });
      
      // Sort by score (exact matches first, then by score)
      products.sort((a, b) => {
        if (a.matchType === 'exact-name' && b.matchType !== 'exact-name') return -1;
        if (a.matchType !== 'exact-name' && b.matchType === 'exact-name') return 1;
        return b.matchScore - a.matchScore;
      });
    }
    
    // Format products for compatibility with existing code
    const formattedProducts = products.map(p => ({
      name: p.name,
      rawPrice: p.regular_price,
      price: p.price,
      discountPrice: p.sale_price ? p.sale_price : null,
      brand: p.brand || targetBrand || null,
      categories: '', // Not used in current flow
      productUrl: p.url,
      productId: p.id,
      matchType: p.matchType || 'fuzzy',
      similarity: p.matchScore || 0,
      in_stock: p.in_stock,
      description: p.description,
      short_description: p.short_description,
      images: p.images
    }));
    
    if (formattedProducts.length > 0) {
      console.log(`✅ Found ${formattedProducts.length} product(s)`);
      formattedProducts.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${p.matchType}, score: ${Math.round(p.similarity * 100)}%)`);
        console.log(`      Brand: ${p.brand || 'N/A'} | Price: ${p.price} تومان`);
        console.log(`      URL: ${p.productUrl}`);
      });
    } else {
      console.log(`❌ No products found`);
    }
    
    console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
    return formattedProducts;
    
  } catch (error) {
    console.error(`\n❌ ERROR searching products: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
    return [];
  }
}

module.exports = {
  searchProducts,
  similarity,
  normalizePersian,
  normalizeNumbers
};

