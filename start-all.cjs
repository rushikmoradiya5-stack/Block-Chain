const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('====================================================');
console.log('🚀 Starting Full Web3 StaffChain Development Stack');
console.log('====================================================\n');

// 1. Start Ganache on Port 7545
console.log('Starting Ganache on http://127.0.0.1:7545 (Chain ID: 1337, Network ID: 5777)...');
const ganacheCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const ganache = spawn(
  ganacheCmd,
  [
    'ganache',
    '--port', '7545',
    '--chain.networkId', '5777',
    '--chain.chainId', '1337',
    '--wallet.mnemonic', 'test test test test test test test test test test test junk',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: true }
);

ganache.stdout.on('data', (d) => {
  const str = d.toString();
  if (str.includes('RPC Listening on') || str.includes('127.0.0.1:7545')) {
    console.log('✅ Ganache is ready and listening on http://127.0.0.1:7545');
  }
});
ganache.stderr.on('data', () => {});

// 2. Start Port Proxy (8545 -> 7545)
const proxyServer = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 7545,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end('Proxy error: ' + err.message);
  });
  req.pipe(proxyReq, { end: true });
});

proxyServer.listen(8545, '127.0.0.1', () => {
  console.log('✅ Dual-Port RPC Proxy active: 8545 -> 7545');
});

// 3. Start Frontend (lite-server)
console.log('Starting Frontend Lite-Server on http://localhost:3000...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = spawn(
  npmCmd,
  ['--prefix', 'Web3-base-user-registration-system', 'start'],
  { stdio: 'inherit', shell: true }
);

function cleanup() {
  console.log('\nShutting down dev stack...');
  try { ganache.kill(); } catch (e) {}
  try { proxyServer.close(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
