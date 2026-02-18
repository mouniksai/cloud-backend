// src/controllers/adminController.js
const prisma = require('../config/db');
const blockchainService = require('../blockchain/blockchainService');

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
        const chainStatus = blockchainService.getChainStatus();
        const elections = blockchainService.getElections();
        const activeElection = elections.find(e => e.status === 'LIVE');

        // Count total votes from blockchain
        const allVotes = blockchainService.getFullChain().reduce((count, block) => {
            return count + block.transactions.filter(tx => tx.type === 'VOTE').length;
        }, 0);

        res.json({
            totalVoters,
            totalVotes: allVotes,
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

        // Write election to blockchain
        const { block, election } = blockchainService.addElection({
            title,
            description,
            constituency,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            status: "LIVE"
        });

        // SECURITY: Audit Log on Blockchain
        blockchainService.addAudit({
            userId: req.user.user_id,
            action: "CREATED_ELECTION",
            details: `Created: ${title} (${constituency}) | Block: ${block.index}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: "Election Created on Blockchain",
            electionId: election.id,
            blockchain: {
                blockIndex: block.index,
                blockHash: block.hash,
                merkleRoot: block.merkleRoot
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
        const election = blockchainService.getElection(electionId);
        if (!election) {
            return res.status(404).json({ message: "Election not found on blockchain" });
        }

        // Write candidate to blockchain
        const { block, candidate } = blockchainService.addCandidate({
            electionId,
            name,
            party,
            symbol,
            age: parseInt(age),
            education,
            experience,
            keyPoints
        });

        // SECURITY: Audit Log on Blockchain
        blockchainService.addAudit({
            userId: req.user.user_id,
            action: "ADDED_CANDIDATE",
            details: `Added ${name} to election ${electionId} | Block: ${block.index}`,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: "Candidate Added to Blockchain",
            candidate: candidate,
            blockchain: {
                blockIndex: block.index,
                blockHash: block.hash,
                merkleRoot: block.merkleRoot
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 4. GET ALL ELECTIONS (from Blockchain) ---
exports.getElections = async (req, res) => {
    try {
        const elections = blockchainService.getElections();
        res.json(elections.map(e => ({
            id: e.id,
            title: e.title,
            status: e.status
        })));
    } catch (err) {
        res.status(500).json({ message: "Error fetching elections from blockchain" });
    }
};