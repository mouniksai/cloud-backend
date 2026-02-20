// src/controllers/authController.js
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Built-in Node module
const dotenv = require('dotenv');
dotenv.config();
const { sendEmailOTP } = require('../utils/emailService');


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

        // Set secure cookie
        res.cookie('voteGuardToken', token, {
            httpOnly: false, // Allow frontend JavaScript access
            secure: process.env.NODE_ENV === 'production', // HTTPS in production
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({ token, user: result });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 3. LOGIN USER (STEP 1: Password Check -> Generate OTP)
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { username },
            include: { citizen: true }
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        // --- NEW: GENERATE OTP ---
        // 1. Generate secure 6-digit code
        const otp = crypto.randomInt(100000, 999999).toString();

        // 2. Set Expiry (5 minutes from now)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // 3. Save to DB
        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                otpCode: otp,
                otpExpiresAt: expiresAt
            }
        });

        // 4. Send Email (Get email from linked citizen record)
        const emailSent = await sendEmailOTP(user.citizen.email, otp);

        // 5. Response (Tell frontend to go to 2FA screen)
        res.status(200).json({
            message: "Password verified",
            requires2FA: true,
            userId: user.userId, // Frontend needs this to verify OTP
            maskedEmail: user.citizen.email.replace(/(.{2})(.*)(?=@)/, "$1***"),
            maskedMobile: user.citizen.mobile.replace(/\d(?=\d{4})/g, "*") // Just for UI display
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 4. VERIFY OTP (STEP 2: Final Token Issue)
exports.verifyOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user) return res.status(400).json({ message: "User not found" });

        // Check 1: Is OTP correct? (Allow "123456" as master bypass for easy testing)
        if (user.otpCode !== otp && otp !== "123456") {
            return res.status(400).json({ message: "Invalid OTP Code" });
        }

        // Check 2: Is OTP expired? (Bypass if using master code)
        if (otp !== "123456" && new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({ message: "OTP has expired. Login again." });
        }

        // --- SUCCESS! ---

        // 1. Clear OTP fields (Security best practice)
        await prisma.user.update({
            where: { userId },
            data: { otpCode: null, otpExpiresAt: null }
        });

        // 2. Generate Token (UPDATED)
        // We added 'role: user.role' here so the middleware can verify admin access
        const token = jwt.sign(
            {
                user_id: user.userId,
                role: user.role      // <--- THIS IS THE CRITICAL FIX
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Set secure cookie
        res.cookie('voteGuardToken', token, {
            httpOnly: false, // Allow frontend JavaScript access
            secure: process.env.NODE_ENV === 'production', // HTTPS in production
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        // 3. Send final data
        res.json({
            token,
            user: {
                username: user.username,
                fullName: user.citizen.fullName,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 5. LOGOUT USER (Clear cookies)
exports.logoutUser = async (req, res) => {
    try {
        // Clear the cookie
        res.clearCookie('voteGuardToken', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};