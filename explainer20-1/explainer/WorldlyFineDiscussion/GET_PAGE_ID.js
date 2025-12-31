// Script to get Page ID from Page Access Token
// Run: node GET_PAGE_ID.js

const fetch = require('node-fetch');

// Paste your Page Access Token here
const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || 'EAAcf8NsupJgBQb8GpjkuyzF4EZAbDn0mqaf3SPsa8pfsyJ2hcZB7FkZAxHGqd1QmzFl7P4TxDl1u9chkfARJ6MqjcyHLZCn9iNA7VhPZA4Y6b8FVxS34R9qkf6UCBt0r5AAAEZCCu6povj7srTnCM8T2sZAz55zZBbe6rGowwqgO0snZC7U1VrQ6ZCQa4qnVGuVPG2TcbirZCT8YMxxyZAHJar9wHZA3WqZAg2EQjdaLeUZBFBtx4J4myCbT04ZAXi4hljYSQSz65kCsGl03lAioGAFjWodxLnVuZCQZDZD';

async function getPageInfo() {
  try {
    // Get page info
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${PAGE_ACCESS_TOKEN}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error:', data.error);
      return;
    }
    
    console.log('\n✅ Page Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Page ID: ${data.id}`);
    console.log(`Page Name: ${data.name || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📝 Add these to your .env file:');
    console.log(`INSTAGRAM_PAGE_ACCESS_TOKEN=${PAGE_ACCESS_TOKEN}`);
    console.log(`INSTAGRAM_PAGE_ID=${data.id}`);
    console.log(`WEBHOOK_VERIFY_TOKEN=luxirana_webhook_2024\n`);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching page info:', error.message);
  }
}

getPageInfo();

