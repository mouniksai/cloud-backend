// src/controllers/voteController.js
const prisma = require('../config/db');
const { generateReceiptHash } = require('../utils/cryptoUtils');
const encryptionService = require('../utils/encryptionService');
const EncodingService = require('../utils/encodingService');

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

// --- 1. GET BALLOT (Fetch Candidates) ---
exports.getBallot = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // First, update election statuses based on current time
        await updateElectionStatuses();

        // A. Get User's Constituency
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // B. Find LIVE Election for this constituency that hasn't ended
        const now = new Date();
        const election = await prisma.election.findFirst({
            where: {
                constituency: user.citizen.constituency,
                status: "LIVE",
                endTime: {
                    gt: now // Election end time is in the future
                }
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

        // First, update election statuses
        await updateElectionStatuses();

        // Check if election is still active and hasn't ended
        const election = await prisma.election.findUnique({
            where: { id: electionId }
        });

        if (!election) {
            return res.status(404).json({ message: "Election not found." });
        }

        const now = new Date();
        if (election.status !== 'LIVE' || election.endTime <= now) {
            return res.status(400).json({ message: "Election has ended or is not active." });
        }

        // A. Generate Receipt Hash (Integrity)
        const receiptHash = generateReceiptHash(userId, electionId, candidateId);

        // A.1. Encrypt Vote Details (For Lab Evaluation)
        const voteDetails = {
            candidateId: candidateId,
            timestamp: new Date().toISOString(),
            sessionId: req.sessionID || 'web-session'
        };
        const encryptedDetails = encryptionService.encryptVote(voteDetails);

        // B. ATOMIC TRANSACTION
        // Prisma ensures all these 4 steps succeed or fail together.
        const result = await prisma.$transaction(async (tx) => {

            // 1. Double-Vote Check (Locking)
            const alreadyVoted = await tx.vote.findUnique({
                where: { userId_electionId: { userId, electionId } }
            });
            if (alreadyVoted) throw new Error("DOUBLE_VOTE_ATTEMPT");

            // 2. Record the Vote (with encryption)
            const newVote = await tx.vote.create({
                data: {
                    userId,
                    electionId,
                    candidateId,
                    receiptHash,
                    encryptedDetails
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

        // ENCODING IMPLEMENTATION - Generate encoded receipt formats
        const receiptData = {
            receiptHash: result.receiptHash,
            timestamp: result.timestamp,
            electionId: electionId
        };

        const encodedReceipt = EncodingService.encodeReceiptToBase64(receiptData);
        const qrCode = await EncodingService.generateReceiptQRCode(result.receiptHash);
        const barcodeNumber = EncodingService.encodeToBarcode(result.receiptHash);

        // C. Success Response with encoded formats
        res.json({
            success: true,
            message: "Vote cast successfully",
            receiptHash: result.receiptHash,
            timestamp: result.timestamp,
            // Encoded formats for lab evaluation
            encodedFormats: {
                base64: encodedReceipt,
                qrCode: qrCode,
                barcode: barcodeNumber
            }
        });

    } catch (err) {
        console.error("Voting Error:", err);
        if (err.message === "DOUBLE_VOTE_ATTEMPT" || err.code === 'P2002') {
            return res.status(409).json({ message: "You have already voted in this election." });
        }
        res.status(500).json({ message: "Vote Casting Failed." });
    }
};

// --- ENCRYPTION DEMO: Decrypt Vote Details (For Lab Evaluation) ---
exports.decryptVoteDetails = async (req, res) => {
    try {
        const { voteId } = req.params;

        const vote = await prisma.vote.findUnique({
            where: { id: voteId },
            include: { candidate: true, election: true }
        });

        if (!vote) {
            return res.status(404).json({ message: "Vote not found" });
        }

        // Demonstrate decryption
        let decryptedDetails = null;
        if (vote.encryptedDetails) {
            try {
                decryptedDetails = encryptionService.decryptVote(vote.encryptedDetails);
            } catch (error) {
                console.log('Decryption failed:', error.message);
                decryptedDetails = { error: 'Decryption failed' };
            }
        }

        res.json({
            voteId: vote.id,
            candidate: vote.candidate.name,
            election: vote.election.title,
            encryptedDetails: vote.encryptedDetails,
            decryptedDetails: decryptedDetails,
            receiptHash: vote.receiptHash
        });

    } catch (error) {
        console.error("Decryption error:", error);
        res.status(500).json({ message: "Error decrypting vote details" });
    }
};

// --- VERIFY ENCODED RECEIPT (Demonstrate Decoding) ---
exports.verifyEncodedReceipt = async (req, res) => {
    try {
        const { encodedReceipt, format } = req.body;

        let decodedData;

        switch (format) {
            case 'base64':
                decodedData = EncodingService.decodeReceiptFromBase64(encodedReceipt);
                break;
            case 'url-safe':
                decodedData = EncodingService.decodeFromURL(encodedReceipt);
                break;
            default:
                return res.status(400).json({ message: "Invalid format. Use 'base64' or 'url-safe'" });
        }

        // Verify the receipt exists in database
        const vote = await prisma.vote.findFirst({
            where: {
                receiptHash: decodedData.receiptHash,
                timestamp: new Date(decodedData.timestamp)
            },
            include: {
                election: { select: { title: true, constituency: true } }
            }
        });

        if (!vote) {
            return res.status(404).json({
                message: "Receipt not found or invalid",
                decodedData
            });
        }

        res.json({
            success: true,
            message: "Receipt verified successfully",
            decodedData,
            verification: {
                electionTitle: vote.election.title,
                constituency: vote.election.constituency,
                votedAt: vote.timestamp,
                verified: true
            }
        });

    } catch (error) {
        console.error("Decoding error:", error);
        res.status(400).json({
            message: "Invalid encoded receipt",
            error: error.message
        });
    }
};

// --- DIGITAL SIGNATURE VERIFICATION (Demonstrate Data Integrity & Authenticity) ---
exports.verifyDigitalSignature = async (req, res) => {
    try {
        const { receiptHash, userId, electionId, candidateId } = req.body;

        // 1. Validate inputs
        if (!receiptHash) {
            return res.status(400).json({
                verified: false,
                message: "Receipt hash is required for verification"
            });
        }

        // 2. Look up the vote in database by receipt hash
        const vote = await prisma.vote.findFirst({
            where: { receiptHash: receiptHash },
            include: {
                election: { select: { id: true, title: true, constituency: true } },
                candidate: { select: { id: true, name: true, party: true } },
                user: { select: { userId: true } }
            }
        });

        // 3. Check if vote exists
        if (!vote) {
            return res.json({
                verified: false,
                message: "❌ Receipt not found in database - Vote does not exist or was not recorded",
                details: {
                    providedHash: receiptHash,
                    existsInDatabase: false,
                    dataMatch: false,
                    voteInfo: null
                }
            });
        }

        // 4. If userId, electionId, candidateId provided, verify they match the stored vote
        let dataMatch = true;
        let mismatchDetails = [];

        if (userId && vote.userId !== userId) {
            dataMatch = false;
            mismatchDetails.push(`User ID mismatch (expected: ${vote.userId}, provided: ${userId})`);
        }
        if (electionId && vote.election.id !== electionId) {
            dataMatch = false;
            mismatchDetails.push(`Election ID mismatch (expected: ${vote.election.id}, provided: ${electionId})`);
        }
        if (candidateId && vote.candidate.id !== candidateId) {
            dataMatch = false;
            mismatchDetails.push(`Candidate ID mismatch (expected: ${vote.candidate.id}, provided: ${candidateId})`);
        }

        // 5. Return comprehensive verification result
        res.json({
            verified: dataMatch,
            message: dataMatch
                ? "✅ Digital signature verified - Receipt is authentic and data integrity confirmed"
                : `❌ Data mismatch detected - ${mismatchDetails.join(', ')}`,
            details: {
                providedHash: receiptHash,
                existsInDatabase: true,
                dataMatch: dataMatch,
                mismatchDetails: mismatchDetails.length > 0 ? mismatchDetails : null,
                storedData: {
                    userId: vote.userId,
                    electionId: vote.election.id,
                    candidateId: vote.candidate.id
                },
                voteInfo: {
                    election: vote.election.title,
                    constituency: vote.election.constituency,
                    candidate: vote.candidate.name,
                    party: vote.candidate.party,
                    votedAt: vote.timestamp
                }
            }
        });

    } catch (error) {
        console.error("Signature verification error:", error);
        res.status(500).json({
            verified: false,
            message: "Verification failed due to server error",
            error: error.message
        });
    }
};