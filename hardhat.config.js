require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * ============================================================
 * VOTEGUARD - HARDHAT CONFIGURATION (MULTI-PROVIDER SUPPORT)
 * ============================================================
 * 
 * CRITICAL FOR TEAM SYNC:
 * - ALWAYS deploy to 'sepolia' network
 * - NEVER deploy to 'localhost' when working with your team
 * - Use the SAME CONTRACT_ADDRESS across all team members
 * 
 * REQUIRED ENVIRONMENT VARIABLES (.env):
 * - BLOCKCHAIN_PROVIDER: 'alchemy' or 'gcp' (default: gcp)
 * - GCP_BLOCKCHAIN_ENDPOINT: GCP RPC endpoint (if using GCP)
 * - ALCHEMY_API_KEY: Your Alchemy API key (if using Alchemy)
 * - SEPOLIA_PRIVATE_KEY: Your wallet's private key (without 0x)
 * - ETHERSCAN_API_KEY: (Optional) For contract verification
 * 
 * ============================================================
 */

// Helper function to get RPC URL based on provider
function getRpcUrl() {
    const provider = process.env.BLOCKCHAIN_PROVIDER || 'gcp';

    if (provider === 'gcp') {
        const gcpEndpoint = process.env.GCP_BLOCKCHAIN_ENDPOINT;
        if (gcpEndpoint) {
            return gcpEndpoint;
        }
        console.warn('⚠️  GCP_BLOCKCHAIN_ENDPOINT not set, using Alchemy as fallback');
    }

    // Fallback to Alchemy or if explicitly set
    if (provider === 'alchemy' || !process.env.GCP_BLOCKCHAIN_ENDPOINT) {
        const alchemyKey = process.env.ALCHEMY_API_KEY;
        if (alchemyKey) {
            return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
        }
    }

    return "";
}

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
            url: getRpcUrl(),
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

