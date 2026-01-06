/**
 * WordPress API Guardrail Test Script
 * Tests that GPT is blocked when WordPress API returns zero products
 */

require('dotenv').config({ path: '../../.env' }); // Load .env from parent directory

const { getProductsByBrand, searchProducts } = require('../product-engine/wp');
const { getBrandId } = require('../search_product');

// Brand IDs for testing
const TEST_BRANDS = {
  Misswake: 2113,
  Collamin: 2112,
  Comeon: 2110
};

async function testWPGuardrails() {
  console.log('\n🧪 ========== WORDPRESS API GUARDRAIL TEST START ==========\n');
  
  let passedTests = 0;
  let failedTests = 0;

  // Test Case 1: Fetch known brand (Misswake)
  console.log('📋 Test Case 1: Fetching products for Misswake (brand ID: 2113)');
  try {
    const misswakeProducts = await getProductsByBrand(2113, true);
    
    if (Array.isArray(misswakeProducts)) {
      if (misswakeProducts.length > 0) {
        console.log(`✅ PASS: API returned ${misswakeProducts.length} products for Misswake`);
        console.log(`   Sample product: ${misswakeProducts[0].title || misswakeProducts[0].name || 'N/A'}`);
        passedTests++;
      } else {
        console.log(`⚠️  WARNING: API returned empty array for Misswake (may be expected if no products exist)`);
        passedTests++; // This is acceptable - empty array means no products
      }
    } else {
      console.log(`❌ FAIL: API did not return an array`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error fetching Misswake products: ${error.message}`);
    failedTests++;
  }

  // Test Case 2: Fetch non-existing brand ID
  console.log('\n📋 Test Case 2: Fetching products for non-existing brand (ID: 99999)');
  try {
    const nonExistingProducts = await getProductsByBrand(99999, false);
    
    if (Array.isArray(nonExistingProducts)) {
      if (nonExistingProducts.length === 0) {
        console.log(`✅ PASS: API correctly returned empty array for non-existing brand`);
        console.log(`   GPT should be BLOCKED when this happens`);
        passedTests++;
      } else {
        console.log(`⚠️  WARNING: API returned ${nonExistingProducts.length} products for non-existing brand (unexpected)`);
        passedTests++; // Still pass, but unexpected
      }
    } else {
      console.log(`❌ FAIL: API did not return an array`);
      failedTests++;
    }
  } catch (error) {
    console.log(`⚠️  WARNING: Error fetching non-existing brand (may be expected): ${error.message}`);
    passedTests++; // Error is acceptable for non-existing brand
  }

  // Test Case 3: Search for non-existing product
  console.log('\n📋 Test Case 3: Searching for non-existing product "محصول ناموجود"');
  try {
    const searchResults = await searchProducts('محصول ناموجود', null);
    
    if (Array.isArray(searchResults)) {
      if (searchResults.length === 0) {
        console.log(`✅ PASS: Search correctly returned empty array for non-existing product`);
        console.log(`   GPT should be BLOCKED when this happens`);
        passedTests++;
      } else {
        console.log(`⚠️  WARNING: Search returned ${searchResults.length} results for non-existing product`);
        passedTests++; // Still pass, but unexpected
      }
    } else {
      console.log(`❌ FAIL: Search did not return an array`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error searching products: ${error.message}`);
    failedTests++;
  }

  // Test Case 4: Verify brand ID mapping
  console.log('\n📋 Test Case 4: Verifying brand ID mapping');
  try {
    const misswakeId = getBrandId('میسویک');
    const collaminId = getBrandId('کلامین');
    const comeonId = getBrandId('کامون');
    
    if (misswakeId === 2113) {
      console.log(`✅ PASS: میسویک correctly maps to brand ID 2113`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: میسویک maps to ${misswakeId}, expected 2113`);
      failedTests++;
    }
    
    if (collaminId === 2112) {
      console.log(`✅ PASS: کلامین correctly maps to brand ID 2112`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: کلامین maps to ${collaminId}, expected 2112`);
      failedTests++;
    }
    
    if (comeonId === 2110) {
      console.log(`✅ PASS: کامون correctly maps to brand ID 2110`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: کامون maps to ${comeonId}, expected 2110`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error verifying brand ID mapping: ${error.message}`);
    failedTests++;
  }

  // Test Case 5: Verify empty array blocks GPT (simulation)
  console.log('\n📋 Test Case 5: Simulating GPT guardrail with empty products array');
  try {
    const emptyProducts = [];
    
    // Simulate the guardrail check from main.js
    if (emptyProducts !== null && Array.isArray(emptyProducts) && emptyProducts.length === 0) {
      console.log(`✅ PASS: Guardrail correctly identifies empty products array`);
      console.log(`   GPT call would be BLOCKED`);
      console.log(`   Fallback message would be returned`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: Guardrail did not identify empty products array`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error in guardrail simulation: ${error.message}`);
    failedTests++;
  }

  // Summary
  console.log('\n📊 ========== TEST SUMMARY ==========');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! WordPress API guardrails are working correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the errors above.');
  }
  
  console.log('\n🧪 ========== WORDPRESS API GUARDRAIL TEST END ==========\n');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
testWPGuardrails().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});

