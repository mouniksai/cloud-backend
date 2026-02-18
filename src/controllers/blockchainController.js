// src/controllers/blockchainController.js
const blockchainService = require('../blockchain/blockchainService');

// GET /api/blockchain/status - Chain status and statistics
exports.getChainStatus = async (req, res) => {
    try {
        const status = blockchainService.getChainStatus();
        res.json(status);
    } catch (err) {
        console.error('Chain status error:', err);
        res.status(500).json({ message: "Error fetching chain status" });
    }
};

// GET /api/blockchain/validate - Full chain integrity check
exports.validateChain = async (req, res) => {
    try {
        const result = blockchainService.validateChain();
        res.json({
            valid: result.valid,
            errors: result.errors,
            message: result.valid
                ? "✅ Blockchain is valid - All blocks verified (hashes, Merkle roots, PoW)"
                : "❌ Blockchain integrity compromised - Tampering detected"
        });
    } catch (err) {
        console.error('Chain validation error:', err);
        res.status(500).json({ message: "Error validating chain" });
    }
};

// GET /api/blockchain/chain - View full chain (admin only)
exports.getFullChain = async (req, res) => {
    try {
        const chain = blockchainService.getFullChain();
        res.json({
            length: chain.length,
            blocks: chain.map(block => ({
                index: block.index,
                timestamp: block.timestamp,
                transactionCount: block.transactions.length,
                transactions: block.transactions.map(tx => ({
                    type: tx.type,
                    timestamp: tx.timestamp,
                    dataId: tx.data?.id || null,
                    dataType: tx.type
                })),
                previousHash: block.previousHash,
                hash: block.hash,
                merkleRoot: block.merkleRoot,
                nonce: block.nonce
            }))
        });
    } catch (err) {
        console.error('Full chain error:', err);
        res.status(500).json({ message: "Error fetching chain" });
    }
};

// GET /api/blockchain/block/:index - View a specific block
exports.getBlock = async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const block = blockchainService.getBlock(index);

        if (!block) {
            return res.status(404).json({ message: "Block not found" });
        }

        res.json(block);
    } catch (err) {
        console.error('Block fetch error:', err);
        res.status(500).json({ message: "Error fetching block" });
    }
};

// GET /api/blockchain/verify/:receiptHash - Verify a vote on the blockchain
exports.verifyVote = async (req, res) => {
    try {
        const { receiptHash } = req.params;
        const result = blockchainService.verifyVote(receiptHash);

        if (!result) {
            return res.json({
                found: false,
                message: "Vote not found on blockchain"
            });
        }

        res.json({
            found: true,
            message: "✅ Vote verified on blockchain",
            ...result
        });
    } catch (err) {
        console.error('Vote verification error:', err);
        res.status(500).json({ message: "Error verifying vote" });
    }
};
