const fs = require('fs');
const { getProductLink } = require('./get_product_link');

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

// Helper function to detect brand from text
function detectBrand(text) {
  const textLower = normalizePersian(normalizeNumbers(text.toLowerCase()));
  if (textLower.includes('میسویک') || textLower.includes('misswake')) return 'Misswake';
  if (textLower.includes('کلامین') || textLower.includes('collamin')) return 'Collamin';
  if (textLower.includes('آمبرلا') || textLower.includes('umbrella')) return 'Umbrella';
  if (textLower.includes('دافی') || textLower.includes('dafi')) return 'Dafi';
  if (textLower.includes('آیس بال') || textLower.includes('iceball') || textLower.includes('ایس بال')) return 'IceBall';
  if (textLower.includes('کدکس') || textLower.includes('kodex') || textLower.includes('ناچ')) return 'Kodex';
  if (textLower.includes('پیکسل') || textLower.includes('pixel')) return 'Pixel';
  return 'سایر';
}

// Calculate similarity score between two strings (fuzzy matching)
// Uses multiple methods to handle typos, partial matches, and token-based matching
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Method 1: Simple substring match (highest priority for short queries)
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
  
  // Method 3: Levenshtein distance for typo detection
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
  
  // For short queries (< 10 chars), be more forgiving
  if (shorter.length < 10) {
    return Math.min(1.0, levenScore * 1.5); // Boost score for short queries, capped at 1.0
  }
  
  return Math.min(1.0, levenScore); // Always cap at 1.0
}

// Search for a product by name
function searchProduct(productName) {
  try {
    console.log(`\n🔍 ========== PRODUCT SEARCH START ==========`);
    console.log(`🔎 Search Query: "${productName}"`);
    
    const csvContent = fs.readFileSync('data/products.csv', 'utf-8');
    
    // Parse CSV properly - handle multi-line quoted fields
    function parseCSV(content) {
      const rows = [];
      let currentRow = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' && !inQuotes) {
          currentRow.push(currentField.trim());
          if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
      }
      
      return rows;
    }
    
    const rows = parseCSV(csvContent);
    console.log(`📊 Total products in CSV: ${rows.length - 1}`);
    
    // Normalize search query
    const searchNormalized = normalizePersian(normalizeNumbers(productName.toLowerCase()));
    console.log(`🔤 Normalized search: "${searchNormalized}"`);
    
    const matches = [];
    const fuzzyMatches = [];
    
    // Search through all products (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];
      if (fields.length < 28) continue;
      
      const name = fields[4] || '';
      const nameLower = normalizePersian(normalizeNumbers(name.toLowerCase()));
      
      const salePrice = fields[25] || '';
      const regularPrice = fields[26] || '';
      const categories = fields[27] || '';
      const productId = fields[2] || '';
      const brandField = fields[38] || '';
      
      const rawPrice = salePrice || regularPrice || '';
      
      // Detect brand from name or brand field
      const brand = brandField || detectBrand(nameLower);
      
      const cleanName = name.replace(/"/g, '').trim();
      
      // Check for exact match in name OR brand
      const brandNormalized = normalizePersian(brand.toLowerCase());
      const matchesName = nameLower.includes(searchNormalized) || searchNormalized.includes(nameLower.substring(0, 20));
      const matchesBrand = brandNormalized.includes(searchNormalized) || searchNormalized.includes(brandNormalized);
      
      if (matchesName || matchesBrand) {
        // Get product link from slugs file
        const productUrl = getProductLink(cleanName);
        
        const product = {
          name: cleanName,
          rawPrice,
          price: formatPersianPrice(rawPrice),
          discountPrice: calculateDiscount(rawPrice),
          brand,
          categories,
          productUrl,
          productId,
          matchType: 'exact'
        };
        
        matches.push(product);
        console.log(`✅ EXACT MATCH FOUND:`);
        console.log(`   Name: ${cleanName}`);
        console.log(`   Brand: ${brand}`);
        console.log(`   Raw Price: ${rawPrice}`);
        console.log(`   Formatted Price: ${product.price} تومان`);
        console.log(`   Discount Price: ${product.discountPrice} تومان`);
        console.log(`   URL: ${productUrl}`);
        
        if (matches.length >= 5) break;
      } else {
        // Calculate similarity for fuzzy matching
        const simScore = similarity(searchNormalized, nameLower);
        // Also check similarity with brand name
        const brandScore = similarity(searchNormalized, brandNormalized);
        const maxScore = Math.max(simScore, brandScore);
        
        if (maxScore > 0.3) {  // 30% similarity threshold (more lenient)
          const productUrl = getProductLink(cleanName);
          
          fuzzyMatches.push({
            name: cleanName,
            rawPrice,
            price: formatPersianPrice(rawPrice),
            discountPrice: calculateDiscount(rawPrice),
            brand,
            categories,
            productUrl,
            productId,
            matchType: 'fuzzy',
            similarity: maxScore
          });
        }
      }
    }
    
    // If exact matches found, return them
    if (matches.length > 0) {
      console.log(`\n✅ Returning ${matches.length} exact match(es)`);
      console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
      return matches;
    }
    
    // If no exact matches, return top 3 fuzzy matches
    if (fuzzyMatches.length > 0) {
      fuzzyMatches.sort((a, b) => b.similarity - a.similarity);
      const topMatches = fuzzyMatches.slice(0, 3);
      
      console.log(`\n⚠️ No exact match found. Returning ${topMatches.length} similar product(s):`);
      topMatches.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${Math.round(p.similarity * 100)}% similar)`);
        console.log(`      Price: ${p.price} تومان | URL: ${p.productUrl}`);
      });
      console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
      return topMatches;
    }
    
    // No matches at all
    console.log(`\n❌ NO MATCHES FOUND in products.csv`);
    console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
    return [];
    
  } catch (error) {
    console.error(`\n❌ ERROR searching products: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
    return [];
  }
}

module.exports = { searchProduct, formatPersianPrice, calculateDiscount, normalizePersian };
