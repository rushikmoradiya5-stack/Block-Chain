const http = require('http');

const target = process.argv[2];
if (!target || !target.startsWith('0x')) {
  console.log('Usage: node fund.cjs <0xYourMetaMaskAddress>');
  process.exit(1);
}

const payload = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_sendTransaction',
  params: [
    {
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: target,
      value: '0x2b5e3af16b1880000', // 50 ETH
    },
  ],
  id: 1,
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 7545,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`Successfully sent 50 ETH to ${target}!`);
      console.log('Tx details:', data);
    });
  }
);

req.on('error', (e) => console.error('Error funding account:', e.message));
req.write(payload);
req.end();
