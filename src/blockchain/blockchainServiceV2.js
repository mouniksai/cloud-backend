// src/blockchain/blockchainServiceV2.js
// Smart Contract Integration Service - Sepolia-First (NO LOCAL BLOCKCHAIN!)
// This service connects your app EXCLUSIVELY to Sepolia testnet

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * ============================================================
 * VOTEGUARD BLOCKCHAIN SERVICE - SEPOLIA ONLY
 * ============================================================
 * 
 * CRITICAL: This service ONLY connects to Sepolia testnet
 * - NO local blockchain support (prevents sync issues)
 * - NO blockchain_data.json files (everything on Sepolia)
 * - One contract address for entire team
 * 
 * REQUIRED ENV VARIABLES:
 * - BLOCKCHAIN_NETWORK: Must be 'sepolia'
 * - CONTRACT_ADDRESS: Your deployed contract (0xE08b2c...)
 * - ALCHEMY_API_KEY: Your Alchemy API key
 * - SEPOLIA_PRIVATE_KEY: Your wallet's private key
 * 
 * ============================================================
 */

class BlockchainServiceV2 {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.signer = null;
        this.network = process.env.BLOCKCHAIN_NETWORK || 'sepolia';
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        this.initialized = false;
    }

    /**
     * Initialize connection to Sepolia blockchain
     * Call this once when server starts
     */
    async initialize() {
        try {
            console.log(`\n🔗 Connecting to Sepolia blockchain...`);

            // FORCE Sepolia network only
            if (this.network !== 'sepolia') {
                throw new Error(
                    `❌ INVALID NETWORK: ${this.network}\n` +
                    `   BLOCKCHAIN_NETWORK must be 'sepolia' for team sync!\n` +
                    `   Set BLOCKCHAIN_NETWORK=sepolia in your .env file`
                );
            }

            // Validate required environment variables
            const alchemyKey = process.env.ALCHEMY_API_KEY;
            if (!alchemyKey) {
                throw new Error(
                    '❌ ALCHEMY_API_KEY not set in .env\n' +
                    '   Get your free API key from: https://dashboard.alchemy.com/'
                );
            }

            const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
            if (!privateKey) {
                throw new Error(
                    '❌ SEPOLIA_PRIVATE_KEY not set in .env\n' +
                    '   Export your MetaMask private key (Account Details > Export Private Key)'
                );
            }

            if (!this.contractAddress) {
                throw new Error(
                    '❌ CONTRACT_ADDRESS not set in .env\n' +
                    `   Your team's contract is: 0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2\n` +
                    '   Add this to your .env: CONTRACT_ADDRESS=0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2'
                );
            }

            // Setup Sepolia provider
            this.provider = new ethers.JsonRpcProvider(
                `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
            );

            // Setup signer
            this.signer = new ethers.Wallet(privateKey, this.provider);

            // Load contract ABI
            const contractArtifact = this._loadContractArtifact();
            this.contract = new ethers.Contract(
                this.contractAddress,
                contractArtifact.abi,
                this.signer
            );

            // Verify connection by reading chain length
            const chainLength = await this.contract.chainLength();

            console.log('✅ Connected to Sepolia blockchain');
            console.log(`├─ Network: Sepolia Testnet (Chain ID: 11155111)`);
            console.log(`├─ Contract: ${this.contractAddress}`);
            console.log(`├─ Signer: ${this.signer.address}`);
            console.log(`├─ Chain Length: ${chainLength}`);
            console.log(`└─ Explorer: https://sepolia.etherscan.io/address/${this.contractAddress}\n`);

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Blockchain initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Load contract ABI from Hardhat artifacts
     */
    _loadContractArtifact() {
        const artifactPath = path.join(
            __dirname,
            '..',
            '..',
            'artifacts',
            'contracts',
            'VoteGuardBlockchain.sol',
            'VoteGuardBlockchain.json'
        );

        if (!fs.existsSync(artifactPath)) {
            throw new Error(
                'Contract artifact not found. Run: npx hardhat compile'
            );
        }

        return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    }

    /**
     * Check if service is initialized
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('BlockchainServiceV2 not initialized. Call initialize() first.');
        }
    }

    /**
     * Convert string to bytes32
     */
    _toBytes32(str) {
        if (str.startsWith('0x') && str.length === 66) {
            return str; // Already bytes32
        }
        return ethers.id(str); // Hash the string
    }

    /**
     * Format transaction for response (matches old API)
     */
    _formatTransaction(tx, receipt) {
        return {
            blockIndex: receipt.blockNumber,
            blockHash: receipt.blockHash,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
        };
    }

    // ============================================================
    // ELECTION OPERATIONS
    // ============================================================

    /**
     * Add an election to the blockchain
     * @param {Object} data - { title, description, constituency, startTime, endTime }
     * @returns {Object} - { block, election }
     */
    async addElection(data) {
        this._ensureInitialized();

        const electionId = this._toBytes32(data.id || crypto.randomUUID());
        const startTime = Math.floor(new Date(data.startTime).getTime() / 1000);
        const endTime = Math.floor(new Date(data.endTime).getTime() / 1000);

        const tx = await this.contract.addElection(
            electionId,
            data.title,
            data.description || '',
            data.constituency,
            startTime,
            endTime
        );

        const receipt = await tx.wait();

        return {
            block: this._formatTransaction(tx, receipt),
            election: {
                id: electionId,
                title: data.title,
                description: data.description,
                constituency: data.constituency,
                startTime: data.startTime,
                endTime: data.endTime,
                status: 'UPCOMING',
                createdAt: new Date().toISOString(),
            },
        };
    }

    /**
     * Get all elections from the blockchain
     * @param {Object} filter - { constituency, status }
     * @returns {Array}
     */
    async getElections(filter = {}) {
        this._ensureInitialized();

        const count = await this.contract.getElectionCount();
        const elections = [];

        for (let i = 0; i < count; i++) {
            const electionId = await this.contract.electionIds(i);
            const election = await this.contract.getElection(electionId);

            // Convert timestamps
            const startTime = new Date(Number(election.startTime) * 1000);
            const endTime = new Date(Number(election.endTime) * 1000);
            const now = new Date();

            // Calculate DYNAMIC status based on current time
            let actualStatus;
            if (now < startTime) {
                actualStatus = 'UPCOMING';
            } else if (now >= startTime && now < endTime) {
                actualStatus = 'LIVE';
            } else {
                actualStatus = 'ENDED';
            }

            // Convert to API format
            const electionData = {
                id: electionId,
                title: election.title,
                description: election.description,
                constituency: election.constituency,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                status: actualStatus, // Use dynamically calculated status
                blockchainStatus: ['UPCOMING', 'LIVE', 'ENDED', 'CANCELLED'][election.status], // Original status from blockchain
                createdAt: new Date(Number(election.createdAt) * 1000).toISOString(),
            };

            // Debug logging for status calculation
            if (i === 0) { // Only log first election to avoid spam
                console.log(`📊 Election Status Calculation:
                    Title: ${electionData.title}
                    Current Time: ${now.toISOString()}
                    Start Time: ${startTime.toISOString()}
                    End Time: ${endTime.toISOString()}
                    Calculated Status: ${actualStatus}
                    Blockchain Status: ${electionData.blockchainStatus}`);
            }

            // Apply filters
            if (filter.constituency && electionData.constituency !== filter.constituency) {
                continue;
            }
            if (filter.status && electionData.status !== filter.status) {
                continue;
            }

            elections.push(electionData);
        }

        return elections;
    }

    /**
     * Get a single election by ID
     * @param {string} electionId
     * @returns {Object|null}
     */
    async getElection(electionId) {
        this._ensureInitialized();

        try {
            const id = this._toBytes32(electionId);
            const election = await this.contract.getElection(id);

            if (!election.exists) return null;

            // Convert timestamps
            const startTime = new Date(Number(election.startTime) * 1000);
            const endTime = new Date(Number(election.endTime) * 1000);
            const now = new Date();

            // Calculate DYNAMIC status based on current time
            let actualStatus;
            if (now < startTime) {
                actualStatus = 'UPCOMING';
            } else if (now >= startTime && now < endTime) {
                actualStatus = 'LIVE';
            } else {
                actualStatus = 'ENDED';
            }

            return {
                id: id,
                title: election.title,
                description: election.description,
                constituency: election.constituency,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                status: actualStatus, // Use dynamically calculated status
                blockchainStatus: ['UPCOMING', 'LIVE', 'ENDED', 'CANCELLED'][election.status], // Original status from blockchain
                createdAt: new Date(Number(election.createdAt) * 1000).toISOString(),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Update election status
     * @param {string} electionId
     * @param {string} newStatus - 'LIVE', 'ENDED', 'CANCELLED'
     * @returns {Object}
     */
    async updateElectionStatus(electionId, newStatus) {
        this._ensureInitialized();

        const statusMap = { UPCOMING: 0, LIVE: 1, ENDED: 2, CANCELLED: 3 };
        const id = this._toBytes32(electionId);

        const tx = await this.contract.updateElectionStatus(
            id,
            statusMap[newStatus]
        );
        const receipt = await tx.wait();

        return { block: this._formatTransaction(tx, receipt) };
    }

    // ============================================================
    // CANDIDATE OPERATIONS
    // ============================================================

    /**
     * Add a candidate to the blockchain
     * @param {Object} data - { name, party, symbol, age, education, experience, electionId }
     * @returns {Object} - { block, candidate }
     */
    async addCandidate(data) {
        this._ensureInitialized();

        const candidateId = this._toBytes32(data.id || crypto.randomUUID());
        const electionId = this._toBytes32(data.electionId);

        const tx = await this.contract.addCandidate(
            candidateId,
            data.name,
            data.party,
            data.symbol || '',
            parseInt(data.age),
            data.education || '',
            data.experience || '',
            electionId
        );

        const receipt = await tx.wait();

        return {
            block: this._formatTransaction(tx, receipt),
            candidate: {
                id: candidateId,
                name: data.name,
                party: data.party,
                symbol: data.symbol,
                age: data.age,
                education: data.education,
                experience: data.experience,
                electionId: data.electionId,
                createdAt: new Date().toISOString(),
            },
        };
    }

    /**
     * Get candidates for an election
     * @param {string} electionId
     * @returns {Array}
     */
    async getCandidatesByElection(electionId) {
        this._ensureInitialized();

        const id = this._toBytes32(electionId);
        const candidateIds = await this.contract.getCandidatesByElection(id);
        const candidates = [];

        for (const candidateId of candidateIds) {
            const candidate = await this.contract.getCandidate(candidateId);

            // Get vote count for this candidate
            const voteCount = await this.getCandidateVoteCount(candidateId);

            candidates.push({
                id: candidateId,
                name: candidate.name,
                party: candidate.party,
                symbol: candidate.symbol,
                age: Number(candidate.age), // Convert BigInt to Number
                education: candidate.education,
                experience: candidate.experience,
                electionId: id,
                voteCount: voteCount, // Include vote count
                createdAt: new Date(Number(candidate.createdAt) * 1000).toISOString(),
            });
        }

        return candidates;
    }

    // ============================================================
    // VOTE OPERATIONS
    // ============================================================

    /**
     * Cast a vote on the blockchain
     * @param {Object} data - { userId, electionId, candidateId, receiptHash, encryptedVote }
     * @returns {Object} - { block, vote }
     */
    async castVote(data) {
        this._ensureInitialized();

        const voteId = this._toBytes32(data.id || crypto.randomUUID());
        const userId = this._toBytes32(data.userId);
        const electionId = this._toBytes32(data.electionId);
        const candidateId = this._toBytes32(data.candidateId);
        const receiptHash = this._toBytes32(data.receiptHash);

        const tx = await this.contract.castVote(
            voteId,
            userId,
            electionId,
            candidateId,
            receiptHash,
            data.encryptedVote || ''
        );

        const receipt = await tx.wait();

        return {
            block: this._formatTransaction(tx, receipt),
            vote: {
                id: voteId,
                userId: data.userId,
                electionId: data.electionId,
                candidateId: data.candidateId,
                receiptHash: data.receiptHash,
                timestamp: new Date().toISOString(),
            },
        };
    }

    /**
     * Verify a vote using receipt hash
     * @param {string} receiptHash
     * @returns {Object|null}
     */
    async verifyVote(receiptHash) {
        this._ensureInitialized();

        try {
            const hash = this._toBytes32(receiptHash);
            const vote = await this.contract.verifyVoteByReceipt(hash);

            return {
                id: vote.id,
                userId: vote.userId,
                electionId: vote.electionId,
                candidateId: vote.candidateId,
                receiptHash: vote.receiptHash,
                timestamp: new Date(Number(vote.timestamp) * 1000).toISOString(),
                blockIndex: Number(vote.blockIndex),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get votes by user
     * @param {string} userId
     * @returns {Array}
     */
    async getVotesByUser(userId) {
        this._ensureInitialized();

        const id = this._toBytes32(userId);
        const voteIds = await this.contract.getVotesByUser(id);
        const votes = [];

        for (const voteId of voteIds) {
            const vote = await this.contract.getVote(voteId);
            votes.push({
                id: voteId,
                userId: vote.userId,
                electionId: vote.electionId,
                candidateId: vote.candidateId,
                receiptHash: vote.receiptHash,
                timestamp: new Date(Number(vote.timestamp) * 1000).toISOString(),
            });
        }

        return votes;
    }

    /**
     * Get votes for an election
     * @param {string} electionId
     * @returns {Array}
     */
    async getVotesByElection(electionId) {
        this._ensureInitialized();

        const id = this._toBytes32(electionId);
        const voteIds = await this.contract.getVotesByElection(id);
        const votes = [];

        for (const voteId of voteIds) {
            const vote = await this.contract.getVote(voteId);
            votes.push({
                id: voteId,
                userId: vote.userId,
                electionId: vote.electionId,
                candidateId: vote.candidateId,
                timestamp: new Date(Number(vote.timestamp) * 1000).toISOString(),
            });
        }

        return votes;
    }

    /**
     * Check if user has voted in an election
     * @param {string} userId
     * @param {string} electionId
     * @returns {boolean}
     */
    async hasUserVoted(userId, electionId) {
        this._ensureInitialized();

        const votes = await this.getVotesByUser(userId);
        return votes.some(vote => vote.electionId === electionId);
    }

    /**
     * Get vote count for a candidate
     * @param {string} candidateId
     * @returns {number}
     */
    async getCandidateVoteCount(candidateId) {
        this._ensureInitialized();

        const id = this._toBytes32(candidateId);
        const count = await this.contract.getCandidateVoteCount(id);
        return Number(count);
    }

    // ============================================================
    // AUDIT OPERATIONS
    // ============================================================

    /**
     * Record an audit log
     * @param {Object} data - { userId, action, details, ipAddress }
     * @returns {Object}
     */
    async addAuditLog(data) {
        this._ensureInitialized();

        const auditId = this._toBytes32(data.id || crypto.randomUUID());
        const userId = this._toBytes32(data.userId);

        const tx = await this.contract.recordAuditLog(
            auditId,
            userId,
            data.action,
            data.details || '',
            data.ipAddress || ''
        );

        const receipt = await tx.wait();

        return {
            block: this._formatTransaction(tx, receipt),
            audit: {
                id: auditId,
                userId: data.userId,
                action: data.action,
                timestamp: new Date().toISOString(),
            },
        };
    }

    // ============================================================
    // BLOCKCHAIN OPERATIONS
    // ============================================================

    /**
     * Get blockchain statistics
     * @returns {Object}
     */
    async getStats() {
        this._ensureInitialized();

        const [chainLength, totalTransactions, difficulty] = await this.contract.getChainStats();
        const latestBlock = await this.contract.getBlock(chainLength - 1n);

        return {
            chainLength: Number(chainLength),
            totalTransactions: Number(totalTransactions),
            difficulty: Number(difficulty),
            latestBlock: {
                index: Number(latestBlock.index),
                hash: latestBlock.blockHash,
                timestamp: new Date(Number(latestBlock.timestamp) * 1000).toISOString(),
            },
            isValid: true, // Smart contracts enforce validity
        };
    }

    /**
     * Validate the blockchain (always returns true for smart contracts)
     * @returns {Object}
     */
    isChainValid() {
        return { valid: true, errors: [] };
    }
}

// Singleton instance
const blockchainService = new BlockchainServiceV2();

// Export functions to match old API
module.exports = {
    // Initialization
    initialize: () => blockchainService.initialize(),

    // Elections
    addElection: (data) => blockchainService.addElection(data),
    getElections: (filter) => blockchainService.getElections(filter),
    getElection: (id) => blockchainService.getElection(id),
    updateElectionStatus: (id, status) => blockchainService.updateElectionStatus(id, status),

    // Candidates
    addCandidate: (data) => blockchainService.addCandidate(data),
    getCandidatesByElection: (electionId) => blockchainService.getCandidatesByElection(electionId),
    getCandidates: (electionId) => blockchainService.getCandidatesByElection(electionId), // Alias for backward compatibility

    // Votes
    castVote: (data) => blockchainService.castVote(data),
    verifyVote: (receiptHash) => blockchainService.verifyVote(receiptHash),
    getVotesByUser: (userId) => blockchainService.getVotesByUser(userId),
    getUserVotes: (userId) => blockchainService.getVotesByUser(userId), // Alias for backward compatibility
    getVotesByElection: (electionId) => blockchainService.getVotesByElection(electionId),
    getCandidateVoteCount: (candidateId) => blockchainService.getCandidateVoteCount(candidateId),
    hasUserVoted: (userId, electionId) => blockchainService.hasUserVoted(userId, electionId), // New method

    // Audit
    addAuditLog: (data) => blockchainService.addAuditLog(data),
    addAudit: (data) => blockchainService.addAuditLog(data), // Alias for backward compatibility

    // Blockchain
    getStats: () => blockchainService.getStats(),
    getChainStatus: () => blockchainService.getStats(), // Alias for backward compatibility
    isChainValid: () => blockchainService.isChainValid(),

    // Mock methods for compatibility (not needed with smart contracts)
    getFullChain: () => [], // Smart contracts don't expose full chain

    // Direct access to service instance
    service: blockchainService,
};
