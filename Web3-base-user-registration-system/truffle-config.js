/**
 * Use this file to configure your Truffle project. It's set up to connect
 * to the Ganache development network by default.
 */

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost
      port: 7545,            // Standard Ganache port
      network_id: "5777",       // Any network ID
    },
    // You can add more network configurations here
  },

  // Set default mocha options here, use special reporters, etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0",    // Fetch exact version from solc-bin
    },
  },
};
