require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Hardhat Configuration for VoteGuard Blockchain
 * 
 * NETWORKS SUPPORTED:
 * - localhost: For instant local testing (run: npx hardhat node)
 * - sepolia: Free Ethereum testnet using Alchemy
 * 
 * ENVIRONMENT VARIABLES REQUIRED (.env file):
 * - ALCHEMY_API_KEY: Get free key from https://www.alchemy.com/
 * - SEPOLIA_PRIVATE_KEY: Your wallet's private key (NEVER commit this!)
 * - ETHERSCAN_API_KEY: (Optional) For contract verification
 */

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200, // Optimize for deployment cost vs execution cost
            },
        },
    },

    networks: {
        // Local development network (instant & free)
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
            // Hardhat provides 20 test accounts automatically
        },

        // Sepolia testnet (free Ethereum testnet)
        sepolia: {
            url: process.env.ALCHEMY_API_KEY
                ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
                : "",
            accounts: process.env.SEPOLIA_PRIVATE_KEY
                ? [process.env.SEPOLIA_PRIVATE_KEY]
                : [],
            chainId: 11155111,
            gasPrice: "auto",
        },

        // Optional: Add more networks as needed
        // amoy: { // Polygon testnet
        //   url: `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        //   accounts: [process.env.SEPOLIA_PRIVATE_KEY],
        //   chainId: 80002,
        // },
    },

    // Etherscan verification (optional but recommended)
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || "",
    },

    // Gas reporting (useful for optimization)
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },

    // Path configuration
    paths: {
        sources: "./contracts",
        tests: "./blockchain-tests",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
