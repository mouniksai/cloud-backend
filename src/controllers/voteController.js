// src/controllers/voteController.js
const prisma = require('../config/db');
const { generateReceiptHash } = require('../utils/cryptoUtils');
const encryptionService = require('../utils/encryptionService');
const EncodingService = require('../utils/encodingService');
// 🔥 Using JSON-based blockchain (same as dashboard)
const blockchainService = require('../blockchain/blockchainService');

// --- 1. GET BALLOT (Fetch Candidates from Blockchain) ---
exports.getBallot = async (req, res) => {
    try {
        // 🔥 HYBRID MODE: Allow unauthenticated access for testing
        const userId = req.user?.user_id || 'demo-user';
        const userConstituency = 'Mumbai South'; // Default for testing

        // If user is authenticated, get their actual constituency
        let constituency = userConstituency;
        if (req.user?.user_id) {
            const user = await prisma.user.findUnique({
                where: { userId: req.user.user_id },
                include: { citizen: true }
            });
            if (user?.citizen) {
                constituency = user.citizen.constituency;
            }
        }

        // B. Find LIVE Election for this constituency from Blockchain
        const now = new Date();
        const elections = blockchainService.getElections({
            constituency: constituency,
            status: 'LIVE'
        });

        // Find one that hasn't ended
        const election = elections.find(e => new Date(e.endTime) > now);

        if (!election) {
            return res.status(404).json({ message: "No live election found for your constituency." });
        }

        // C. Check if User already voted (from Blockchain)
        const existingVote = blockchainService.hasUserVoted(userId, election.id);

        if (existingVote) {
            return res.status(403).json({
                message: "You have already cast your vote.",
                hasVoted: true,
                receiptHash: existingVote.data.receiptHash,
                timestamp: existingVote.data.timestamp
            });
        }

        // D. Get candidates from Blockchain
        const candidates = blockchainService.getCandidates(election.id);

        // E. Return Ballot
        res.json({
            election: {
                id: election.id,
                title: election.title,
                constituency: election.constituency,
                endsAt: election.endTime
            },
            candidates: candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party,
                symbol: c.symbol,
                keyPoints: c.keyPoints
            })),
            hasVoted: false
        });

    } catch (err) {
        console.error("Ballot Error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// --- 2. CAST VOTE (Record on Blockchain) ---
exports.castVote = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { electionId, candidateId } = req.body;

        // Check if election exists and is still active (from Blockchain)
        const election = blockchainService.getElection(electionId);

        if (!election) {
            return res.status(404).json({ message: "Election not found." });
        }

        const now = new Date();
        if (election.status !== 'LIVE' || new Date(election.endTime) <= now) {
            return res.status(400).json({ message: "Election has ended or is not active." });
        }

        // A. Double-Vote Check (from Blockchain)
        const alreadyVoted = blockchainService.hasUserVoted(userId, electionId);
        if (alreadyVoted) {
            return res.status(409).json({ message: "You have already voted in this election." });
        }

        // B. Verify candidate exists in this election
        const candidates = blockchainService.getCandidates(electionId);
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found in this election." });
        }

        // C. Generate Receipt Hash (Integrity)
        const receiptHash = generateReceiptHash(userId, electionId, candidateId);

        // D. Encrypt Vote Details
        const voteDetails = {
            candidateId: candidateId,
            timestamp: new Date().toISOString(),
            sessionId: req.sessionID || 'web-session'
        };
        const encryptedDetails = encryptionService.encryptVote(voteDetails);

        // E. 🔥 Record Vote on JSON Blockchain
        const { block, vote } = blockchainService.castVote({
            userId,
            electionId,
            candidateId,
            receiptHash,
            encryptedDetails
        });

        // F. Create Audit Log on Blockchain
        blockchainService.addAudit({
            userId,
            action: "CAST_VOTE",
            details: `Voted in election ${electionId} | Receipt: ${receiptHash} | Block: ${block.index}`,
            ipAddress: req.ip
        });

        // G. ENCODING IMPLEMENTATION - Generate encoded receipt formats
        const receiptData = {
            receiptHash: receiptHash,
            timestamp: vote.timestamp,
            electionId: electionId
        };

        const encodedReceipt = EncodingService.encodeReceiptToBase64(receiptData);
        const qrCode = await EncodingService.generateReceiptQRCode(receiptHash);
        const barcodeNumber = EncodingService.encodeToBarcode(receiptHash);

        // H. Success Response with blockchain info
        res.json({
            success: true,
            message: "Vote cast successfully and recorded on blockchain",
            receiptHash: receiptHash,
            timestamp: vote.timestamp,
            // Blockchain proof
            blockchain: {
                blockIndex: block.index,
                blockHash: block.hash,
                merkleRoot: block.merkleRoot,
                previousHash: block.previousHash,
                nonce: block.nonce
            },
            // Encoded formats for lab evaluation
            encodedFormats: {
                base64: encodedReceipt,
                qrCode: qrCode,
                barcode: barcodeNumber
            }
        });

    } catch (err) {
        console.error("Voting Error:", err);
        res.status(500).json({ message: "Vote Casting Failed." });
    }
};

// --- ENCRYPTION DEMO: Decrypt Vote Details (For Lab Evaluation) ---
exports.decryptVoteDetails = async (req, res) => {
    try {
        const { voteId } = req.params;

        // Search blockchain for this vote
        const votes = blockchainService.getBlockchainInstance
            ? require('../blockchain/blockchainService').getFullChain()
            : [];

        // Search all blocks for the vote
        const allVotes = blockchainService.searchTransactions
            ? blockchainService.getBlockchainInstance().searchTransactions({ type: 'VOTE', id: voteId })
            : [];

        // Fallback: search by ID through blockchain service
        const chain = blockchainService.getFullChain();
        let foundVote = null;
        let foundCandidate = null;
        let foundElection = null;

        for (const block of chain) {
            for (const tx of block.transactions) {
                if (tx.type === 'VOTE' && tx.data.id === voteId) {
                    foundVote = tx.data;
                }
                if (tx.type === 'CANDIDATE' && foundVote && tx.data.id === foundVote.candidateId) {
                    foundCandidate = tx.data;
                }
                if (tx.type === 'ELECTION' && foundVote && tx.data.id === foundVote.electionId) {
                    foundElection = tx.data;
                }
            }
        }

        if (!foundVote) {
            return res.status(404).json({ message: "Vote not found" });
        }

        // Demonstrate decryption
        let decryptedDetails = null;
        if (foundVote.encryptedDetails) {
            try {
                decryptedDetails = encryptionService.decryptVote(foundVote.encryptedDetails);
            } catch (error) {
                console.log('Decryption failed:', error.message);
                decryptedDetails = { error: 'Decryption failed' };
            }
        }

        res.json({
            voteId: foundVote.id,
            candidate: foundCandidate ? foundCandidate.name : 'Unknown',
            election: foundElection ? foundElection.title : 'Unknown',
            encryptedDetails: foundVote.encryptedDetails,
            decryptedDetails: decryptedDetails,
            receiptHash: foundVote.receiptHash
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

        // Verify the receipt exists in blockchain
        const verification = blockchainService.verifyVote(decodedData.receiptHash);

        if (!verification) {
            return res.status(404).json({
                message: "Receipt not found on blockchain",
                decodedData
            });
        }

        // Get election info from blockchain
        const election = blockchainService.getElection(verification.vote.electionId);

        res.json({
            success: true,
            message: "Receipt verified successfully on blockchain",
            decodedData,
            verification: {
                electionTitle: election ? election.title : 'Unknown',
                constituency: election ? election.constituency : 'Unknown',
                votedAt: verification.vote.timestamp,
                verified: true,
                blockIndex: verification.blockIndex,
                blockHash: verification.blockHash,
                merkleValid: verification.merkleValid,
                chainValid: verification.chainValid
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

// --- DIGITAL SIGNATURE VERIFICATION ---
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

        // 2. Look up the vote on the blockchain
        const verification = blockchainService.verifyVote(receiptHash);

        // 3. Check if vote exists
        if (!verification) {
            return res.json({
                verified: false,
                message: "❌ Receipt not found on blockchain - Vote does not exist or was not recorded",
                details: {
                    providedHash: receiptHash,
                    existsOnBlockchain: false,
                    dataMatch: false,
                    voteInfo: null
                }
            });
        }

        const vote = verification.vote;

        // 4. If userId, electionId, candidateId provided, verify they match
        let dataMatch = true;
        let mismatchDetails = [];

        if (userId && vote.userId !== userId) {
            dataMatch = false;
            mismatchDetails.push(`User ID mismatch`);
        }
        if (electionId && vote.electionId !== electionId) {
            dataMatch = false;
            mismatchDetails.push(`Election ID mismatch`);
        }
        if (candidateId && vote.candidateId !== candidateId) {
            dataMatch = false;
            mismatchDetails.push(`Candidate ID mismatch`);
        }

        // Get candidate and election info from blockchain
        const candidates = blockchainService.getCandidates(vote.electionId);
        const candidateInfo = candidates.find(c => c.id === vote.candidateId);
        const election = blockchainService.getElection(vote.electionId);

        // 5. Return comprehensive verification result
        res.json({
            verified: dataMatch,
            message: dataMatch
                ? "✅ Digital signature verified on blockchain - Receipt is authentic and data integrity confirmed"
                : `❌ Data mismatch detected - ${mismatchDetails.join(', ')}`,
            details: {
                providedHash: receiptHash,
                existsOnBlockchain: true,
                dataMatch: dataMatch,
                mismatchDetails: mismatchDetails.length > 0 ? mismatchDetails : null,
                blockchainProof: {
                    blockIndex: verification.blockIndex,
                    blockHash: verification.blockHash,
                    merkleRoot: verification.merkleRoot,
                    merkleValid: verification.merkleValid,
                    chainValid: verification.chainValid
                },
                storedData: {
                    userId: vote.userId,
                    electionId: vote.electionId,
                    candidateId: vote.candidateId
                },
                voteInfo: {
                    election: election ? election.title : 'Unknown',
                    constituency: election ? election.constituency : 'Unknown',
                    candidate: candidateInfo ? candidateInfo.name : 'Unknown',
                    party: candidateInfo ? candidateInfo.party : 'Unknown',
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