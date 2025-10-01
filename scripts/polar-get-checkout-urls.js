#!/usr/bin/env node
/**
 * Polar Checkout URL Fetcher
 * Fetches your Polar product checkout URLs from the API
 *
 * Usage: node scripts/polar-get-checkout-urls.js
 */

const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load env from .env.local
async function loadEnv() {
  try {
    const { stdout } = await execPromise('grep "POLAR_API_KEY" .env.local');
    const match = stdout.match(/POLAR_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
}

function makeRequest(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.polar.sh',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Fetching Polar products and checkout URLs...\n');

  const apiKey = await loadEnv();
  if (!apiKey) {
    console.error('❌ POLAR_API_KEY not found in .env.local');
    process.exit(1);
  }

  try {
    // Fetch products
    const productsData = await makeRequest('/v1/products', apiKey);

    if (!productsData.items || productsData.items.length === 0) {
      console.log('⚠️  No products found in your Polar account');
      return;
    }

    console.log(`✅ Found ${productsData.items.length} product(s):\n`);

    const envUpdates = [];

    for (const product of productsData.items) {
      console.log(`📦 Product: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description || 'N/A'}`);

      if (product.prices && product.prices.length > 0) {
        console.log(`   Prices:`);

        for (const price of product.prices) {
          const amount = (price.price_amount / 100).toFixed(2);
          const interval = price.recurring_interval || 'one-time';
          console.log(`     - $${amount} ${price.price_currency} / ${interval}`);
          console.log(`       Price ID: ${price.id}`);

          // Generate checkout URL
          const checkoutUrl = `https://polar.sh/checkout/${price.id}`;
          console.log(`       Checkout URL: ${checkoutUrl}`);

          // Suggest env var name based on interval
          if (interval === 'month') {
            envUpdates.push(`POLAR_PRICE_PRO_MONTHLY=${price.id}`);
            envUpdates.push(`POLAR_CHECKOUT_URL_PRO_MONTHLY=${checkoutUrl}`);
          } else if (interval === 'year') {
            envUpdates.push(`POLAR_PRICE_PRO_YEARLY=${price.id}`);
            envUpdates.push(`POLAR_CHECKOUT_URL_PRO_YEARLY=${checkoutUrl}`);
          }
        }
      }

      console.log('');
    }

    if (envUpdates.length > 0) {
      console.log('\n📝 Add these to your .env.local:\n');
      console.log('─'.repeat(80));
      envUpdates.forEach(line => console.log(line));
      console.log('─'.repeat(80));
    }

    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Error fetching Polar data:');
    console.error(error.message);

    if (error.message.includes('401')) {
      console.error('\n💡 Your POLAR_API_KEY might be invalid or expired.');
      console.error('   Get a new one from: https://polar.sh/dashboard/settings');
    }
  }
}

main();
