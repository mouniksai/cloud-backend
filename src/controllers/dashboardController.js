// src/controllers/dashboardController.js
const prisma = require('../config/db');
// 🔥 SEPOLIA-FIRST: Using smart contract service (no local blockchain!)
const blockchainService = require('../blockchain/blockchainServiceV2');

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
        const liveElections = await blockchainService.getElections({
            constituency: user.citizen.constituency,
            status: 'LIVE'
        });

        // Find an active election where user hasn't voted
        let activeElection = null;
        for (const election of liveElections) {
            if (new Date(election.endTime) > now) {
                const hasVoted = await blockchainService.hasUserVoted(userId, election.id);
                if (!hasVoted) {
                    activeElection = election;
                    break;
                }
            }
        }

        // 3. Fetch User's Voting History from Blockchain
        const userVotes = await blockchainService.getUserVotes(userId);

        const history = await Promise.all(userVotes.map(async vote => {
            const election = await blockchainService.getElection(vote.electionId);
            const candidates = await blockchainService.getCandidates(vote.electionId);
            const candidate = candidates.find(c => c.id === vote.candidateId);

            return {
                id: vote.id,
                election: election ? election.title : 'Unknown',
                candidate: candidate ? candidate.name : 'Unknown',
                date: new Date(vote.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                receiptHash: vote.receiptHash,
                status: "Confirmed on Blockchain",
                blockIndex: 0,
                blockHash: '0x0'
            };
        }));

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
            blockchain: await blockchainService.getChainStatus()
        };

        res.json(dashboardData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};