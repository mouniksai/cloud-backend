// src/controllers/dashboardController.js
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
    } catch (error) {
        console.error('Error updating election statuses:', error);
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // First, update election statuses based on current time
        await updateElectionStatuses();

        // 1. Fetch User & Citizen Details
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Fetch Active Elections for THIS User's Constituency
        // Only show LIVE elections where user hasn't voted and election hasn't ended
        const activeElection = await prisma.election.findFirst({
            where: {
                constituency: user.citizen.constituency,
                status: "LIVE",
                endTime: {
                    gt: new Date() // Election end time is in the future
                },
                // Exclude elections where user has already voted
                NOT: {
                    votes: {
                        some: {
                            userId: userId
                        }
                    }
                }
            }
        });

        // 3. Fetch User's Actual Voting History
        const userVotes = await prisma.vote.findMany({
            where: { userId },
            include: {
                election: true,
                candidate: true
            },
            orderBy: { timestamp: 'desc' }
        });

        const history = userVotes.map(vote => ({
            id: vote.id,
            election: vote.election.title,
            candidate: vote.candidate.name,
            date: vote.timestamp.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            receiptHash: vote.receiptHash,
            status: "Confirmed"
        }));

        // 4. Construct Response matching your Frontend Props
        const dashboardData = {
            userSession: {
                name: user.citizen.fullName,
                citizenId: user.citizen.citizenId,
                constituency: user.citizen.constituency,
                ward: user.citizen.ward,
                verified: user.citizen.isRegistered,
                lastLogin: "Just Now"
            },
            activeElection: activeElection ? {
                id: activeElection.id,
                title: activeElection.title,
                description: activeElection.description,
                endsIn: calculateTimeRemaining(activeElection.endTime) || "00h : 00m",
                status: activeElection.status,
                eligible: true
            } : null, // If null, frontend should show "No Active Elections"
            history: history
        };

        // 5. SECURITY: Log that user viewed dashboard
        await prisma.auditLog.create({
            data: {
                userId: userId,
                action: "VIEWED_DASHBOARD",
                ipAddress: req.ip
            }
        });

        res.json(dashboardData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};