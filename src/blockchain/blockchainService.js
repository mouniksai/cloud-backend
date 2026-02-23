// src/blockchain/blockchainService.js
// High-level domain service wrapping the blockchain for VoteGuard operations

const { Blockchain } = require('./blockchain');
const crypto = require('crypto');

// Singleton blockchain instance
const blockchain = new Blockchain();

// ============================================================
// ELECTION OPERATIONS
// ============================================================

/**
 * Add an election to the blockchain.
 * @param {Object} data - { title, description, constituency, startTime, endTime }
 * @returns {Object} - { block, election }
 */
function addElection(data) {
    const electionId = crypto.randomUUID();
    const transaction = {
        type: 'ELECTION',
        data: {
            id: electionId,
            title: data.title,
            description: data.description,
            constituency: data.constituency,
            startTime: data.startTime,
            endTime: data.endTime,
            status: data.status || 'UPCOMING',
            createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    };

    const block = blockchain.addBlock([transaction]);
    return { block, election: { id: electionId, ...transaction.data } };
}

/**
 * Get all elections from the blockchain, optionally filtered.
 * @param {Object} filter - { constituency, status }
 * @returns {Array}
 */
function getElections(filter = {}) {
    const results = blockchain.searchTransactions({ type: 'ELECTION' });

    // Build a map of latest election states (handling status updates)
    const electionMap = new Map();

    for (const tx of results) {
        const id = tx.data.id;
        if (!electionMap.has(id)) {
            electionMap.set(id, { ...tx.data, blockIndex: tx.blockIndex, blockHash: tx.blockHash });
        }
    }

    // Apply status update transactions
    const statusUpdates = blockchain.searchTransactions({ type: 'ELECTION_STATUS_UPDATE' });
    for (const tx of statusUpdates) {
        const id = tx.data.electionId;
        if (electionMap.has(id)) {
            electionMap.get(id).status = tx.data.newStatus;
        }
    }

    let elections = Array.from(electionMap.values());

    // Auto-update statuses based on current time
    const now = new Date();
    for (const election of elections) {
        const startTime = new Date(election.startTime);
        const endTime = new Date(election.endTime);

        if (election.status === 'UPCOMING' && startTime <= now) {
            election.status = 'LIVE';
        }
        if (election.status === 'LIVE' && endTime <= now) {
            election.status = 'ENDED';
        }
    }

    // Apply filters
    if (filter.constituency) {
        elections = elections.filter(e => e.constituency === filter.constituency);
    }
    if (filter.status) {
        elections = elections.filter(e => e.status === filter.status);
    }

    return elections;
}

/**
 * Get a single election by ID.
 * @param {string} electionId
 * @returns {Object|null}
 */
function getElection(electionId) {
    const elections = getElections();
    return elections.find(e => e.id === electionId) || null;
}

/**
 * Update election status on the blockchain.
 * @param {string} electionId
 * @param {string} newStatus
 * @returns {Object}
 */
function updateElectionStatus(electionId, newStatus) {
    const transaction = {
        type: 'ELECTION_STATUS_UPDATE',
        data: {
            electionId,
            newStatus,
            updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    };

    const block = blockchain.addBlock([transaction]);
    return { block };
}

// ============================================================
// CANDIDATE OPERATIONS
// ============================================================

/**
 * Add a candidate to the blockchain.
 * @param {Object} data - { name, party, symbol, age, education, experience, keyPoints, electionId }
 * @returns {Object} - { block, candidate }
 */
function addCandidate(data) {
    // DUPLICATE CHECK: Prevent adding the same candidate twice
    const existingCandidates = blockchain.searchTransactions({
        type: 'CANDIDATE',
        electionId: data.electionId
    });

    const duplicate = existingCandidates.find(tx =>
        tx.data.name.toLowerCase().trim() === data.name.toLowerCase().trim() &&
        tx.data.party.toLowerCase().trim() === data.party.toLowerCase().trim()
    );

    if (duplicate) {
        throw new Error(`Duplicate candidate: ${data.name} from ${data.party} already exists in this election`);
    }

    const candidateId = crypto.randomUUID();
    const transaction = {
        type: 'CANDIDATE',
        data: {
            id: candidateId,
            name: data.name,
            party: data.party,
            symbol: data.symbol,
            age: parseInt(data.age),
            education: data.education,
            experience: data.experience,
            keyPoints: data.keyPoints || [],
            electionId: data.electionId,
            createdAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    };

    const block = blockchain.addBlock([transaction]);
    return { block, candidate: { id: candidateId, ...transaction.data } };
}

/**
 * Get candidates for a specific election.
 * @param {string} electionId
 * @returns {Array}
 */
function getCandidates(electionId) {
    const results = blockchain.searchTransactions({ type: 'CANDIDATE', electionId });

    // Attach vote counts
    return results.map(tx => {
        const voteCount = getVoteCount(tx.data.id);
        return {
            ...tx.data,
            voteCount,
            blockIndex: tx.blockIndex,
            blockHash: tx.blockHash
        };
    });
}

// ============================================================
// VOTE OPERATIONS
// ============================================================

/**
 * Cast a vote on the blockchain.
 * @param {Object} data - { userId, electionId, candidateId, receiptHash, encryptedDetails }
 * @returns {Object} - { block, vote }
 */
function castVote(data) {
    const voteId = crypto.randomUUID();
    const transaction = {
        type: 'VOTE',
        data: {
            id: voteId,
            userId: data.userId,
            electionId: data.electionId,
            candidateId: data.candidateId,
            receiptHash: data.receiptHash,
            encryptedDetails: data.encryptedDetails || null,
            timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    };

    const block = blockchain.addBlock([transaction]);
    return {
        block,
        vote: {
            id: voteId,
            ...transaction.data,
            blockIndex: block.index,
            blockHash: block.hash,
            merkleRoot: block.merkleRoot
        }
    };
}

/**
 * Check if a user has already voted in an election.
 * @param {string} userId
 * @param {string} electionId
 * @returns {Object|null} - The existing vote or null
 */
function hasUserVoted(userId, electionId) {
    const results = blockchain.searchTransactions({ type: 'VOTE', userId, electionId });
    return results.length > 0 ? results[0] : null;
}

/**
 * Get vote count for a candidate.
 * @param {string} candidateId
 * @returns {number}
 */
function getVoteCount(candidateId) {
    const results = blockchain.searchTransactions({ type: 'VOTE', candidateId });
    return results.length;
}

/**
 * Verify a vote on the blockchain by receipt hash.
 * @param {string} receiptHash
 * @returns {Object|null}
 */
function verifyVote(receiptHash) {
    const results = blockchain.searchTransactions({ type: 'VOTE', receiptHash });
    if (results.length === 0) return null;

    const vote = results[0];
    // Also verify the Merkle root of the block containing this vote
    const block = blockchain.getBlock(vote.blockIndex);
    const { MerkleTree } = require('./blockchain');
    const merkleValid = MerkleTree.verify(
        { type: vote.type, data: vote.data, timestamp: vote.timestamp },
        block.transactions,
        block.merkleRoot
    );

    return {
        found: true,
        vote: vote.data,
        blockIndex: vote.blockIndex,
        blockHash: vote.blockHash,
        merkleRoot: vote.merkleRoot,
        merkleValid,
        chainValid: blockchain.isChainValid().valid
    };
}

/**
 * Get all votes for a user.
 * @param {string} userId
 * @returns {Array}
 */
function getUserVotes(userId) {
    return blockchain.searchTransactions({ type: 'VOTE', userId });
}

/**
 * Get all votes for an election.
 * @param {string} electionId
 * @returns {Array}
 */
function getElectionVotes(electionId) {
    return blockchain.searchTransactions({ type: 'VOTE', electionId });
}

// ============================================================
// AUDIT LOG OPERATIONS
// ============================================================

/**
 * Add an audit log entry to the blockchain.
 * @param {Object} data - { userId, action, details, ipAddress }
 * @returns {Object}
 */
function addAudit(data) {
    const transaction = {
        type: 'AUDIT',
        data: {
            id: crypto.randomUUID(),
            userId: data.userId,
            action: data.action,
            details: data.details || null,
            ipAddress: data.ipAddress || null,
            timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
    };

    const block = blockchain.addBlock([transaction]);
    return { block };
}

// ============================================================
// CHAIN OPERATIONS
// ============================================================

/**
 * Get chain status/statistics.
 */
function getChainStatus() {
    return blockchain.getStats();
}

/**
 * Validate the entire chain.
 */
function validateChain() {
    return blockchain.isChainValid();
}

/**
 * Get a specific block.
 */
function getBlock(index) {
    return blockchain.getBlock(index);
}

/**
 * Get the full chain.
 */
function getFullChain() {
    return blockchain.getFullChain();
}

/**
 * Get the underlying blockchain instance (for advanced operations).
 */
function getBlockchainInstance() {
    return blockchain;
}

module.exports = {
    // Election operations
    addElection,
    getElections,
    getElection,
    updateElectionStatus,

    // Candidate operations
    addCandidate,
    getCandidates,

    // Vote operations
    castVote,
    hasUserVoted,
    getVoteCount,
    verifyVote,
    getUserVotes,
    getElectionVotes,

    // Audit operations
    addAudit,

    // Chain operations
    getChainStatus,
    validateChain,
    getBlock,
    getFullChain,
    getBlockchainInstance
};
