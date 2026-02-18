// src/controllers/dashboardController.js
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

exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // 1. Fetch User & Citizen Details (still from PostgreSQL)
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Fetch Active Elections from Blockchain
        const now = new Date();
        const liveElections = blockchainService.getElections({
            constituency: user.citizen.constituency,
            status: 'LIVE'
        });

        // Find an active election where user hasn't voted
        let activeElection = null;
        for (const election of liveElections) {
            if (new Date(election.endTime) > now) {
                const hasVoted = blockchainService.hasUserVoted(userId, election.id);
                if (!hasVoted) {
                    activeElection = election;
                    break;
                }
            }
        }

        // 3. Fetch User's Voting History from Blockchain
        const userVotes = blockchainService.getUserVotes(userId);

        const history = userVotes.map(vote => {
            const election = blockchainService.getElection(vote.data.electionId);
            const candidates = blockchainService.getCandidates(vote.data.electionId);
            const candidate = candidates.find(c => c.id === vote.data.candidateId);

            return {
                id: vote.data.id,
                election: election ? election.title : 'Unknown',
                candidate: candidate ? candidate.name : 'Unknown',
                date: new Date(vote.data.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                receiptHash: vote.data.receiptHash,
                status: "Confirmed on Blockchain",
                blockIndex: vote.blockIndex,
                blockHash: vote.blockHash
            };
        });

        // Sort history by timestamp desc
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 4. Construct Response
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
            } : null,
            history: history,
            blockchain: blockchainService.getChainStatus()
        };

        // 5. SECURITY: Audit log on blockchain
        blockchainService.addAudit({
            userId: userId,
            action: "VIEWED_DASHBOARD",
            ipAddress: req.ip
        });

        res.json(dashboardData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};