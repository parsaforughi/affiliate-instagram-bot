const fs = require('fs');

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

// Calculate similarity score between two strings (fuzzy matching)
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

// Parse CSV properly - handles multi-line quoted fields
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

// Get product URL from product_slugs.csv
function getProductURL(productName) {
  try {
    console.log(`   📎 Looking up URL in product_slugs.csv for: "${productName}"`);
    
    const csvContent = fs.readFileSync('data/product_slugs.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    }
    
    const searchNormalized = normalizePersian(productName.toLowerCase());
    
    // First pass: exact match
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;
      
      const title = fields[0] || '';
      const url = fields[1] || '';
      const titleNormalized = normalizePersian(title.toLowerCase());
      
      // Exact match
      if (titleNormalized === searchNormalized || 
          titleNormalized.includes(searchNormalized) || 
          searchNormalized.includes(titleNormalized.substring(0, 20))) {
        console.log(`   ✅ EXACT URL found: ${url}`);
        return url;
      }
    }
    
    // Second pass: fuzzy match
    let bestMatch = null;
    let bestScore = 0;
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;
      
      const title = fields[0] || '';
      const url = fields[1] || '';
      const titleNormalized = normalizePersian(title.toLowerCase());
      
      const score = similarity(searchNormalized, titleNormalized);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { title, url };
      }
    }
    
    // If we found a good fuzzy match (>60% similar)
    if (bestMatch && bestScore > 0.6) {
      console.log(`   ⚠️ FUZZY URL match (${Math.round(bestScore * 100)}%): ${bestMatch.url}`);
      return bestMatch.url;
    }
    
    // Not found - return null (only send real URLs from product_slugs.csv)
    console.log(`   ❌ NO URL match - returning null`);
    return null;
    
  } catch (error) {
    console.error(`   ❌ ERROR getting URL: ${error.message}`);
    return null;
  }
}

// Search for a product by name
function searchProduct(productName) {
  try {
    console.log(`\n🔍 ========== PRODUCT SEARCH START ==========`);
    console.log(`🔎 Search Query: "${productName}"`);
    
    const csvContent = fs.readFileSync('data/products.csv', 'utf-8');
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
      if (fields.length < 41) continue;
      
      const name = (fields[4] || '').replace(/"/g, '').trim();
      const salePrice = fields[25] || '';
      const regularPrice = fields[26] || '';
      const categories = fields[27] || '';
      const productId = fields[2] || '';
      const brand = fields[40] || '';  // FIXED: Field 41 (index 40)
      
      const rawPrice = salePrice || regularPrice || '';
      
      // Normalize for matching
      const nameLower = normalizePersian(normalizeNumbers(name.toLowerCase()));
      const brandLower = normalizePersian(brand.toLowerCase());
      
      // Check for exact match by name
      if (nameLower.includes(searchNormalized) || 
          searchNormalized.includes(nameLower.substring(0, 20))) {
        
        // Get URL from product_slugs.csv (only real URLs)
        const productUrl = getProductURL(name);
        
        // Only include product if we found a real URL
        if (productUrl) {
          const product = {
            name,
            rawPrice,
            price: formatPersianPrice(rawPrice),
            discountPrice: calculateDiscount(rawPrice),
            brand,
            categories,
            productUrl,
            productId,
            matchType: 'exact-name'
          };
          
          matches.push(product);
          console.log(`✅ EXACT NAME MATCH:`);
          console.log(`   Name: ${name}`);
          console.log(`   Brand: ${brand}`);
          console.log(`   Price: ${product.price} تومان`);
          console.log(`   Discount: ${product.discountPrice} تومان (40% off)`);
          console.log(`   URL: ${productUrl}`);
          
          if (matches.length >= 5) break;
        }
      } 
      // Check for match by brand (only if brand is not empty)
      else if (brand && brandLower && 
               (brandLower.includes(searchNormalized) || 
                searchNormalized.includes(brandLower))) {
        
        // Get URL from product_slugs.csv (only real URLs)
        const productUrl = getProductURL(name);
        
        // Only include product if we found a real URL
        if (productUrl) {
          const product = {
            name,
            rawPrice,
            price: formatPersianPrice(rawPrice),
            discountPrice: calculateDiscount(rawPrice),
            brand,
            categories,
            productUrl,
            productId,
            matchType: 'exact-brand'
          };
          
          matches.push(product);
          console.log(`✅ EXACT BRAND MATCH:`);
          console.log(`   Name: ${name}`);
          console.log(`   Brand: ${brand}`);
          console.log(`   Price: ${product.price} تومان`);
          console.log(`   URL: ${productUrl}`);
          
          if (matches.length >= 5) break;
        }
      } 
      // Fuzzy matching
      else {
        const nameScore = similarity(searchNormalized, nameLower);
        const brandScore = similarity(searchNormalized, brandLower);
        const maxScore = Math.max(nameScore, brandScore);
        
        if (maxScore > 0.3) {  // 30% similarity threshold
          const productUrl = getProductURL(name);
          
          // Only include if we found a real URL from product_slugs.csv
          if (productUrl) {
            fuzzyMatches.push({
              name,
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
    }
    
    // Return exact matches if found
    if (matches.length > 0) {
      console.log(`\n✅ Returning ${matches.length} exact match(es)`);
      console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
      return matches;
    }
    
    // Return top 3 fuzzy matches if no exact matches
    if (fuzzyMatches.length > 0) {
      fuzzyMatches.sort((a, b) => b.similarity - a.similarity);
      const topMatches = fuzzyMatches.slice(0, 3);
      
      console.log(`\n⚠️ No exact match. Returning ${topMatches.length} similar product(s):`);
      topMatches.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${Math.round(p.similarity * 100)}% similar)`);
        console.log(`      Brand: ${p.brand} | Price: ${p.price} تومان`);
        console.log(`      URL: ${p.productUrl}`);
      });
      console.log(`🔍 ========== PRODUCT SEARCH END ==========\n`);
      return topMatches;
    }
    
    // No matches
    console.log(`\n❌ NO MATCHES FOUND`);
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
