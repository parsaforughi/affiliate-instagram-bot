// Tunnel script to expose local API server to the internet
// This allows Railway dashboard to connect to your local bot

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TUNNEL_TYPE = process.env.TUNNEL_TYPE || 'localtunnel'; // 'localtunnel' or 'ngrok'
const PORT = process.env.API_PORT || 3001;
const TUNNEL_FILE = path.join(__dirname, '.tunnel-url.txt');

console.log('🌐 Starting tunnel for local API server...');
console.log(`   Port: ${PORT}`);
console.log(`   Type: ${TUNNEL_TYPE}\n`);

let tunnelProcess;
let tunnelUrl = null;

if (TUNNEL_TYPE === 'ngrok') {
  // Using ngrok
  console.log('📦 Starting ngrok tunnel...');
  console.log('   Make sure ngrok is installed: npm install -g ngrok');
  console.log('   Or download from: https://ngrok.com/download\n');
  
  tunnelProcess = spawn('ngrok', ['http', PORT.toString()], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  tunnelProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Extract URL from ngrok output
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
    if (urlMatch) {
      tunnelUrl = urlMatch[0];
      console.log(`\n✅ Tunnel URL: ${tunnelUrl}`);
      console.log(`\n📋 Set this in Railway environment variables:`);
      console.log(`   AFFILIATE_BOT_API_URL=${tunnelUrl}\n`);
      
      // Save to file
      fs.writeFileSync(TUNNEL_FILE, tunnelUrl);
    }
  });

  tunnelProcess.stderr.on('data', (data) => {
    console.error(`ngrok error: ${data.toString()}`);
  });

} else {
  // Using localtunnel (default, easier to use)
  console.log('📦 Starting localtunnel...\n');
  
  // Try to use localtunnel CLI (if installed globally)
  const ltProcess = spawn('lt', ['--port', PORT.toString()], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  ltProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Extract URL from localtunnel output
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);
    if (urlMatch) {
      tunnelUrl = urlMatch[0];
      console.log(`\n✅ Tunnel URL: ${tunnelUrl}`);
      console.log(`\n📋 Set this in Railway environment variables:`);
      console.log(`   AFFILIATE_BOT_API_URL=${tunnelUrl}\n`);
      console.log(`\n⚠️  Keep this script running while using the dashboard!\n`);
      
      // Save to file
      fs.writeFileSync(TUNNEL_FILE, tunnelUrl);
    }
  });

  ltProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (error.includes('command not found') || error.includes('not found')) {
      console.error('\n❌ localtunnel not found!\n');
      console.log('💡 Please install localtunnel:');
      console.log('   npm install -g localtunnel');
      console.log('   Then run this script again.\n');
      console.log('   Or use ngrok: TUNNEL_TYPE=ngrok node start-tunnel.js\n');
      process.exit(1);
    } else {
      console.error(`localtunnel: ${error}`);
    }
  });

  ltProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log('\n❌ Tunnel closed. Restart this script to reconnect.');
    }
  });

  tunnelProcess = ltProcess;
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping tunnel...');
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  if (fs.existsSync(TUNNEL_FILE)) {
    fs.unlinkSync(TUNNEL_FILE);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Stopping tunnel...');
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  if (fs.existsSync(TUNNEL_FILE)) {
    fs.unlinkSync(TUNNEL_FILE);
  }
  process.exit(0);
});

