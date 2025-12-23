const fs = require('fs');
const fetch = require('node-fetch');

async function scrapeProduct(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const product = {
      url: url,
      name: '',
      price: '',
      brand: '',
      description: '',
      benefits: '',
      category: '',
      weight: '',
      country: ''
    };
    
    const titleMatch = html.match(/<h1[^>]*class="product_title[^>]*>([^<]+)</);
    if (titleMatch) product.name = titleMatch[1].trim();
    
    const priceMatch = html.match(/(\d{1,3}(?:,\d{3})*)\s*تومان/);
    if (priceMatch) product.price = priceMatch[1];
    
    const brandMatch = html.match(/برندها<\/th>\s*<td[^>]*>([^<]+)</);
    if (brandMatch) product.brand = brandMatch[1].trim();
    
    const descMatch = html.match(/<div class="woocommerce-product-details__short-description">([^]*?)<\/div>/);
    if (descMatch) {
      const cleaned = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      product.description = cleaned.substring(0, 500);
    }
    
    const benefitsMatch = html.match(/ویژگی[^<]*<\/strong>([^]*?)<\/div>/);
    if (benefitsMatch) {
      const cleaned = benefitsMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      product.benefits = cleaned.substring(0, 300);
    }
    
    const categoryMatch = html.match(/دسته:\s*<a[^>]*>([^<]+)<\/a>/);
    if (categoryMatch) product.category = categoryMatch[1].trim();
    
    const weightMatch = html.match(/وزن<\/th>\s*<td[^>]*>([^<]+)</);
    if (weightMatch) product.weight = weightMatch[1].trim();
    
    const countryMatch = html.match(/کشور سازنده<\/th>\s*<td[^>]*>([^<]+)</);
    if (countryMatch) product.country = countryMatch[1].trim();
    
    return product;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

async function scrapeAllProducts() {
  const csvContent = fs.readFileSync('../../../attached_assets/export-all-urls-534799_1761406255475.csv', 'utf-8');
  const lines = csvContent.split('\n').slice(1);
  
  const products = [];
  let count = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/https:\/\/[^\s,"]+/);
    if (!match) continue;
    
    const url = match[0];
    count++;
    
    console.log(`[${count}/563] Scraping: ${url.substring(0, 80)}...`);
    
    const product = await scrapeProduct(url);
    if (product && product.name) {
      products.push(product);
      console.log(`✓ ${product.name} - ${product.brand} - ${product.price} تومان`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  fs.writeFileSync('luxirana_products_complete.json', JSON.stringify(products, null, 2), 'utf-8');
  console.log(`\n✅ Done! Scraped ${products.length} products`);
  console.log('📁 Saved to: luxirana_products_complete.json');
}

scrapeAllProducts().catch(console.error);
