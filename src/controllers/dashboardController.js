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
        // (Attribute-Based Access Control)
        const activeElection = await prisma.election.findFirst({
            where: {
                constituency: user.citizen.constituency,
                status: "LIVE"
            }
        });

        // 3. Fetch Audit Logs (Voting History placeholder)
        // In real app, query 'votes' table. For now, we return empty or mock.
        const history = [
            { id: 1, election: "2024 Municipal Council", date: "12 Feb 2024", txHash: "0x7f...8a", status: "Confirmed" }
        ];

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