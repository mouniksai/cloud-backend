// src/controllers/dashboardController.js
const prisma = require('../config/db');

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // 1. Fetch User & Citizen Details
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Fetch Active Elections for THIS User's Constituency
        // AND check if user has NOT already voted
        const activeElection = await prisma.election.findFirst({
            where: {
                constituency: user.citizen.constituency,
                status: "LIVE",
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
                citizenId: user.citizen.citizenId, // Mask this in frontend if needed
                constituency: user.citizen.constituency,
                ward: user.citizen.ward,
                verified: user.citizen.isRegistered,
                lastLogin: "Just Now"
            },
            activeElection: activeElection ? {
                id: activeElection.id,
                title: activeElection.title,
                description: activeElection.description,
                endsIn: "04h : 00m", // You can calculate this based on endTime
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