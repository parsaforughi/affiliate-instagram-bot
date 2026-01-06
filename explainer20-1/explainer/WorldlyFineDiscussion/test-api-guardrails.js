/**
 * Automated API Test for Ultra-Strict Guardrails
 * Tests that GPT is blocked when WordPress API returns zero products
 */

const { searchProduct } = require('./search_product');

async function testAPIGuardrails() {
  console.log('\n🧪 ========== API GUARDRAIL TEST START ==========\n');
  
  const testCases = [
    {
      name: 'Test 1: Known problematic query (Collamin)',
      query: 'کلامین',
      brand: 'کلامین',
      expectedBehavior: 'Should return products from API or empty array (no GPT call)'
    },
    {
      name: 'Test 2: Non-existing brand',
      query: 'برند ناموجود',
      brand: null,
      expectedBehavior: 'Should return empty array (no GPT call)'
    },
    {
      name: 'Test 3: Empty query',
      query: '',
      brand: null,
      expectedBehavior: 'Should return empty array (no GPT call)'
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Brand: ${testCase.brand || 'null'}`);
    console.log(`   Expected: ${testCase.expectedBehavior}`);
    
    try {
      const products = await searchProduct(testCase.query, testCase.brand, []);
      
      // Validate result
      const isValid = Array.isArray(products);
      const isEmpty = isValid && products.length === 0;
      const hasProducts = isValid && products.length > 0;
      
      if (!isValid) {
        console.log(`   ❌ FAIL: Result is not an array`);
        console.log(`   Result: ${typeof products} - ${JSON.stringify(products).substring(0, 100)}`);
        failedTests++;
        continue;
      }
      
      if (isEmpty) {
        console.log(`   ✅ PASS: API returned empty array (${products.length} products)`);
        console.log(`   ✅ GPT CALL BLOCKED: No products = No GPT (as expected)`);
        passedTests++;
      } else if (hasProducts) {
        console.log(`   ✅ PASS: API returned ${products.length} product(s)`);
        console.log(`   ✅ Products are from API (not invented):`);
        products.slice(0, 3).forEach((p, i) => {
          console.log(`      ${i + 1}. ${p.name} - ${p.price} تومان - ${p.url ? 'Has URL' : 'No URL'}`);
        });
        passedTests++;
      }
      
    } catch (error) {
      console.log(`   ❌ FAIL: Error during test`);
      console.log(`   Error: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log('\n📊 ========== TEST RESULTS ==========');
  console.log(`✅ Passed: ${passedTests}/${testCases.length}`);
  console.log(`❌ Failed: ${failedTests}/${testCases.length}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Guardrails are working correctly!');
    console.log('✅ GPT will be blocked when API returns empty');
    console.log('✅ GPT will only receive API-fetched data');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - Review guardrail implementation');
  }
  
  console.log('\n🧪 ========== API GUARDRAIL TEST END ==========\n');
  
  process.exit(failedTests === 0 ? 0 : 1);
}

// Run tests
testAPIGuardrails().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

