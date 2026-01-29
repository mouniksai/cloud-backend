// src/controllers/voteController.js
const prisma = require('../config/db');
const { generateReceiptHash } = require('../utils/cryptoUtils');

// --- 1. GET BALLOT (Fetch Candidates) ---
exports.getBallot = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // A. Get User's Constituency
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // B. Find LIVE Election for this constituency
        const election = await prisma.election.findFirst({
            where: {
                constituency: user.citizen.constituency,
                status: "LIVE"
            },
            include: {
                candidates: {
                    select: { id: true, name: true, party: true, symbol: true, keyPoints: true }
                }
            }
        });

        if (!election) {
            return res.status(404).json({ message: "No live election found for your constituency." });
        }

        // C. Check if User already voted
        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_electionId: { userId, electionId: election.id }
            }
        });

        if (existingVote) {
            return res.status(403).json({ 
                message: "You have already cast your vote.",
                hasVoted: true,
                receiptHash: existingVote.receiptHash,
                timestamp: existingVote.timestamp
            });
        }

        // D. Return Ballot
        res.json({
            election: {
                id: election.id,
                title: election.title,
                constituency: election.constituency,
                endsAt: election.endTime
            },
            candidates: election.candidates,
            hasVoted: false
        });

    } catch (err) {
        console.error("Ballot Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 2. CAST VOTE (Atomic Transaction) ---
exports.castVote = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { electionId, candidateId } = req.body;

        // A. Generate Receipt Hash (Integrity)
        const receiptHash = generateReceiptHash(userId, electionId, candidateId);

        // B. ATOMIC TRANSACTION
        // Prisma ensures all these 4 steps succeed or fail together.
        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Double-Vote Check (Locking)
            const alreadyVoted = await tx.vote.findUnique({
                where: { userId_electionId: { userId, electionId } }
            });
            if (alreadyVoted) throw new Error("DOUBLE_VOTE_ATTEMPT");

            // 2. Record the Vote
            const newVote = await tx.vote.create({
                data: {
                    userId,
                    electionId,
                    candidateId,
                    receiptHash
                }
            });

            // 3. Update Candidate Tally (Real-time Analytics)
            await tx.candidate.update({
                where: { id: candidateId },
                data: { voteCount: { increment: 1 } }
            });

            // 4. Create Audit Log (Non-Repudiation)
            await tx.auditLog.create({
                data: {
                    userId,
                    action: "CAST_VOTE",
                    details: `Voted in election ${electionId} | Receipt: ${receiptHash}`,
                    ipAddress: req.ip
                }
            });

            return newVote;
        });

        // C. Success Response
        res.json({
            success: true,
            message: "Vote cast successfully",
            receiptHash: result.receiptHash,
            timestamp: result.timestamp
        });

    } catch (err) {
        console.error("Voting Error:", err);
        if (err.message === "DOUBLE_VOTE_ATTEMPT" || err.code === 'P2002') {
            return res.status(409).json({ message: "You have already voted in this election." });
        }
        res.status(500).json({ message: "Vote Casting Failed." });
    }
};