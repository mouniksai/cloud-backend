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

        // Generate token with role included (critical for admin access)
        const token = jwt.sign(
            {
                user_id: result.userId,
                role: result.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Set secure cookie with production-friendly settings
        const cookieOptions = {
            httpOnly: false, // Allow frontend JavaScript access
            secure: process.env.NODE_ENV === 'production', // HTTPS in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-domain in production
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/' // Ensure cookie is available for all paths
        };

        res.cookie('voteGuardToken', token, cookieOptions);

        console.log(`[AUTH] User registered: ${result.username}, role: ${result.role}`);
        console.log(`[AUTH] Cookie settings:`, cookieOptions);
        console.log(`[AUTH] CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

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

        // Check 1: Is OTP correct?
        if (user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP Code" });
        }

        // Check 2: Is OTP expired?
        if (new Date() > new Date(user.otpExpiresAt)) {
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

        // Set secure cookie with production-friendly settings
        const cookieOptions = {
            httpOnly: false, // Allow frontend JavaScript access
            secure: process.env.NODE_ENV === 'production', // HTTPS in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-domain in production
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/' // Ensure cookie is available for all paths
        };

        res.cookie('voteGuardToken', token, cookieOptions);

        // 3. Send final data
        console.log(`[AUTH] User logged in: ${user.username}, role: ${user.role}`);
        console.log(`[AUTH] Cookie settings:`, cookieOptions);
        console.log(`[AUTH] CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

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
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Must match login cookie settings
            path: '/'
        });

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 6. FORGOT PASSWORD (STEP 1: Generate and Send OTP)
exports.forgotPassword = async (req, res) => {
    try {
        const { username } = req.body;

        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username },
            include: { citizen: true }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                otpCode: otp,
                otpExpiresAt: expiresAt
            }
        });

        // Send email
        const emailSent = await sendEmailOTP(user.citizen.email, otp);

        if (!emailSent) {
            return res.status(500).json({ message: "Failed to send email" });
        }

        // Return masked email for UI
        res.status(200).json({
            message: "OTP sent to your registered email",
            maskedEmail: user.citizen.email.replace(/(.{2})(.*)(?=@)/, "$1***"),
            userId: user.userId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 7. VERIFY RESET OTP (STEP 2: Verify OTP for password reset)
exports.verifyResetOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Check OTP
        if (user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP Code" });
        }

        // Check expiry
        if (new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        // OTP is valid
        res.status(200).json({
            message: "OTP verified successfully",
            verified: true
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// 8. RESET PASSWORD (STEP 3: Update password after OTP verification)
exports.resetPassword = async (req, res) => {
    try {
        const { userId, otp, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Verify OTP again for security
        if (user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP Code" });
        }

        if (new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        await prisma.user.update({
            where: { userId },
            data: {
                passwordHash: hashedPassword,
                otpCode: null,
                otpExpiresAt: null
            }
        });

        res.status(200).json({
            message: "Password reset successfully. You can now login with your new password."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};