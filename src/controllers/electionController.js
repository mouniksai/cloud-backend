// src/controllers/electionController.js
const prisma = require('../config/db');

// Helper function to calculate time remaining
const calculateTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null; // Election has ended

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`;
};

// Helper function to update election statuses based on current time
const updateElectionStatuses = async () => {
    const now = new Date();

    try {
        // Update elections to LIVE if startTime has passed and status is UPCOMING
        await prisma.election.updateMany({
            where: {
                startTime: {
                    lte: now
                },
                status: 'UPCOMING'
            },
            data: {
                status: 'LIVE'
            }
        });

        // Update elections to ENDED if endTime has passed and status is LIVE
        await prisma.election.updateMany({
            where: {
                endTime: {
                    lte: now
                },
                status: 'LIVE'
            },
            data: {
                status: 'ENDED'
            }
        });

        console.log('Election statuses updated based on current time');
    } catch (error) {
        console.error('Error updating election statuses:', error);
    }
};

// GET /api/elections/results - Get all election results and history
exports.getElectionResults = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // First, update election statuses based on current time
        await updateElectionStatuses();

        // Get user details to filter by constituency
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch all elections for the user's constituency with candidates and vote counts
        const elections = await prisma.election.findMany({
            where: {
                constituency: user.citizen.constituency
            },
            include: {
                candidates: {
                    orderBy: {
                        voteCount: 'desc'
                    },
                    select: {
                        id: true,
                        name: true,
                        party: true,
                        symbol: true,
                        keyPoints: true,
                        voteCount: true,
                        age: true,
                        education: true,
                        experience: true
                    }
                },
                votes: {
                    select: {
                        id: true,
                        timestamp: true
                    }
                }
            },
            orderBy: {
                endTime: 'desc' // Most recent elections first
            }
        });

        // Add calculated fields to each election
        const electionsWithDetails = elections.map(election => ({
            ...election,
            totalVotes: election.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0),
            timeRemaining: election.status === 'LIVE' ? calculateTimeRemaining(election.endTime) : null,
            winner: election.status === 'ENDED'
                ? election.candidates.reduce((winner, candidate) =>
                    candidate.voteCount > (winner?.voteCount || 0) ? candidate : winner
                    , null)
                : null
        }));

        // Log dashboard access
        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: "VIEWED_ELECTION_RESULTS",
                ipAddress: req.ip
            }
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
        const userId = req.user.user_id;

        // Update statuses first
        await updateElectionStatuses();

        const election = await prisma.election.findUnique({
            where: { id },
            include: {
                candidates: {
                    orderBy: {
                        voteCount: 'desc'
                    },
                    select: {
                        id: true,
                        name: true,
                        party: true,
                        symbol: true,
                        keyPoints: true,
                        voteCount: true,
                        age: true,
                        education: true,
                        experience: true
                    }
                },
                votes: {
                    include: {
                        user: {
                            include: {
                                citizen: {
                                    select: {
                                        constituency: true,
                                        ward: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!election) {
            return res.status(404).json({ message: "Election not found" });
        }

        // Calculate additional analytics
        const totalVotes = election.candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
        const winner = election.status === 'ENDED'
            ? election.candidates.reduce((winner, candidate) =>
                candidate.voteCount > (winner?.voteCount || 0) ? candidate : winner
                , null)
            : null;

        // Vote timeline (anonymized)
        const voteTimeline = election.votes
            .map(vote => ({
                timestamp: vote.timestamp,
                ward: vote.user.citizen.ward
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Ward-wise breakdown
        const wardBreakdown = election.votes.reduce((acc, vote) => {
            const ward = vote.user.citizen.ward;
            acc[ward] = (acc[ward] || 0) + 1;
            return acc;
        }, {});

        const response = {
            ...election,
            totalVotes,
            winner,
            timeRemaining: election.status === 'LIVE' ? calculateTimeRemaining(election.endTime) : null,
            analytics: {
                voteTimeline,
                wardBreakdown,
                turnoutPercentage: 85.2, // This would be calculated based on registered voters
                peakVotingHour: '14:00' // This would be calculated from vote timestamps
            }
        };

        res.json(response);

    } catch (err) {
        console.error("Election Details Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Background service to automatically update election statuses
exports.startElectionStatusUpdater = () => {
    // Run immediately
    updateElectionStatuses();

    // Then run every 5 minutes
    setInterval(() => {
        updateElectionStatuses();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    console.log('Election status updater started - checking every 5 minutes');
};