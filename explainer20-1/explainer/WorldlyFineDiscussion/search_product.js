const fs = require('fs');
const { getProductLink } = require('./get_product_link');

// Normalize numbers - convert English to Persian
function normalizeNumbers(text) {
  const englishToPersian = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
  return text.replace(/[0-9]/g, (d) => englishToPersian[d]);
}

// Helper function to detect brand from text
function detectBrand(text) {
  const textLower = normalizeNumbers(text.toLowerCase());
  if (textLower.includes('میسویک') || textLower.includes('misswake')) return 'Misswake';
  if (textLower.includes('کلامین') || textLower.includes('collamin')) return 'Collamin';
  if (textLower.includes('آمبرلا') || textLower.includes('umbrella')) return 'Umbrella';
  if (textLower.includes('دافی') || textLower.includes('dafi')) return 'Dafi';
  if (textLower.includes('آیس بال') || textLower.includes('iceball') || textLower.includes('ایس بال')) return 'IceBall';
  if (textLower.includes('کدکس') || textLower.includes('kodex') || textLower.includes('ناچ')) return 'Kodex';
  if (textLower.includes('پیکسل') || textLower.includes('pixel')) return 'Pixel';
  return 'سایر';
}

// Helper function to detect category from text
function detectCategory(text) {
  const textLower = normalizeNumbers(text.toLowerCase());
  if (textLower.includes('خمیر') || textLower.includes('دندان') || textLower.includes('دهان')) return 'دهان و دندان';
  if (textLower.includes('کلاژن') || textLower.includes('مکمل')) return 'مکمل و کلاژن';
  if (textLower.includes('کرم') || textLower.includes('ژل') || textLower.includes('پوست')) return 'مراقبت پوست';
  if (textLower.includes('دستمال')) return 'دستمال';
  if (textLower.includes('کاندوم')) return 'بهداشت';
  if (textLower.includes('ضدآفتاب')) return 'ضدآفتاب';
  return null;
}

// Find similar products by brand or category
function findSimilarProducts(searchQuery, allProducts, maxResults = 3) {
  const brand = detectBrand(searchQuery);
  const category = detectCategory(searchQuery);
  
  const similar = [];
  
  // First priority: same brand
  if (brand !== 'سایر') {
    for (const product of allProducts) {
      if (product.brand === brand && similar.length < maxResults) {
        similar.push({ ...product, matchReason: 'same_brand' });
      }
    }
  }
  
  // Second priority: same category
  if (similar.length < maxResults && category) {
    for (const product of allProducts) {
      const productCat = product.categories.toLowerCase();
      if (productCat.includes(category) && !similar.find(p => p.name === product.name)) {
        similar.push({ ...product, matchReason: 'same_category' });
        if (similar.length >= maxResults) break;
      }
    }
  }
  
  // Third priority: popular products from priority brands
  if (similar.length < maxResults) {
    const priorityBrands = ['Collamin', 'Misswake', 'IceBall'];
    for (const product of allProducts) {
      if (priorityBrands.includes(product.brand) && !similar.find(p => p.name === product.name)) {
        similar.push({ ...product, matchReason: 'popular' });
        if (similar.length >= maxResults) break;
      }
    }
  }
  
  return similar;
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
    const allProducts = [];
    
    // Search through all products (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];
      if (fields.length < 28) continue;
      
      const name = fields[4] || '';
      const nameLower = normalizeNumbers(name.toLowerCase());
      
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
      const brand = detectBrand(nameLower);
      
      const product = {
        name: cleanName,
        price,
        brand,
        categories,
        imageUrl,
        productUrl
      };
      
      allProducts.push(product);
      
      // Check if product name matches search
      if (nameLower.includes(searchNormalized) || searchNormalized.includes(nameLower.substring(0, 20))) {
        matches.push(product);
        
        // Limit to first 5 exact matches
        if (matches.length >= 5) break;
      }
    }
    
    // If no exact matches found, find similar products
    if (matches.length === 0) {
      const similarProducts = findSimilarProducts(searchNormalized, allProducts, 5);
      return similarProducts;
    }
    
    return matches;
  } catch (error) {
    console.error('Error searching products:', error.message);
    return [];
  }
}

module.exports = { searchProduct };
