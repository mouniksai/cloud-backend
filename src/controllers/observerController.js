// src/controllers/observerController.js
// NEW FILE - Observer Dashboard Controller

const prisma = require('../config/db');
const blockchainService = require('../blockchain/blockchainServiceV2');

/**
 * GET /api/observer/live-stats
 * Real-time election statistics for observer monitoring
 */
exports.getLiveStats = async (req, res) => {
    try {
        console.log(`[OBSERVER] Live stats requested by user: ${req.user.user_id}`);

        // Get all elections from blockchain
        const allElections = await blockchainService.getElections({});
        const liveElections = allElections.filter(e => e.status === 'LIVE');

        // Get all votes from blockchain
        const allVotes = await blockchainService.getAllVotes();

        // Get total registered voters from DB
        const totalVoters = await prisma.govtRegistry.count({
            where: { isRegistered: true }
        });

        // Calculate turnout percentage
        const votesCast = allVotes.length;
        const turnoutPercentage = totalVoters > 0
            ? ((votesCast / totalVoters) * 100).toFixed(2)
            : 0;

        // Get constituency breakdown
        const constituencies = await getConstituencyBreakdown();

        const stats = {
            totalVoters,
            votesCast,
            turnoutPercentage,
            activeElections: liveElections.length,
            constituencies,
            lastUpdated: new Date().toISOString()
        };

        res.json(stats);
    } catch (err) {
        console.error('[OBSERVER] Error fetching live stats:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch live statistics'
        });
    }
};

/**
 * GET /api/observer/audit-logs
 * Retrieve audit logs from blockchain
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        console.log(`[OBSERVER] Audit logs requested: limit=${limit}, offset=${offset}`);

        // Get audit logs from blockchain
        const auditLogs = await blockchainService.getAuditLogs(limit, offset);

        res.json({
            success: true,
            logs: auditLogs || [],
            limit,
            offset,
            total: auditLogs?.length || 0
        });
    } catch (err) {
        console.error('[OBSERVER] Error fetching audit logs:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
};

/**
 * GET /api/observer/anomalies
 * Detect statistical anomalies in voting patterns
 */
exports.getAnomalies = async (req, res) => {
    try {
        console.log(`[OBSERVER] Anomaly detection requested`);

        const anomalies = [];

        // Get all votes grouped by time
        const allVotes = await blockchainService.getAllVotes();

        // Check for unusual voting spikes (simple heuristic)
        const votesPerHour = groupVotesByHour(allVotes);
        const avgVotesPerHour = Object.values(votesPerHour).reduce((a, b) => a + b, 0) / Object.keys(votesPerHour).length || 0;

        for (const [hour, count] of Object.entries(votesPerHour)) {
            if (count > avgVotesPerHour * 2) { // More than 2x average = anomaly
                anomalies.push({
                    type: 'VOTING_SPIKE',
                    severity: 'MEDIUM',
                    timestamp: hour,
                    details: `Unusual voting spike detected: ${count} votes (avg: ${avgVotesPerHour.toFixed(0)})`,
                    recommendation: 'Review voting patterns for this time period'
                });
            }
        }

        // Check for duplicate voting attempts (should be prevented by smart contract)
        // This is more of a verification check
        const userVoteCounts = {};
        allVotes.forEach(vote => {
            userVoteCounts[vote.userId] = (userVoteCounts[vote.userId] || 0) + 1;
        });

        for (const [userId, count] of Object.entries(userVoteCounts)) {
            if (count > 1) {
                anomalies.push({
                    type: 'DUPLICATE_VOTE_ATTEMPT',
                    severity: 'HIGH',
                    userId,
                    details: `User attempted to vote ${count} times`,
                    recommendation: 'Investigate potential security breach'
                });
            }
        }

        res.json({
            success: true,
            anomalies,
            totalAnomalies: anomalies.length,
            scannedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('[OBSERVER] Error detecting anomalies:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to detect anomalies'
        });
    }
};

/**
 * GET /api/observer/constituency/:constituencyName
 * Get detailed stats for a specific constituency
 */
exports.getConstituencyStats = async (req, res) => {
    try {
        const { constituencyName } = req.params;
        console.log(`[OBSERVER] Constituency stats requested: ${constituencyName}`);

        // Get registered voters in this constituency
        const totalVoters = await prisma.govtRegistry.count({
            where: {
                constituency: constituencyName,
                isRegistered: true
            }
        });

        // Get elections for this constituency
        const elections = await blockchainService.getElections({
            constituency: constituencyName
        });

        // Get votes for this constituency's elections
        let votesCast = 0;
        for (const election of elections) {
            const electionVotes = await blockchainService.getElectionVotes(election.id);
            votesCast += electionVotes.length;
        }

        const turnout = totalVoters > 0 ? ((votesCast / totalVoters) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            constituency: constituencyName,
            totalVoters,
            votesCast,
            turnoutPercentage: turnout,
            activeElections: elections.filter(e => e.status === 'LIVE').length,
            totalElections: elections.length
        });
    } catch (err) {
        console.error('[OBSERVER] Error fetching constituency stats:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch constituency statistics'
        });
    }
};

/**
 * GET /api/observer/blockchain-status
 * Get blockchain health metrics
 */
exports.getBlockchainStatus = async (req, res) => {
    try {
        console.log(`[OBSERVER] Blockchain status requested`);

        const chainStatus = await blockchainService.getChainStatus();

        res.json({
            success: true,
            blockchain: {
                chainLength: chainStatus.chainLength || 0,
                totalTransactions: chainStatus.totalTransactions || 0,
                lastBlockTime: new Date().toISOString(),
                network: 'Sepolia Testnet',
                contractAddress: process.env.CONTRACT_ADDRESS || 'Not configured',
                status: 'HEALTHY'
            }
        });
    } catch (err) {
        console.error('[OBSERVER] Error fetching blockchain status:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blockchain status',
            blockchain: { status: 'ERROR' }
        });
    }
};

// Helper Functions

/**
 * Get constituency breakdown with stats
 */
async function getConstituencyBreakdown() {
    try {
        // Get all unique constituencies from govt registry
        const constituencies = await prisma.govtRegistry.groupBy({
            by: ['constituency', 'ward'],
            where: { isRegistered: true },
            _count: {
                citizenId: true
            }
        });

        // For each constituency, calculate votes cast
        const breakdown = await Promise.all(
            constituencies.map(async (c) => {
                // Get elections for this constituency
                const elections = await blockchainService.getElections({
                    constituency: c.constituency
                });

                // Count votes
                let votesCast = 0;
                for (const election of elections) {
                    const votes = await blockchainService.getElectionVotes(election.id);
                    votesCast += votes.length;
                }

                return {
                    name: c.constituency,
                    ward: c.ward,
                    totalVoters: c._count.citizenId,
                    votesCast
                };
            })
        );

        return breakdown;
    } catch (err) {
        console.error('[OBSERVER] Error getting constituency breakdown:', err);
        return [];
    }
}

/**
 * Group votes by hour for anomaly detection
 */
function groupVotesByHour(votes) {
    const grouped = {};
    votes.forEach(vote => {
        const hour = new Date(vote.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
        grouped[hour] = (grouped[hour] || 0) + 1;
    });
    return grouped;
}
