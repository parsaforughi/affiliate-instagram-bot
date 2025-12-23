const fs = require('fs');
const fetch = require('node-fetch');

async function scrapeProduct(url, title, index) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      attempts++;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      
      if (!response.ok) {
        console.log(`  ⚠️  HTTP ${response.status} - Skipping`);
        return null;
      }
      
      const html = await response.text();
      
      const product = {
        name: title,
        url: url,
        price: '',
        brand: '',
        category: '',
        description: '',
        benefits: '',
        features: '',
        weight: '',
        country: '',
        suitableFor: ''
      };
      
      // Extract price
      const priceMatch = html.match(/(\d{1,3}(?:,\d{3})*)\s*تومان/);
      if (priceMatch) {
        product.price = priceMatch[1].replace(/,/g, '');
        console.log(`  💰 قیمت: ${priceMatch[1]} تومان`);
      } else {
        console.log(`  ⚠️  قیمت پیدا نشد`);
      }
      
      // Extract brand
      const brandMatch = html.match(/برندها<\/th>\s*<td[^>]*>\s*([^<\n]+)/i) || 
                         html.match(/برند[:\s]*<[^>]*>([^<]+)</i);
      if (brandMatch) {
        product.brand = brandMatch[1].trim();
        console.log(`  🏷️  برند: ${product.brand}`);
      } else {
        console.log(`  ⚠️  برند پیدا نشد`);
      }
      
      // Extract category
      const categoryMatch = html.match(/دسته:\s*<a[^>]*>([^<]+)<\/a>/);
      if (categoryMatch) {
        product.category = categoryMatch[1].trim();
        console.log(`  📂 دسته: ${product.category}`);
      }
      
      // Extract description
      const descSection = html.match(/<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (descSection) {
        const cleaned = descSection[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .trim();
        product.description = cleaned.substring(0, 600);
        console.log(`  📝 توضیحات: ${cleaned.substring(0, 80)}...`);
      }
      
      // Extract benefits/features
      const benefitsMatch = html.match(/ویژگی[^<]*<\/[^>]+>([\s\S]*?)<\/(?:ul|div|p)>/i);
      if (benefitsMatch) {
        const cleaned = benefitsMatch[1]
          .replace(/<[^>]+>/g, '\n')
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ', ')
          .trim();
        product.benefits = cleaned.substring(0, 400);
        console.log(`  ✨ ویژگی‌ها: ${cleaned.substring(0, 60)}...`);
      }
      
      // Extract weight
      const weightMatch = html.match(/وزن<\/th>\s*<td[^>]*>\s*([^<\n]+)/i);
      if (weightMatch) {
        product.weight = weightMatch[1].trim();
        console.log(`  ⚖️  وزن: ${product.weight}`);
      }
      
      // Extract country
      const countryMatch = html.match(/کشور سازنده<\/th>\s*<td[^>]*>\s*([^<\n]+)/i);
      if (countryMatch) {
        product.country = countryMatch[1].trim().replace(/<[^>]+>/g, '');
        console.log(`  🌍 کشور: ${product.country}`);
      }
      
      // Extract suitable for
      const suitableMatch = html.match(/مناسب برای<\/th>\s*<td[^>]*>\s*([^<]+)/i);
      if (suitableMatch) {
        product.suitableFor = suitableMatch[1].trim().replace(/<[^>]+>/g, ', ');
        console.log(`  👤 مناسب برای: ${product.suitableFor}`);
      }
      
      // Extract features from table
      const featuresMatch = html.match(/ویژگی<\/th>\s*<td[^>]*>\s*([^<]+(?:<[^>]+>[^<]*)*?)<\/td>/i);
      if (featuresMatch) {
        const cleaned = featuresMatch[1]
          .replace(/<br\s*\/?>/gi, ', ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        product.features = cleaned.substring(0, 400);
        console.log(`  🔧 ویژگی‌های جدول: ${cleaned.substring(0, 60)}...`);
      }
      
      // Show full product data every 10 items
      if (index % 10 === 0) {
        console.log('\n📦 نمونه کامل محصول:');
        console.log(JSON.stringify(product, null, 2));
        console.log('');
      }
      
      return product;
      
    } catch (error) {
      if (attempts < maxAttempts) {
        console.log(`  ⚠️  تلاش ${attempts}/${maxAttempts} - خطا: ${error.message}`);
        console.log(`  🔄 تلاش مجدد در 2 ثانیه...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`  ❌ شکست بعد از ${maxAttempts} تلاش: ${error.message}`);
        return null;
      }
    }
  }
  
  return null;
}

async function scrapeAllProducts() {
  console.log('🚀 شروع استخراج محصولات Luxirana...\n');
  console.log('📋 فرمت لاگ:');
  console.log('  💰 = قیمت');
  console.log('  🏷️  = برند');
  console.log('  📂 = دسته‌بندی');
  console.log('  📝 = توضیحات');
  console.log('  ✨ = ویژگی‌ها');
  console.log('  ⚖️  = وزن');
  console.log('  🌍 = کشور سازنده');
  console.log('  👤 = مناسب برای\n');
  
  const csvContent = fs.readFileSync('../../../attached_assets/export-all-urls-534799_1761406255475.csv', 'utf-8');
  const lines = csvContent.split('\n').slice(1);
  
  const products = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split('",');
    if (parts.length < 2) continue;
    
    const title = parts[0].replace(/^"/, '').trim();
    const url = parts[1].trim().replace(/"/g, '');
    
    if (!url.startsWith('http')) continue;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${i + 1}/${lines.length}] ${title}`);
    console.log(`🔗 ${url}`);
    console.log(`${'-'.repeat(80)}`);
    
    const product = await scrapeProduct(url, title, i + 1);
    
    if (product && product.price) {
      products.push(product);
      successCount++;
      console.log(`  ✅ موفق - ${successCount} محصول تا الان`);
    } else {
      failCount++;
      console.log(`  ❌ ناموفق - ${failCount} محصول شکست خورده`);
    }
    
    // Save progress every 25 products
    if (products.length % 25 === 0 && products.length > 0) {
      fs.writeFileSync('luxirana_products_complete.json', JSON.stringify(products, null, 2), 'utf-8');
      console.log(`\n💾 پیشرفت ذخیره شد: ${products.length} محصول\n`);
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  // Final save
  fs.writeFileSync('luxirana_products_complete.json', JSON.stringify(products, null, 2), 'utf-8');
  
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ استخراج کامل شد!');
  console.log(`📊 موفق: ${successCount} محصول`);
  console.log(`❌ ناموفق: ${failCount} محصول`);
  console.log(`📁 ذخیره شده در: luxirana_products_complete.json`);
  console.log('='.repeat(80));
}

scrapeAllProducts().catch(console.error);
