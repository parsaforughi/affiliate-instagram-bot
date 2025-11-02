const fs = require('fs');

// Get direct product link from slug file
function getProductLink(productName) {
  try {
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
    
    const searchLower = productName.toLowerCase();
    
    // Search through all products
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 2) continue;
      
      const title = fields[0] || '';
      const url = fields[1] || '';
      const titleLower = title.toLowerCase();
      
      // Check if product name matches
      if (titleLower.includes(searchLower) || searchLower.includes(titleLower.substring(0, 20))) {
        // Convert luxirana.com URLs to seylane.com
        const seylaneUrl = url.replace(/luxirana\.com/g, 'seylane.com');
        return seylaneUrl;
      }
    }
    
    // Not found - return store homepage
    return 'https://seylane.com';
  } catch (error) {
    console.error('Error getting product link:', error.message);
    return 'https://seylane.com';
  }
}

module.exports = { getProductLink };
