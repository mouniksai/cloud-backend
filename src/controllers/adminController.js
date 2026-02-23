// src/controllers/adminController.js
const prisma = require('../config/db');
// 🔥 SEPOLIA-FIRST: Using smart contract service (no local blockchain!)
const blockchainService = require('../blockchain/blockchainServiceV2');

// --- 0. VALIDATE ADMIN TOKEN ---
exports.validateToken = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { userId: req.user.user_id },
            select: {
                userId: true,
                username: true,
                role: true,
                citizenId: true,
                citizen: {
                    select: {
                        fullName: true,
                        email: true,
                        constituency: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            valid: true,
            user: {
                user_id: user.userId,
                email: user.citizen.email,
                role: user.role,
                full_name: user.citizen.fullName,
                constituency: user.citizen.constituency,
                username: user.username
            },
            message: "Token is valid"
        });
    } catch (err) {
        console.error('Token validation error:', err);
        res.status(500).json({ message: "Token validation error" });
    }
};

// --- 1. GET SYSTEM ANALYTICS ---
exports.getSystemStats = async (req, res) => {
    try {
        // User count still from PostgreSQL
        const totalVoters = await prisma.user.count({ where: { role: 'voter' } });

        // Vote count and election info from Blockchain
        const chainStatus = await blockchainService.getChainStatus();
        const elections = await blockchainService.getElections();
        const activeElection = elections.find(e => e.status === 'LIVE');

        // Count total votes from blockchain stats
        const totalVotes = chainStatus.totalTransactions || 0;

        res.json({
            totalVoters,
            totalVotes: totalVotes,
            activeElection: activeElection ? activeElection.title : "No Live Election",
            status: "System Operational",
            blockchain: {
                chainLength: chainStatus.chainLength,
                totalTransactions: chainStatus.totalTransactions,
                isValid: chainStatus.isValid
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Stats Error" });
    }
};

// --- 2. CREATE ELECTION (on Blockchain) ---
exports.createElection = async (req, res) => {
    try {
        const { title, description, constituency, startTime, endTime } = req.body;

        // Validate required fields
        if (!title || !startTime || !endTime || !constituency) {
            return res.status(400).json({
                message: "Missing required fields",
                details: "Title, constituency, start time, and end time are required"
            });
        }

        // Validate timestamps
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Check if dates are valid
        if (isNaN(start.getTime())) {
            return res.status(400).json({
                message: "Invalid start time format",
                details: `Received: ${startTime}`
            });
        }

        if (isNaN(end.getTime())) {
            return res.status(400).json({
                message: "Invalid end time format",
                details: `Received: ${endTime}`
            });
        }

        // Allow a small buffer (30 seconds) for form submission delays
        const minStartTime = new Date(now.getTime() - 30000); // 30 seconds ago
        if (start <= minStartTime) {
            return res.status(400).json({
                message: "Start time must be in the future",
                details: `Start time: ${start.toISOString()} | Current time: ${now.toISOString()}`
            });
        }

        if (end <= start) {
            return res.status(400).json({
                message: "End time must be after start time",
                details: `Start: ${start.toISOString()} | End: ${end.toISOString()}`
            });
        }

        // Write election to blockchain
        const { block, election } = await blockchainService.addElection({
            title,
            description,
            constituency,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            status: "UPCOMING" // Elections start as UPCOMING, not LIVE
        });

        res.status(201).json({
            message: "Election Created on Blockchain",
            electionId: election.id,
            blockchain: {
                blockIndex: block.blockIndex,
                blockHash: block.blockHash,
                transactionHash: block.transactionHash
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 3. ADD CANDIDATE TO ELECTION (on Blockchain) ---
exports.addCandidate = async (req, res) => {
    try {
        const { electionId, name, party, symbol, keyPoints, age, education, experience } = req.body;

        // Verify election exists on blockchain
        const election = await blockchainService.getElection(electionId);
        if (!election) {
            return res.status(404).json({ message: "Election not found on blockchain" });
        }

        // Write candidate to blockchain (includes duplicate check)
        const { block, candidate } = await blockchainService.addCandidate({
            electionId,
            name,
            party,
            symbol,
            age: parseInt(age),
            education,
            experience,
            keyPoints
        });

        res.status(201).json({
            message: "Candidate Added to Blockchain",
            candidate: candidate,
            blockchain: {
                blockIndex: block.blockIndex,
                blockHash: block.blockHash,
                transactionHash: block.transactionHash
            }
        });

    } catch (err) {
        console.error('Add candidate error:', err);

        // Handle duplicate candidate error
        if (err.message && err.message.includes('Duplicate candidate')) {
            return res.status(409).json({
                message: err.message,
                error: "DUPLICATE_CANDIDATE"
            });
        }

        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// --- 4. GET ALL ELECTIONS (from Blockchain) ---
exports.getElections = async (req, res) => {
    try {
        const elections = await blockchainService.getElections();
        res.json(elections.map(e => ({
            id: e.id,
            title: e.title,
            status: e.status,
            constituency: e.constituency,
            startTime: e.startTime,
            endTime: e.endTime
        })));
    } catch (err) {
        console.error('Get elections error:', err);
        res.status(500).json({ message: "Error fetching elections from blockchain" });
    }
};