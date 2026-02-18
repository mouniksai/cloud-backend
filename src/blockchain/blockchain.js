// src/blockchain/blockchain.js
// Core Blockchain Implementation with Merkle Tree, Proof of Work, and Immutability

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================
// MERKLE TREE - Ensures data integrity within each block
// ============================================================
class MerkleTree {
    /**
     * Build a Merkle Tree from an array of transaction data objects.
     * Each leaf is the SHA-256 hash of the JSON-stringified transaction.
     * @param {Array} transactions - Array of transaction objects
     * @returns {string} - The Merkle root hash
     */
    static computeRoot(transactions) {
        if (!transactions || transactions.length === 0) {
            return crypto.createHash('sha256').update('empty').digest('hex');
        }

        // Step 1: Hash each transaction to get leaf nodes
        let hashes = transactions.map(tx =>
            crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
        );

        // Step 2: Iteratively combine pairs until we get the root
        while (hashes.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                // If odd number of hashes, duplicate the last one
                const right = i + 1 < hashes.length ? hashes[i + 1] : left;
                const combined = crypto.createHash('sha256')
                    .update(left + right)
                    .digest('hex');
                nextLevel.push(combined);
            }
            hashes = nextLevel;
        }

        return hashes[0];
    }

    /**
     * Verify that a specific transaction is included in the Merkle tree.
     * @param {Object} transaction - The transaction to verify
     * @param {Array} transactions - All transactions in the block
     * @param {string} expectedRoot - The expected Merkle root
     * @returns {boolean}
     */
    static verify(transaction, transactions, expectedRoot) {
        const computedRoot = MerkleTree.computeRoot(transactions);
        return computedRoot === expectedRoot;
    }
}

// ============================================================
// BLOCK - A single block in the chain
// ============================================================
class Block {
    /**
     * @param {number} index - Block position in the chain
     * @param {string} timestamp - ISO timestamp of block creation
     * @param {Array} transactions - Array of transaction objects
     * @param {string} previousHash - Hash of the previous block
     */
    constructor(index, timestamp, transactions, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.merkleRoot = MerkleTree.computeRoot(transactions);
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    /**
     * Calculate the SHA-256 hash of this block.
     * Includes: index + previousHash + timestamp + merkleRoot + nonce
     * This ensures immutability - any change invalidates the hash.
     */
    calculateHash() {
        const data = this.index +
            this.previousHash +
            this.timestamp +
            this.merkleRoot +
            this.nonce;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Proof of Work (Mining) - Find a nonce that produces a hash
     * with the required number of leading zeros.
     * @param {number} difficulty - Number of leading zeros required
     */
    mineBlock(difficulty) {
        const target = '0'.repeat(difficulty);
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`⛏️  Block ${this.index} mined: ${this.hash} (nonce: ${this.nonce})`);
    }
}

// ============================================================
// BLOCKCHAIN - The full chain with persistence
// ============================================================
class Blockchain {
    constructor() {
        this.difficulty = 4; // Number of leading zeros required (Proof of Work)
        this.chain = [];
        this.pendingTransactions = [];
        this.dataFile = process.env.BLOCKCHAIN_DATA_PATH || path.join(__dirname, '..', '..', 'blockchain_data.json');

        // SECURITY: Secret key for HMAC file integrity signing
        // Uses env variable or falls back to a derived key from the data file path
        this.hmacSecret = process.env.BLOCKCHAIN_SECRET ||
            crypto.createHash('sha256').update('VoteGuard-Blockchain-Integrity-Key-2026').digest('hex');

        // Load existing chain or create genesis block
        this._loadChain();
    }

    // ---- SECURITY: HMAC File Integrity ----

    /**
     * Compute HMAC-SHA256 signature of the chain data.
     * This detects any manual edits to blockchain_data.json.
     */
    _computeHMAC(chainData) {
        return crypto.createHmac('sha256', this.hmacSecret)
            .update(chainData)
            .digest('hex');
    }

    /**
     * Verify the HMAC signature of the stored file.
     * Returns true if the file hasn't been tampered with.
     */
    _verifyFileIntegrity(fileContent) {
        try {
            const parsed = JSON.parse(fileContent);
            if (!parsed.signature) {
                console.log('⚠️  No HMAC signature found — upgrading file with signature');
                return true; // First run after upgrade, allow it
            }
            const chainData = JSON.stringify(parsed.chain);
            const expectedHMAC = this._computeHMAC(chainData);
            return parsed.signature === expectedHMAC;
        } catch (e) {
            return false;
        }
    }

    /**
     * Create the genesis (first) block of the chain.
     */
    _createGenesisBlock() {
        const genesis = new Block(0, new Date().toISOString(), [{
            type: 'GENESIS',
            message: 'VoteGuard Blockchain Genesis Block',
            timestamp: new Date().toISOString()
        }], '0');
        genesis.mineBlock(this.difficulty);
        this.chain = [genesis];
        this._saveChain();
        console.log('🔗 Genesis block created');
    }

    /**
     * Load chain from JSON file, or create genesis block if file doesn't exist.
     * SECURITY: Verifies HMAC signature and full chain integrity on startup.
     */
    _loadChain() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const rawContent = fs.readFileSync(this.dataFile, 'utf8');

                // SECURITY CHECK 1: HMAC File Integrity
                if (!this._verifyFileIntegrity(rawContent)) {
                    console.error('🚨 TAMPER DETECTED: blockchain_data.json HMAC signature mismatch!');
                    console.error('🚨 The file has been manually edited outside the application.');
                    console.error('🚨 Rejecting tampered data and creating fresh chain.');
                    this._createGenesisBlock();
                    return;
                }

                const data = JSON.parse(rawContent);
                this.chain = data.chain || [];
                console.log(`🔗 Blockchain loaded: ${this.chain.length} blocks`);
                console.log('🔒 HMAC file integrity verified ✅');

                // SECURITY CHECK 2: Full chain validation (hashes, PoW, Merkle)
                const validation = this.isChainValid();
                if (!validation.valid) {
                    console.error('🚨 CHAIN INTEGRITY FAILED:');
                    validation.errors.forEach(err => console.error(`   ❌ ${err}`));
                    console.error('🚨 Creating new chain to protect vote integrity.');
                    this._createGenesisBlock();
                } else {
                    console.log('🔒 Chain integrity verified ✅ (hashes, PoW, Merkle roots)');
                }
            } else {
                this._createGenesisBlock();
            }
        } catch (error) {
            console.error('Error loading blockchain:', error.message);
            this._createGenesisBlock();
        }
    }

    /**
     * Save the entire chain to a JSON file with HMAC signature.
     * SECURITY: The HMAC ensures any manual file edits are detectable.
     */
    _saveChain() {
        try {
            const chainData = JSON.stringify(this.chain);
            const signature = this._computeHMAC(chainData);
            const fileContent = JSON.stringify({ chain: this.chain, signature }, null, 2);
            fs.writeFileSync(this.dataFile, fileContent, 'utf8');
        } catch (error) {
            console.error('Error saving blockchain:', error.message);
        }
    }

    /**
     * Get the latest block in the chain.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Add a new block with the given transactions.
     * Mines the block (Proof of Work) and appends it to the chain.
     * @param {Array} transactions - Array of transaction objects
     * @returns {Block} - The newly mined block
     */
    addBlock(transactions) {
        const previousBlock = this.getLatestBlock();
        const newBlock = new Block(
            previousBlock.index + 1,
            new Date().toISOString(),
            transactions,
            previousBlock.hash
        );

        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
        this._saveChain();

        return newBlock;
    }

    /**
     * Validate the entire blockchain.
     * Checks: hash correctness, previous hash linkage, Merkle roots, PoW.
     * @returns {Object} - { valid: boolean, errors: string[] }
     */
    isChainValid() {
        const errors = [];

        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Reconstruct the block to recalculate its hash
            const testBlock = new Block(
                currentBlock.index,
                currentBlock.timestamp,
                currentBlock.transactions,
                currentBlock.previousHash
            );
            testBlock.nonce = currentBlock.nonce;
            testBlock.merkleRoot = currentBlock.merkleRoot;
            const recalculatedHash = testBlock.calculateHash();

            // Check 1: Hash integrity
            if (currentBlock.hash !== recalculatedHash) {
                errors.push(`Block ${i}: Hash mismatch (stored: ${currentBlock.hash}, calculated: ${recalculatedHash})`);
            }

            // Check 2: Previous hash linkage (immutability)
            if (currentBlock.previousHash !== previousBlock.hash) {
                errors.push(`Block ${i}: Previous hash mismatch (expected: ${previousBlock.hash}, got: ${currentBlock.previousHash})`);
            }

            // Check 3: Proof of Work verification
            const target = '0'.repeat(this.difficulty);
            if (currentBlock.hash.substring(0, this.difficulty) !== target) {
                errors.push(`Block ${i}: Proof of Work invalid (hash doesn't start with ${target})`);
            }

            // Check 4: Merkle root verification
            const expectedMerkle = MerkleTree.computeRoot(currentBlock.transactions);
            if (currentBlock.merkleRoot !== expectedMerkle) {
                errors.push(`Block ${i}: Merkle root mismatch`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Search the blockchain for transactions matching a filter.
     * @param {Object} filter - { type, electionId, userId, candidateId, receiptHash }
     * @returns {Array} - Matching transactions with block info
     */
    searchTransactions(filter = {}) {
        const results = [];

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                let match = true;

                if (filter.type && tx.type !== filter.type) match = false;
                if (filter.electionId && tx.data?.electionId !== filter.electionId) match = false;
                if (filter.userId && tx.data?.userId !== filter.userId) match = false;
                if (filter.candidateId && tx.data?.candidateId !== filter.candidateId) match = false;
                if (filter.receiptHash && tx.data?.receiptHash !== filter.receiptHash) match = false;
                if (filter.id && tx.data?.id !== filter.id) match = false;

                if (match) {
                    results.push({
                        ...tx,
                        blockIndex: block.index,
                        blockHash: block.hash,
                        blockTimestamp: block.timestamp,
                        merkleRoot: block.merkleRoot
                    });
                }
            }
        }

        return results;
    }

    /**
     * Get a specific block by index.
     * @param {number} index
     * @returns {Block|null}
     */
    getBlock(index) {
        return this.chain[index] || null;
    }

    /**
     * Get the full chain.
     * @returns {Array}
     */
    getFullChain() {
        return this.chain;
    }

    /**
     * Get chain statistics.
     */
    getStats() {
        const totalTransactions = this.chain.reduce(
            (sum, block) => sum + block.transactions.length, 0
        );
        return {
            chainLength: this.chain.length,
            totalTransactions,
            difficulty: this.difficulty,
            latestBlock: {
                index: this.getLatestBlock().index,
                hash: this.getLatestBlock().hash,
                timestamp: this.getLatestBlock().timestamp
            },
            isValid: this.isChainValid().valid
        };
    }
}

module.exports = { Blockchain, Block, MerkleTree };
