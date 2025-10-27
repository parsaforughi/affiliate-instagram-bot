const fs = require('fs');
const { getProductLink } = require('./get_product_link');

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
        const images = fields[30] || '';
        const productId = fields[2] || '';
        
        const price = salePrice || regularPrice || 'تماس بگیرید';
        
        // Extract first image URL
        const imageUrl = images.split(',')[0].trim();
        
        // Create DIRECT product URL using slug (preferred) or product ID (fallback)
        const cleanName = name.replace(/"/g, '').trim();
        let productUrl = getProductLink(cleanName); // Try slug-based URL first
        
        // Fallback to product ID URL if slug not found
        if (productUrl === 'https://luxirana.com' && productId) {
          productUrl = `https://luxirana.com/?post_type=product&p=${productId}`;
        }
        
        // Detect brand
        let brand = 'سایر';
        if (nameLower.includes('میسویک') || nameLower.includes('misswake')) brand = 'Misswake';
        else if (nameLower.includes('کلامین') || nameLower.includes('collamin')) brand = 'Collamin';
        else if (nameLower.includes('آمبرلا') || nameLower.includes('umbrella')) brand = 'Umbrella';
        else if (nameLower.includes('دافی') || nameLower.includes('dafi')) brand = 'Dafi';
        else if (nameLower.includes('آیس بال') || nameLower.includes('iceball')) brand = 'IceBall';
        else if (nameLower.includes('کدکس') || nameLower.includes('kodex') || nameLower.includes('ناچ')) brand = 'Kodex';
        else if (nameLower.includes('پیکسل') || nameLower.includes('pixel')) brand = 'Pixel';
        
        matches.push({
          name: cleanName,
          price,
          brand,
          categories,
          imageUrl,
          productUrl
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
