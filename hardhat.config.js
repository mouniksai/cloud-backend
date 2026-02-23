require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * ============================================================
 * VOTEGUARD - HARDHAT CONFIGURATION (SEPOLIA-FIRST)
 * ============================================================
 * 
 * CRITICAL FOR TEAM SYNC:
 * - ALWAYS deploy to 'sepolia' network
 * - NEVER deploy to 'localhost' when working with your team
 * - Use the SAME CONTRACT_ADDRESS across all team members
 * 
 * REQUIRED ENVIRONMENT VARIABLES (.env):
 * - ALCHEMY_API_KEY: Your Alchemy API key (free tier)
 * - SEPOLIA_PRIVATE_KEY: Your wallet's private key (without 0x)
 * - ETHERSCAN_API_KEY: (Optional) For contract verification
 * 
 * Get started: https://dashboard.alchemy.com/
 * ============================================================
 */

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },

    networks: {
        // ========================================================
        // PRODUCTION NETWORK: SEPOLIA TESTNET
        // ========================================================
        // This is your team's "source of truth"
        // Deploy here once, everyone connects to same contract
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

        // ========================================================
        // LOCAL NETWORK (DISABLED FOR TEAM WORK)
        // ========================================================
        // Uncomment ONLY if you need to test contract logic locally
        // WARNING: Any data here will NOT sync with your team!
        // 
        // localhost: {
        //     url: "http://127.0.0.1:8545",
        //     chainId: 31337,
        // },
    },

    // Etherscan verification (optional but recommended)
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
        },
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

