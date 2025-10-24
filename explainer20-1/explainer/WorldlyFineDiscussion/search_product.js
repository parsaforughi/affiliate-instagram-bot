const fs = require('fs');

// Search for a product by name
function searchProduct(productName) {
  try {
    const csvContent = fs.readFileSync('products.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // Parse CSV with proper handling of quoted fields
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
    const matches = [];
    
    // Search through all products
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 28) continue;
      
      const name = fields[4] || '';
      const nameLower = name.toLowerCase();
      
      // Check if product name matches search
      if (nameLower.includes(searchLower) || searchLower.includes(nameLower.substring(0, 20))) {
        const salePrice = fields[25] || '';
        const regularPrice = fields[26] || '';
        const categories = fields[27] || '';
        
        const price = salePrice || regularPrice || 'تماس بگیرید';
        
        // Detect brand
        let brand = 'سایر';
        if (nameLower.includes('میسویک') || nameLower.includes('misswake')) brand = 'Misswake';
        else if (nameLower.includes('کلامین') || nameLower.includes('collamin')) brand = 'Collamin';
        else if (nameLower.includes('آمبرلا') || nameLower.includes('umbrella')) brand = 'Umbrella';
        else if (nameLower.includes('دافی') || nameLower.includes('dafi')) brand = 'Dafi';
        else if (nameLower.includes('آیس بال') || nameLower.includes('iceball')) brand = 'IceBall';
        else if (nameLower.includes('کدکس') || nameLower.includes('codex') || nameLower.includes('ناچ')) brand = 'Codex';
        
        matches.push({
          name: name.replace(/"/g, ''),
          price,
          brand,
          categories
        });
        
        // Limit to first 5 matches
        if (matches.length >= 5) break;
      }
    }
    
    return matches;
  } catch (error) {
    console.error('Error searching products:', error.message);
    return [];
  }
}

module.exports = { searchProduct };
