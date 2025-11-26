const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Seylane Production Environment...\n');

// Start the bot in background
const botProcess = spawn('node', ['main.js'], {
  cwd: path.join(__dirname, 'explainer20-1/explainer/WorldlyFineDiscussion'),
  stdio: 'inherit'
});

// Start the API server in foreground (needed for port exposure)
const apiProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'explainer-api'),
  stdio: 'inherit'
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down...');
  botProcess.kill();
  apiProcess.kill();
  process.exit(0);
});
