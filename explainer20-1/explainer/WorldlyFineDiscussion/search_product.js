const fs = require('fs');
const { getProductLink } = require('./get_product_link');

// Normalize numbers - convert English to Persian
function normalizeNumbers(text) {
  const englishToPersian = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
  return text.replace(/[0-9]/g, (d) => englishToPersian[d]);
}

// Search for a product by name
function searchProduct(productName) {
  try {
    const csvContent = fs.readFileSync('products.csv', 'utf-8');
    
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
    
    // Normalize search query (convert English numbers to Persian)
    const searchNormalized = normalizeNumbers(productName.toLowerCase());
    const matches = [];
    
    // Search through all products (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];
      if (fields.length < 28) continue;
      
      const name = fields[4] || '';
      const nameLower = normalizeNumbers(name.toLowerCase());
      
      // Check if product name matches search
      if (nameLower.includes(searchNormalized) || searchNormalized.includes(nameLower.substring(0, 20))) {
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
