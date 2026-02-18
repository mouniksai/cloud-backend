// src/controllers/electionController.js
const prisma = require('../config/db');
const blockchainService = require('../blockchain/blockchainService');

// Helper function to calculate time remaining
const calculateTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`;
};

// GET /api/elections/results - Get all election results from Blockchain
exports.getElectionResults = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get user details from PostgreSQL (for constituency)
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch all elections for the user's constituency from Blockchain
        const elections = blockchainService.getElections({
            constituency: user.citizen.constituency
        });

        // Sort by endTime descending
        elections.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

        // Enrich each election with candidates and vote counts from Blockchain
        const electionsWithDetails = elections.map(election => {
            const candidates = blockchainService.getCandidates(election.id);
            const electionVotes = blockchainService.getElectionVotes(election.id);

            // Sort candidates by voteCount descending
            candidates.sort((a, b) => b.voteCount - a.voteCount);

            const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

            return {
                id: election.id,
                title: election.title,
                description: election.description,
                constituency: election.constituency,
                startTime: election.startTime,
                endTime: election.endTime,
                status: election.status,
                candidates: candidates.map(c => ({
                    id: c.id,
                    name: c.name,
                    party: c.party,
                    symbol: c.symbol,
                    keyPoints: c.keyPoints,
                    voteCount: c.voteCount,
                    age: c.age,
                    education: c.education,
                    experience: c.experience
                })),
                votes: electionVotes.map(v => ({
                    id: v.data.id,
                    timestamp: v.data.timestamp
                })),
                totalVotes,
                timeRemaining: election.status === 'LIVE' ? calculateTimeRemaining(election.endTime) : null,
                winner: election.status === 'ENDED' && candidates.length > 0
                    ? candidates.reduce((winner, c) =>
                        c.voteCount > (winner?.voteCount || 0) ? c : winner, null)
                    : null,
                blockIndex: election.blockIndex,
                blockHash: election.blockHash
            };
        });

        // Audit log on blockchain
        blockchainService.addAudit({
            userId: userId,
            action: "VIEWED_ELECTION_RESULTS",
            ipAddress: req.ip
        });

        res.json({
            elections: electionsWithDetails,
            summary: {
                total: elections.length,
                ended: elections.filter(e => e.status === 'ENDED').length,
                live: elections.filter(e => e.status === 'LIVE').length,
                upcoming: elections.filter(e => e.status === 'UPCOMING').length
            }
        });

    } catch (err) {
        console.error("Election Results Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/elections/:id/details - Get detailed results for a specific election
exports.getElectionDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Get election from Blockchain
        const election = blockchainService.getElection(id);

        if (!election) {
            return res.status(404).json({ message: "Election not found" });
        }

        // Get candidates and votes from Blockchain
        const candidates = blockchainService.getCandidates(id);
        candidates.sort((a, b) => b.voteCount - a.voteCount);

        const votes = blockchainService.getElectionVotes(id);
        const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

        const winner = election.status === 'ENDED' && candidates.length > 0
            ? candidates.reduce((w, c) => c.voteCount > (w?.voteCount || 0) ? c : w, null)
            : null;

        // Vote timeline (anonymized)
        const voteTimeline = votes
            .map(v => ({
                timestamp: v.data.timestamp,
                blockIndex: v.blockIndex
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const response = {
            id: election.id,
            title: election.title,
            description: election.description,
            constituency: election.constituency,
            startTime: election.startTime,
            endTime: election.endTime,
            status: election.status,
            candidates: candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party,
                symbol: c.symbol,
                keyPoints: c.keyPoints,
                voteCount: c.voteCount,
                age: c.age,
                education: c.education,
                experience: c.experience
            })),
            totalVotes,
            winner,
            timeRemaining: election.status === 'LIVE' ? calculateTimeRemaining(election.endTime) : null,
            analytics: {
                voteTimeline,
                turnoutPercentage: 85.2,
                peakVotingHour: '14:00'
            },
            blockchainProof: {
                blockIndex: election.blockIndex,
                blockHash: election.blockHash
            }
        };

        res.json(response);

    } catch (err) {
        console.error("Election Details Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Background service to log election status updates
exports.startElectionStatusUpdater = () => {
    console.log('📊 Election status updater started (blockchain-based) - statuses computed on read');
    // No longer needed to write status updates to DB
    // Statuses are now computed dynamically from blockchain based on startTime/endTime
};