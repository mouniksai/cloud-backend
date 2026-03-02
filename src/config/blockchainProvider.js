// src/config/blockchainProvider.js
// Blockchain RPC Provider Configuration
// Supports multiple providers: Alchemy, GCP Blockchain Node Engine, etc.

require('dotenv').config();

/**
 * ============================================================
 * BLOCKCHAIN PROVIDER CONFIGURATION
 * ============================================================
 * 
 * Supports multiple RPC providers with a unified interface:
 * - alchemy: Alchemy API (legacy)
 * - gcp: Google Cloud Platform Blockchain Node Engine
 * 
 * Set BLOCKCHAIN_PROVIDER in .env to choose provider
 * ============================================================
 */

class BlockchainProviderConfig {
    constructor() {
        this.provider = process.env.BLOCKCHAIN_PROVIDER || 'gcp'; // Default to GCP
        this.network = process.env.BLOCKCHAIN_NETWORK || 'sepolia';
    }

    /**
     * Get the RPC URL for the configured provider
     * @returns {string} - RPC endpoint URL
     */
    getRpcUrl() {
        switch (this.provider.toLowerCase()) {
            case 'alchemy':
                return this._getAlchemyUrl();

            case 'gcp':
                return this._getGcpUrl();

            default:
                throw new Error(
                    `❌ UNSUPPORTED PROVIDER: ${this.provider}\n` +
                    `   Supported providers: alchemy, gcp\n` +
                    `   Set BLOCKCHAIN_PROVIDER in your .env file`
                );
        }
    }

    /**
     * Get Alchemy RPC URL (legacy)
     * @private
     */
    _getAlchemyUrl() {
        const alchemyKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyKey) {
            throw new Error(
                '❌ ALCHEMY_API_KEY not set in .env\n' +
                '   Get your free API key from: https://dashboard.alchemy.com/'
            );
        }

        const networkUrls = {
            sepolia: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
            mainnet: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        };

        const url = networkUrls[this.network];
        if (!url) {
            throw new Error(`❌ Unsupported network for Alchemy: ${this.network}`);
        }

        return url;
    }

    /**
     * Get GCP Blockchain Node Engine URL
     * @private
     */
    _getGcpUrl() {
        const gcpEndpoint = process.env.GCP_BLOCKCHAIN_ENDPOINT;
        const gcpApiKey = process.env.GCP_API_KEY;

        // If full endpoint URL is provided (includes API key)
        if (gcpEndpoint && gcpEndpoint.includes('?key=')) {
            return gcpEndpoint;
        }

        // If endpoint and API key are separate
        if (gcpEndpoint && gcpApiKey) {
            return `${gcpEndpoint}?key=${gcpApiKey}`;
        }

        // Use default configuration if available
        if (!gcpEndpoint && !gcpApiKey) {
            throw new Error(
                '❌ GCP_BLOCKCHAIN_ENDPOINT not set in .env\n' +
                '   Format: https://blockchain.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/endpoints/ENDPOINT_NAME/rpc?key=API_KEY\n' +
                '   OR set GCP_BLOCKCHAIN_ENDPOINT and GCP_API_KEY separately'
            );
        }

        throw new Error('❌ Incomplete GCP configuration. Set GCP_BLOCKCHAIN_ENDPOINT with API key.');
    }

    /**
     * Get provider name for display
     * @returns {string}
     */
    getProviderName() {
        const providers = {
            alchemy: 'Alchemy',
            gcp: 'GCP Blockchain Node Engine',
        };
        return providers[this.provider.toLowerCase()] || this.provider;
    }

    /**
     * Get network name for display
     * @returns {string}
     */
    getNetworkName() {
        const networks = {
            sepolia: 'Sepolia Testnet',
            mainnet: 'Ethereum Mainnet',
        };
        return networks[this.network] || this.network;
    }

    /**
     * Get chain ID for the network
     * @returns {number}
     */
    getChainId() {
        const chainIds = {
            sepolia: 11155111,
            mainnet: 1,
        };
        return chainIds[this.network] || null;
    }

    /**
     * Get block explorer URL
     * @returns {string}
     */
    getExplorerUrl() {
        const explorers = {
            sepolia: 'https://sepolia.etherscan.io',
            mainnet: 'https://etherscan.io',
        };
        return explorers[this.network] || '';
    }

    /**
     * Validate provider configuration
     * @throws {Error} if configuration is invalid
     */
    validate() {
        try {
            const url = this.getRpcUrl();
            console.log(`✅ Provider Configuration Valid`);
            console.log(`├─ Provider: ${this.getProviderName()}`);
            console.log(`├─ Network: ${this.getNetworkName()} (Chain ID: ${this.getChainId()})`);
            console.log(`└─ RPC URL: ${this._maskUrl(url)}`);
            return true;
        } catch (error) {
            console.error('❌ Provider Configuration Invalid:', error.message);
            throw error;
        }
    }

    /**
     * Mask sensitive parts of URL for logging
     * @private
     */
    _maskUrl(url) {
        // Mask API keys in URL
        return url.replace(/key=[^&\s]+/, 'key=***MASKED***')
            .replace(/\/v2\/[^/\s]+/, '/v2/***MASKED***');
    }
}

// Export singleton instance
module.exports = new BlockchainProviderConfig();
