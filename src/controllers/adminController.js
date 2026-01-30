const prisma = require('../config/db');

// --- 0. VALIDATE ADMIN TOKEN ---
exports.validateToken = async (req, res) => {
    try {
        // This endpoint is protected by authMiddleware and roleMiddleware('admin')
        // If we reach here, the token is valid and user is an admin
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
        // Run queries in parallel for performance
        const [totalVoters, totalVotes, activeElection] = await Promise.all([
            prisma.user.count({ where: { role: 'voter' } }),
            prisma.vote.count(),
            prisma.election.findFirst({ where: { status: 'LIVE' } })
        ]);

        res.json({
            totalVoters,
            totalVotes,
            activeElection: activeElection ? activeElection.title : "No Live Election",
            status: "System Operational"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Stats Error" });
    }
};

// --- 2. CREATE ELECTION ---
exports.createElection = async (req, res) => {
    try {
        const { title, description, constituency, startTime, endTime } = req.body;

        const newElection = await prisma.election.create({
            data: {
                title,
                description,
                constituency,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: "LIVE"
            }
        });

        // SECURITY: Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.user_id,
                action: "CREATED_ELECTION",
                details: `Created: ${title} (${constituency})`,
                ipAddress: req.ip
            }
        });

        res.status(201).json({ message: "Election Created", electionId: newElection.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 3. ADD CANDIDATE TO ELECTION ---
exports.addCandidate = async (req, res) => {
    try {
        const { electionId, name, party, symbol, keyPoints, age, education, experience } = req.body;

        const newCandidate = await prisma.candidate.create({
            data: {
                electionId,
                name,
                party,
                symbol,
                age: parseInt(age),
                education,
                experience,
                keyPoints: keyPoints // Expecting array of strings
            }
        });

        // SECURITY: Audit Log
        await prisma.auditLog.create({
            data: {
                userId: req.user.user_id,
                action: "ADDED_CANDIDATE",
                details: `Added ${name} to election ${electionId}`,
                ipAddress: req.ip
            }
        });

        res.status(201).json({ message: "Candidate Added", candidate: newCandidate });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// --- 4. GET ALL ELECTIONS (For Dropdown) ---
exports.getElections = async (req, res) => {
    try {
        const elections = await prisma.election.findMany({
            select: { id: true, title: true, status: true }
        });
        res.json(elections);
    } catch (err) {
        res.status(500).json({ message: "Error fetching elections" });
    }
};