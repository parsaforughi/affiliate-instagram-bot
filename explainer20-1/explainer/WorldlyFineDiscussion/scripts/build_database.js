const fs = require('fs');

const csv = fs.readFileSync('../../../attached_assets/export-all-urls-534799_1761406255475.csv', 'utf-8');
const lines = csv.split('\n').slice(1);

const slugDatabase = {};

for (const line of lines) {
  if (!line.trim()) continue;
  
  const parts = line.split(',');
  if (parts.length < 2) continue;
  
  const title = parts[0].replace(/^"|"$/g, '').trim();
  const url = parts[1].trim();
  
  if (!url || !title) continue;
  
  const slug = url.split('/product/')[1]?.split('/')[0] || '';
  if (slug) {
    slugDatabase[title.toLowerCase()] = url;
  }
}

const existingProducts = JSON.parse(fs.readFileSync('products.csv', 'utf-8'));

const enhancedProducts = existingProducts.map(product => {
  const searchKey = product.name.toLowerCase();
  const matchedUrl = slugDatabase[searchKey] || Object.entries(slugDatabase).find(([key]) => 
    key.includes(searchKey.substring(0, 20)) || searchKey.includes(key.substring(0, 20))
  )?.[1] || '';
  
  return {
    ...product,
    productUrl: matchedUrl || product.productUrl
  };
});

fs.writeFileSync('products_enhanced.json', JSON.stringify(enhancedProducts, null, 2), 'utf-8');
console.log(`✅ Enhanced ${enhancedProducts.length} products with URLs`);
console.log(`📁 Saved to: products_enhanced.json`);
