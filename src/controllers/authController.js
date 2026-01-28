const prisma = require('../config/db'); // Import the Prisma Client
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. VERIFY IDENTITY
exports.verifyCitizen = async (req, res) => {
    try {
        const { citizenId } = req.body;

        // Prisma Query: Find unique record where citizenId matches
        const citizen = await prisma.govtRegistry.findUnique({
            where: { citizenId: citizenId }
        });

        if (!citizen) {
            return res.status(404).json({ message: "Citizen ID not found in Government Records." });
        }

        if (citizen.isRegistered) {
            return res.status(409).json({ message: "User already registered. Please login." });
        }

        res.json(citizen);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 2. REGISTER USER
exports.registerUser = async (req, res) => {
    try {
        const { citizenId, username, password } = req.body;

        // Check Username
        const existingUser = await prisma.user.findUnique({
            where: { username: username }
        });

        if (existingUser) {
            return res.status(401).json({ message: "Username already taken." });
        }

        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // Transaction: Create User AND Update Registry atomically
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the user
            const newUser = await tx.user.create({
                data: {
                    username: username,
                    passwordHash: bcryptPassword,
                    citizenId: citizenId
                }
            });

            // 2. Mark citizen as registered
            await tx.govtRegistry.update({
                where: { citizenId: citizenId },
                data: { isRegistered: true }
            });

            return newUser;
        });

        const token = jwt.sign({ user_id: result.userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, user: result });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 3. LOGIN USER
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user and include their citizen details in one query!
        const user = await prisma.user.findUnique({
            where: { username: username },
            include: { citizen: true } // JOINs the tables automatically
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign({ user_id: user.userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Remove sensitive hash before sending back
        const { passwordHash, ...userData } = user;

        res.json({ token, user: userData });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};