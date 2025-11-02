const fs = require('fs');

// Normalize Persian characters for matching
function normalizePersian(text) {
  if (!text) return '';
  return text
    .replace(/ك/g, 'ک')  // Arabic kaf → Persian kaf
    .replace(/ي/g, 'ی')  // Arabic yeh → Persian yeh
    .replace(/ئ/g, 'ی')
    .replace(/أ/g, 'ا')
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .trim();
}

// Calculate similarity between two strings
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
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
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

// Get direct product link from slug file
function getProductLink(productName) {
  try {
    console.log(`\n   📎 Looking up URL for: "${productName}"`);
    
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
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Search through all product slugs
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;
      
      const title = fields[0] || '';
      const url = fields[1] || '';
      const titleNormalized = normalizePersian(title.toLowerCase());
      
      // Check for exact match first
      if (titleNormalized.includes(searchNormalized) || searchNormalized.includes(titleNormalized.substring(0, 20))) {
        console.log(`   ✅ EXACT URL MATCH found in product_slugs.csv`);
        console.log(`      Title: ${title}`);
        console.log(`      URL: ${url}`);
        return url;  // Return original luxirana.com URL
      }
      
      // Calculate similarity for fuzzy matching
      const score = similarity(searchNormalized, titleNormalized);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { title, url };
      }
    }
    
    // If we found a good fuzzy match (>60% similar)
    if (bestMatch && bestScore > 0.6) {
      console.log(`   ⚠️ FUZZY URL MATCH (${Math.round(bestScore * 100)}% similar)`);
      console.log(`      Title: ${bestMatch.title}`);
      console.log(`      URL: ${bestMatch.url}`);
      return bestMatch.url;
    }
    
    // Not found - return store homepage
    console.log(`   ❌ NO URL MATCH in product_slugs.csv - using homepage`);
    return 'https://luxirana.com';
    
  } catch (error) {
    console.error(`   ❌ ERROR getting product link: ${error.message}`);
    return 'https://luxirana.com';
  }
}

module.exports = { getProductLink };
