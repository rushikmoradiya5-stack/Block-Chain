export default {
  solidity: "0.8.0",
  networks: {
    ganache: {
      type: "http",
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },
  },
  paths: {
    sources: "./Web3-base-user-registration-system/contracts",
    tests: "./Web3-base-user-registration-system/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
