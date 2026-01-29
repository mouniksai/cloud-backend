// src/controllers/adminController.js
const prisma = require('../config/db');

exports.createElection = async (req, res) => {
    try {
        const { title, description, constituency, startTime, endTime } = req.body;

        // 1. Create Election in DB
        const newElection = await prisma.election.create({
            data: {
                title,
                description,
                constituency,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: "LIVE" // For demo purposes, we set it live immediately
            }
        });

        // 2. SECURITY: Create Audit Log (Non-repudiation)
        await prisma.auditLog.create({
            data: {
                userId: req.user.user_id, // The admin's ID
                action: "CREATED_ELECTION",
                details: `Created election: ${title} for ${constituency}`,
                ipAddress: req.ip
            }
        });

        res.status(201).json({ message: "Election created successfully", election: newElection });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};