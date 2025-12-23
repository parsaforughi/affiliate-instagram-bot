const fs = require('fs');

console.log('📊 Creating product summary for AI...');

// Read full knowledge base
const fullKB = fs.readFileSync('Products_Knowledge_Base.txt', 'utf-8');
const lines = fullKB.split('\n');

// Extract key products (first 5 from each brand)
const summary = {
  Misswake: [],
  Collamin: [],
  Umbrella: [],
  Dafi: [],
  IceBall: [],
  Codex: []
};

let currentBrand = null;
let currentProduct = null;

lines.forEach(line => {
  // Detect brand section
  if (line.startsWith('## Misswake')) currentBrand = 'Misswake';
  else if (line.startsWith('## Collamin')) currentBrand = 'Collamin';
  else if (line.startsWith('## Umbrella')) currentBrand = 'Umbrella';
  else if (line.startsWith('## Dafi')) currentBrand = 'Dafi';
  else if (line.startsWith('## IceBall')) currentBrand = 'IceBall';
  else if (line.startsWith('## Codex')) currentBrand = 'Codex';
  
  // Extract product name
  if (line.startsWith('###')) {
    if (currentBrand && summary[currentBrand].length < 5) {
      currentProduct = { name: line.replace('###', '').trim(), price: '', category: '' };
    }
  }
  
  // Extract price
  if (line.includes('**قیمت:**') && currentProduct) {
    currentProduct.price = line.split('**قیمت:**')[1].trim();
  }
  
  // Extract category
  if (line.includes('**دسته‌بندی:**') && currentProduct) {
    currentProduct.category = line.split('**دسته‌بندی:**')[1].trim().substring(0, 100);
    
    if (currentBrand && summary[currentBrand].length < 5) {
      summary[currentBrand].push(currentProduct);
    }
    currentProduct = null;
  }
});

// Create AI-friendly summary
let aiSummary = `📦 محصولات سیلانه - راهنمای کامل

⚠️ نکته مهم: این لیست شامل نمونه‌هایی از محصولات است. در مجموع ۵۷۱ محصول داریم.

`;

Object.keys(summary).forEach(brand => {
  if (summary[brand].length === 0) return;
  
  aiSummary += `\n🏷️ ${brand}:\n`;
  summary[brand].forEach(p => {
    aiSummary += `  • ${p.name} - ${p.price}\n`;
  });
});

// Add price ranges
aiSummary += `\n\n💰 محدوده قیمت‌ها:
• خمیر دندان: 29,000 - 240,000 تومان
• دهان‌شویه: 127,000 - 235,000 تومان
• کاندوم: 65,000 - 195,000 تومان
• نخ دندان: 165,000 تومان
• محصولات دافی: 90,000 - 450,000 تومان
• محصولات آمبرلا: 150,000 - 580,000 تومان

🔗 لینک خرید: همه محصولات در https://luxirana.com موجود هستند

⚠️ وقتی کاربر درباره محصول خاص سوال می‌کنه:
1. اگر محصول در لیست بالا هست → قیمت دقیق رو بگو
2. اگر محصول در لیست نیست → بگو "این محصول در کاتالوگ ما موجوده، برای قیمت دقیق می‌تونید به سایت luxirana.com مراجعه کنید"
3. همیشه لینک سایت رو بده: https://luxirana.com
`;

fs.writeFileSync('Products_AI_Summary.txt', aiSummary, 'utf-8');
console.log('✅ AI summary created');
console.log(aiSummary);
