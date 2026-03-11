// src/controllers/publicController.js
// NEW FILE - Public Verification Controller (No Auth Required)

const blockchainService = require('../blockchain/blockchainServiceV2');
const prisma = require('../config/db');

/**
 * POST /api/public/verify-receipt
 * Verify a vote receipt without authentication
 */
exports.verifyReceipt = async (req, res) => {
    try {
        const { receiptHash } = req.body;

        if (!receiptHash) {
            return res.status(400).json({
                success: false,
                message: 'Receipt hash is required'
            });
        }

        console.log(`[PUBLIC] Receipt verification requested: ${receiptHash.substring(0, 10)}...`);

        // Verify receipt on blockchain
        const vote = await blockchainService.verifyVote(receiptHash);

        if (vote) {
            // Return verification result WITHOUT revealing vote choice
            res.json({
                success: true,
                message: 'Receipt verified successfully',
                vote: {
                    id: vote.id,
                    electionId: vote.electionId,
                    timestamp: vote.timestamp,
                    blockIndex: vote.blockIndex,
                    // DO NOT include candidateId or encrypted vote - privacy protection
                    verified: true
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Receipt not found. Please check the hash and try again.'
            });
        }
    } catch (err) {
        console.error('[PUBLIC] Receipt verification error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to verify receipt'
        });
    }
};

/**
 * GET /api/public/election-results/:electionId
 * Get final results for ended elections only
 */
exports.getElectionResults = async (req, res) => {
    try {
        const { electionId } = req.params;

        console.log(`[PUBLIC] Election results requested: ${electionId}`);

        // Get election from blockchain
        const election = await blockchainService.getElection(electionId);

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        // Only allow results for ENDED elections (privacy protection)
        if (election.status !== 'ENDED') {
            return res.status(403).json({
                success: false,
                message: 'Results are only available for ended elections',
                electionStatus: election.status
            });
        }

        // Get candidates and vote counts
        const candidates = await blockchainService.getCandidates(electionId);
        const candidatesWithVotes = await Promise.all(
            candidates.map(async (candidate) => {
                const voteCount = await blockchainService.getCandidateVotes(candidate.id);
                return {
                    id: candidate.id,
                    name: candidate.name,
                    party: candidate.party,
                    symbol: candidate.symbol,
                    voteCount: voteCount.length
                };
            })
        );

        // Sort by vote count
        candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount);

        const totalVotes = candidatesWithVotes.reduce((sum, c) => sum + c.voteCount, 0);

        res.json({
            success: true,
            election: {
                id: election.id,
                title: election.title,
                description: election.description,
                constituency: election.constituency,
                status: election.status,
                startTime: election.startTime,
                endTime: election.endTime
            },
            results: {
                candidates: candidatesWithVotes,
                totalVotes,
                winner: candidatesWithVotes[0] || null
            },
            verifiedOn: 'Ethereum Sepolia Blockchain'
        });
    } catch (err) {
        console.error('[PUBLIC] Election results error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch election results'
        });
    }
};

/**
 * GET /api/public/blockchain/:blockIndex
 * Public blockchain explorer
 */
exports.getBlockInfo = async (req, res) => {
    try {
        const blockIndex = parseInt(req.params.blockIndex);

        if (isNaN(blockIndex) || blockIndex < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid block index'
            });
        }

        console.log(`[PUBLIC] Block info requested: ${blockIndex}`);

        // Get block from blockchain
        const block = await blockchainService.getBlock(blockIndex);

        if (!block) {
            return res.status(404).json({
                success: false,
                message: 'Block not found'
            });
        }

        // Return block information (public data only)
        res.json({
            success: true,
            block: {
                index: block.index,
                timestamp: block.timestamp,
                previousHash: block.previousHash,
                blockHash: block.blockHash,
                merkleRoot: block.merkleRoot,
                nonce: block.nonce,
                transactionCount: block.transactionCount
                // Do not include individual transaction details for privacy
            }
        });
    } catch (err) {
        console.error('[PUBLIC] Block info error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch block information'
        });
    }
};

/**
 * GET /api/public/election-list
 * Get list of all elections (metadata only)
 */
exports.getPublicElectionList = async (req, res) => {
    try {
        console.log(`[PUBLIC] Election list requested`);

        const elections = await blockchainService.getElections({});

        // Return only public metadata
        const publicElections = elections.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            constituency: e.constituency,
            status: e.status,
            startTime: e.startTime,
            endTime: e.endTime
        }));

        res.json({
            success: true,
            elections: publicElections,
            total: publicElections.length
        });
    } catch (err) {
        console.error('[PUBLIC] Election list error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch election list'
        });
    }
};

/**
 * GET /api/public/stats
 * Get public aggregated statistics
 */
exports.getPublicStats = async (req, res) => {
    try {
        console.log(`[PUBLIC] Public stats requested`);

        // Get aggregated statistics (no personal data)
        const totalRegisteredVoters = await prisma.govtRegistry.count({
            where: { isRegistered: true }
        });

        const allVotes = await blockchainService.getAllVotes();
        const allElections = await blockchainService.getElections({});

        const stats = {
            totalRegisteredVoters,
            totalVotesCast: allVotes.length,
            totalElections: allElections.length,
            activeElections: allElections.filter(e => e.status === 'LIVE').length,
            endedElections: allElections.filter(e => e.status === 'ENDED').length,
            turnoutPercentage: totalRegisteredVoters > 0
                ? ((allVotes.length / totalRegisteredVoters) * 100).toFixed(2)
                : 0,
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            stats,
            verifiedOn: 'Ethereum Sepolia Blockchain'
        });
    } catch (err) {
        console.error('[PUBLIC] Public stats error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public statistics'
        });
    }
};
