const { searchProduct, extractBrandFromText, ALL_BRANDS_MAP } = require('./search_product.js');
const { ProductCardSender } = require('./product_card_sender.js');

// ========================================
// INTENT DETECTION
// ========================================

class ProductIntentDetector {
  // تشخیص نوع درخواست
  static detectIntent(message, conversationHistory) {
    const normalized = message.toLowerCase().trim();
    
    // چک کردن "بیشتر"
    if (normalized.includes('بیشتر') || 
        normalized.includes('باقی') || 
        normalized.includes('دیگه') ||
        normalized === 'بله' ||
        normalized === 'آره' ||
        normalized === 'بفرست' ||
        normalized === 'ارسال کن') {
      return { type: 'more_products', confidence: 0.9 };
    }
    
    // چک کردن برند کلی برای همه برندها
    let detectedBrand = null;
    for (const [brandKey, brandData] of Object.entries(ALL_BRANDS_MAP)) {
      for (const keyword of brandData.keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          detectedBrand = brandData.name;
          break;
        }
      }
      if (detectedBrand) break;
    }
    
    const hasProductKeyword = normalized.includes('محصول') || 
                              normalized.includes('محصولات');
    
    if (detectedBrand && hasProductKeyword) {
      return { 
        type: 'brand_products', 
        confidence: 0.95,
        brand: detectedBrand
      };
    }
    
    if (detectedBrand) {
      return { 
        type: 'brand_products', 
        confidence: 0.8,
        brand: detectedBrand
      };
    }
    
    // چک کردن محصول خاص
    const specificProductKeywords = [
      'بلیچینگ', 'خمیردندان', 'سفیدکننده', 'دهان', 'دندان',
      'کلاژن', 'امگا', 'پوست', 'لیفتینگ', 'آبرسان',
      'میسلار', 'پاک‌کننده', 'دستمال', 'مرطوب',
      'دئودورانت', 'عطر', 'بو',
      'ضدآفتاب', 'سنتلا', 'آفتاب'
    ];
    
    const hasSpecificProduct = specificProductKeywords.some(keyword =>
      normalized.includes(keyword)
    );
    
    if (hasSpecificProduct) {
      return { type: 'specific_product', confidence: 0.85 };
    }
    
    // درخواست محصول (کلی)
    if (normalized.includes('قیمت') || 
        normalized.includes('محصول') ||
        normalized.includes('چند') ||
        normalized.includes('چقدر') ||
        normalized.includes('لینک') ||
        normalized.includes('همشونو') ||
        normalized.includes('همه')) {
      return { type: 'product_query', confidence: 0.7 };
    }
    
    return { type: 'unknown', confidence: 0 };
  }
}

// ========================================
// PRODUCT HANDLER
// ========================================

class ProductHandler {
  constructor(page, userContextManager, cardSender) {
    this.page = page;
    this.userContextManager = userContextManager;
    this.cardSender = cardSender;
  }
  
  // هندل کردن درخواست محصول
  async handleProductRequest(username, message, conversationHistory) {
    const intent = ProductIntentDetector.detectIntent(message, conversationHistory);
    const productState = this.userContextManager.getProductState(username);
    
    console.log(`🎯 [${username}] Intent: ${intent.type} (confidence: ${intent.confidence})`);
    if (intent.brand) {
      console.log(`🏷️ Detected brand: ${intent.brand}`);
    }
    
    // اگر کاربر "بیشتر" خواست
    if (intent.type === 'more_products' && productState.hasMoreProducts) {
      return await this.sendMoreProducts(username, productState);
    }
    
    // اگر برند کلی خواست (برای همه برندها)
    if (intent.type === 'brand_products') {
      // استفاده از برند تشخیص داده شده یا استخراج از context
      const brand = intent.brand || extractBrandFromText(message, conversationHistory);
      return await this.handleBrandProducts(username, message, conversationHistory, brand);
    }
    
    // اگر محصول خاص خواست
    if (intent.type === 'specific_product') {
      return await this.handleSpecificProduct(username, message, conversationHistory);
    }
    
    // درخواست کلی محصول
    if (intent.type === 'product_query') {
      return await this.handleProductQuery(username, message, conversationHistory);
    }
    
    return null;
  }
  
  // هندل کردن برند کلی (برای همه برندها)
  async handleBrandProducts(username, message, conversationHistory, detectedBrand = null) {
    console.log(`🏷️ [${username}] Handling brand products request...`);
    
    // استخراج برند (از intent یا context)
    let brand = detectedBrand;
    if (!brand) {
      brand = extractBrandFromText(message, conversationHistory);
    }
    
    if (!brand) {
      console.log(`⚠️ [${username}] Could not extract brand`);
      return null;
    }
    
    // اعتبارسنجی برند (باید یکی از 6 برند مجاز باشد)
    const isValidBrand = Object.keys(ALL_BRANDS_MAP).includes(brand);
    if (!isValidBrand) {
      console.log(`⚠️ [${username}] Invalid brand: ${brand}`);
      return null;
    }
    
    console.log(`✅ [${username}] Valid brand detected: ${brand}`);
    
    // جستجوی محصولات برند
    const products = searchProduct(brand, brand, conversationHistory);
    
    if (!products || products.length === 0) {
      console.log(`❌ [${username}] No products found for brand: ${brand}`);
      return null;
    }
    
    console.log(`📦 [${username}] Found ${products.length} products for ${brand}`);
    
    // فیلتر محصولات با کیفیت
    const qualityProducts = products.filter(p => {
      const hasGoodMatch = p.matchType === 'exact-brand' || 
                          p.matchType === 'brand-name' ||
                          (p.similarity && p.similarity > 0.6);
      const hasValidUrl = p.productUrl && 
                         (p.productUrl.startsWith('http://') || 
                          p.productUrl.startsWith('https://'));
      return hasGoodMatch && hasValidUrl;
    });
    
    if (qualityProducts.length === 0) {
      console.log(`⚠️ [${username}] No quality products found`);
      return null;
    }
    
    console.log(`✅ [${username}] ${qualityProducts.length} quality products found`);
    
    // ذخیره state
    this.userContextManager.saveProductSearchState(
      username,
      brand,
      qualityProducts,
      brand,
      0
    );
    
    // ارسال 3 کارت اول
    const productsToShow = qualityProducts.slice(0, 3);
    const hasMore = qualityProducts.length > 3;
    
    console.log(`📤 [${username}] Preparing to send ${productsToShow.length} product cards...`);
    console.log(`📤 [${username}] Products to send:`, productsToShow.map(p => p.name));
    
    const result = await this.cardSender.sendMultipleProductCards(
      this.page,
      username,
      productsToShow.map(p => ({
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        brand: p.brand || brand,
        productUrl: p.productUrl
      }))
    );
    
    console.log(`📤 [${username}] Card send result:`, result);
    
    if (result.success) {
      // به‌روزرسانی state
      this.userContextManager.saveProductSearchState(
        username,
        brand,
        qualityProducts,
        brand,
        3
      );
      
      // پیام follow-up
      let followUpMessage = `✅ ${productsToShow.length} محصول ${brand} رو برات فرستادم`;
      
      if (hasMore) {
        const remaining = qualityProducts.length - 3;
        followUpMessage += `\n\n📦 ${remaining} محصول دیگه هم داریم!`;
        followUpMessage += `\nاگر می‌خوای بقیه رو ببینی، بگو "بیشتر" 👇`;
      }
      
      return {
        success: true,
        message: followUpMessage,
        productsShown: productsToShow.length,
        hasMore: hasMore,
        totalProducts: qualityProducts.length,
        brand: brand
      };
    } else {
      console.error(`❌ [${username}] Failed to send product cards. Error:`, result.error);
    }
    
    return null;
  }
  
  // ارسال محصولات بیشتر (برای همه برندها)
  async sendMoreProducts(username, productState) {
    console.log(`📦 [${username}] Sending more products for brand: ${productState.lastSearchBrand}`);
    
    const remainingProducts = productState.lastSearchResults.slice(
      productState.lastShownIndex
    );
    
    if (remainingProducts.length === 0) {
      this.userContextManager.resetProductState(username);
      return {
        success: false,
        message: 'دیگه محصولی باقی نمونده! 😊'
      };
    }
    
    // ارسال 3 تا بعدی (یا همه اگر کمتر از 3 تا)
    const productsToShow = remainingProducts.slice(0, 3);
    const newShownIndex = productState.lastShownIndex + productsToShow.length;
    const hasMore = productState.lastSearchResults.length > newShownIndex;
    
    const result = await this.cardSender.sendMultipleProductCards(
      this.page,
      username,
      productsToShow.map(p => ({
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        brand: p.brand || productState.lastSearchBrand,
        productUrl: p.productUrl
      }))
    );
    
    if (result.success) {
      // به‌روزرسانی state
      this.userContextManager.saveProductSearchState(
        username,
        productState.lastSearchQuery,
        productState.lastSearchResults,
        productState.lastSearchBrand,
        newShownIndex
      );
      
      let followUpMessage = `✅ ${productsToShow.length} محصول دیگه ${productState.lastSearchBrand} رو هم فرستادم`;
      
      if (hasMore) {
        const remaining = productState.lastSearchResults.length - newShownIndex;
        followUpMessage += `\n\n📦 ${remaining} محصول دیگه هم هست!`;
        followUpMessage += `\nبگو "بیشتر" برای بقیه 👇`;
      } else {
        followUpMessage += `\n\n✅ همه محصولات ${productState.lastSearchBrand} رو برات فرستادم!`;
        // ریست state
        this.userContextManager.resetProductState(username);
      }
      
      return {
        success: true,
        message: followUpMessage,
        productsShown: productsToShow.length,
        hasMore: hasMore,
        brand: productState.lastSearchBrand
      };
    }
    
    return null;
  }
  
  // هندل کردن محصول خاص
  async handleSpecificProduct(username, message, conversationHistory) {
    console.log(`🔍 [${username}] Handling specific product request...`);
    
    // استخراج برند از context
    const brand = extractBrandFromText(message, conversationHistory);
    
    // جستجوی محصول
    const products = searchProduct(message, brand, conversationHistory);
    
    if (!products || products.length === 0) {
      return null;
    }
    
    // فقط محصولات با کیفیت بالا
    const qualityProducts = products.filter(p => {
      const hasGoodMatch = p.matchType === 'exact-name' ||
                          p.matchType === 'exact-brand' ||
                          p.matchType === 'brand-name' ||
                          (p.similarity && p.similarity > 0.6);
      const hasValidUrl = p.productUrl && 
                         (p.productUrl.startsWith('http://') || 
                          p.productUrl.startsWith('https://'));
      return hasGoodMatch && hasValidUrl;
    });
    
    if (qualityProducts.length === 0) {
      return null;
    }
    
    // فقط اولین محصول (محصول خاص)
    const product = qualityProducts[0];
    
    console.log(`✅ [${username}] Found specific product: ${product.name} (${product.brand})`);
    
    // ارسال کارت تک محصول
    const result = await this.cardSender.sendProductCard(
      this.page,
      username,
      {
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        brand: product.brand,
        productUrl: product.productUrl
      },
      false // use Rich Text
    );
    
    if (result.success) {
      // ریست state (چون محصول خاص بود)
      this.userContextManager.resetProductState(username);
      
      return {
        success: true,
        message: `✅ محصول ${product.name} رو برات فرستادم`,
        product: product
      };
    }
    
    return null;
  }
  
  // هندل کردن درخواست کلی محصول
  async handleProductQuery(username, message, conversationHistory) {
    console.log(`🔍 [${username}] Handling general product query...`);
    
    const brand = extractBrandFromText(message, conversationHistory);
    const products = searchProduct(message, brand, conversationHistory);
    
    if (!products || products.length === 0) {
      return null;
    }
    
    const qualityProducts = products.filter(p => {
      const hasGoodMatch = p.matchType === 'exact-name' ||
                          p.matchType === 'exact-brand' ||
                          p.matchType === 'brand-name' ||
                          (p.similarity && p.similarity > 0.6);
      const hasValidUrl = p.productUrl && 
                         (p.productUrl.startsWith('http://') || 
                          p.productUrl.startsWith('https://'));
      return hasGoodMatch && hasValidUrl;
    });
    
    if (qualityProducts.length === 0) {
      return null;
    }
    
    // اگر فقط یک محصول پیدا شد، به صورت خاص ارسال کن
    if (qualityProducts.length === 1) {
      return await this.handleSpecificProduct(username, message, conversationHistory);
    }
    
    // اگر چند محصول پیدا شد و برند مشخص بود، 3 تا اول رو نشون بده
    if (brand) {
      return await this.handleBrandProducts(username, message, conversationHistory, brand);
    }
    
    // اگر برند مشخص نبود، فقط اولین محصول رو نشون بده
    return await this.handleSpecificProduct(username, message, conversationHistory);
  }
}

module.exports = {
  ProductHandler,
  ProductIntentDetector
};

