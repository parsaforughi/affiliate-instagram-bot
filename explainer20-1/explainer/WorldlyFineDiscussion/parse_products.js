const fs = require('fs');

console.log('📦 Parsing products CSV...');

// Read CSV file
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

// Get headers
const headers = parseCSVLine(lines[0]);
console.log(`Found ${headers.length} columns`);

// Find important column indices
const nameIndex = headers.findIndex(h => h.includes('نام'));
const salePriceIndex = headers.findIndex(h => h.includes('قیمت فروش فوق'));
const regularPriceIndex = headers.findIndex(h => h.includes('قیمت اصلی'));
const categoriesIndex = headers.findIndex(h => h.includes('دسته'));
const shortDescIndex = headers.findIndex(h => h.includes('توضیح کوتاه'));
const brandIndex = headers.findIndex(h => h.includes('برند'));

console.log(`Column indices: name=${nameIndex}, salePrice=${salePriceIndex}, regularPrice=${regularPriceIndex}, categories=${categoriesIndex}`);

// Parse products
const products = [];
const brandCategories = {
  'Misswake': [],
  'Collamin': [],
  'Umbrella': [],
  'Dafi': [],
  'IceBall': [],
  'Codex': [], // کدکس
  'Other': []
};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const fields = parseCSVLine(lines[i]);
  if (fields.length < 10) continue;
  
  const name = fields[nameIndex] || '';
  if (!name) continue;
  
  const salePrice = fields[salePriceIndex] || '';
  const regularPrice = fields[regularPriceIndex] || '';
  const categories = fields[categoriesIndex] || '';
  
  // Determine price
  const price = salePrice || regularPrice || 'تماس بگیرید';
  
  // Detect brand from name
  let brand = 'Other';
  const nameLower = name.toLowerCase();
  if (nameLower.includes('میسویک') || nameLower.includes('misswake')) brand = 'Misswake';
  else if (nameLower.includes('کلامین') || nameLower.includes('collamin')) brand = 'Collamin';
  else if (nameLower.includes('آمبرلا') || nameLower.includes('umbrella')) brand = 'Umbrella';
  else if (nameLower.includes('دافی') || nameLower.includes('dafi')) brand = 'Dafi';
  else if (nameLower.includes('آیس بال') || nameLower.includes('iceball')) brand = 'IceBall';
  else if (nameLower.includes('کدکس') || nameLower.includes('codex') || nameLower.includes('ناچ')) brand = 'Codex';
  
  const product = {
    name,
    price,
    brand,
    categories
  };
  
  products.push(product);
  brandCategories[brand].push(product);
}

console.log(`✅ Parsed ${products.length} products`);
console.log('\nProducts by brand:');
Object.keys(brandCategories).forEach(brand => {
  console.log(`  ${brand}: ${brandCategories[brand].length} products`);
});

// Create knowledge base text
let knowledgeBase = `# 🛍️ کاتالوگ محصولات سیلانه - ${products.length} محصول

`;

// Add products by brand
Object.keys(brandCategories).forEach(brand => {
  if (brandCategories[brand].length === 0) return;
  
  knowledgeBase += `\n## ${brand === 'Other' ? 'سایر محصولات' : brand} (${brandCategories[brand].length} محصول)\n\n`;
  
  brandCategories[brand].slice(0, 50).forEach(p => { // Limit to first 50 per brand
    knowledgeBase += `### ${p.name}\n`;
    knowledgeBase += `- **قیمت:** ${p.price} تومان\n`;
    if (p.categories) {
      knowledgeBase += `- **دسته‌بندی:** ${p.categories}\n`;
    }
    knowledgeBase += `\n`;
  });
});

// Save knowledge base
fs.writeFileSync('Products_Knowledge_Base.txt', knowledgeBase, 'utf-8');
console.log('\n✅ Knowledge base saved to Products_Knowledge_Base.txt');

// Create summary for system prompt
const summary = `
📦 کاتالوگ محصولات کامل:
• مجموع محصولات: ${products.length}
• Misswake: ${brandCategories.Misswake.length} محصول
• Collamin: ${brandCategories.Collamin.length} محصول  
• Umbrella: ${brandCategories.Umbrella.length} محصول
• Dafi: ${brandCategories.Dafi.length} محصول
• IceBall: ${brandCategories.IceBall.length} محصول
• Codex: ${brandCategories.Codex.length} محصول
• سایر: ${brandCategories.Other.length} محصول

⚠️ نکته مهم: برای دیدن لیست کامل محصولات و قیمت‌ها به فایل Products_Knowledge_Base.txt مراجعه کن.
`;

fs.writeFileSync('Products_Summary.txt', summary, 'utf-8');
console.log('✅ Summary saved to Products_Summary.txt');
