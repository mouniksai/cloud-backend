// src/middleware/rateLimitMiddleware.js
// NEW FILE - DDoS Protection and Attack Resilience

const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.warn(`[RATE LIMIT] IP ${req.ip} exceeded general rate limit`);
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please slow down.',
            retryAfter: '15 minutes'
        });
    }
});

/**
 * Authentication Rate Limiter (Stricter)
 * Limits: 5 login attempts per 15 minutes per IP
 * Prevents brute-force attacks
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        success: false,
        message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
        retryAfter: '15 minutes'
    },
    handler: (req, res) => {
        console.warn(`[SECURITY ALERT] Potential brute-force attack from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many failed login attempts. Account temporarily locked.',
            retryAfter: '15 minutes',
            securityAlert: true
        });
    }
});

/**
 * Vote Casting Rate Limiter
 * Limits: 10 vote attempts per hour per IP
 * Prevents vote spamming
 */
const voteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Maximum 10 vote attempts per hour
    message: {
        success: false,
        message: 'Too many vote attempts. Please wait before trying again.',
        retryAfter: '1 hour'
    },
    handler: (req, res) => {
        console.warn(`[VOTE SECURITY] Suspicious voting activity from IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Unusual voting activity detected. Please contact support if this is an error.',
            retryAfter: '1 hour'
        });
    }
});

/**
 * Public API Rate Limiter (More Permissive)
 * Limits: 200 requests per 15 minutes per IP
 * For public verification endpoints
 */
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Higher limit for public access
    message: {
        success: false,
        message: 'Too many verification requests. Please try again later.',
        retryAfter: '15 minutes'
    }
});

/**
 * Admin API Rate Limiter
 * Limits: 50 requests per 15 minutes per IP
 * For admin operations
 */
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: {
        success: false,
        message: 'Too many admin requests. Please slow down.',
        retryAfter: '15 minutes'
    },
    handler: (req, res) => {
        console.warn(`[ADMIN SECURITY] Rate limit exceeded for admin IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Admin rate limit exceeded.',
            retryAfter: '15 minutes'
        });
    }
});

/**
 * Election Creation Rate Limiter (Very Strict)
 * Limits: 10 elections per hour
 */
const electionCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        message: 'Too many elections created. Please wait.',
        retryAfter: '1 hour'
    }
});

/**
 * Get Rate Limit Statistics
 * For security monitoring dashboard
 */
const getRateLimitStats = (req, res, next) => {
    // This would typically query Redis or a database
    // For now, return mock data structure
    req.rateLimitStats = {
        general: { remaining: 85, limit: 100, resetTime: new Date(Date.now() + 15 * 60 * 1000) },
        auth: { remaining: 4, limit: 5, resetTime: new Date(Date.now() + 15 * 60 * 1000) },
        vote: { remaining: 8, limit: 10, resetTime: new Date(Date.now() + 60 * 60 * 1000) }
    };
    next();
};

/**
 * IP Blacklist Middleware
 * Blocks known malicious IPs
 */
const ipBlacklist = new Set([
    // Add known malicious IPs here
    // Example: '192.168.1.1'
]);

const checkBlacklist = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    if (ipBlacklist.has(clientIp)) {
        console.error(`[SECURITY] Blocked request from blacklisted IP: ${clientIp}`);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Your IP has been blocked due to suspicious activity.',
            contact: 'support@voteguard.com'
        });
    }

    next();
};

/**
 * Add IP to blacklist (for admin use)
 */
const addToBlacklist = (ip) => {
    ipBlacklist.add(ip);
    console.log(`[SECURITY] IP ${ip} added to blacklist`);
};

/**
 * Remove IP from blacklist (for admin use)
 */
const removeFromBlacklist = (ip) => {
    ipBlacklist.delete(ip);
    console.log(`[SECURITY] IP ${ip} removed from blacklist`);
};

/**
 * Get current blacklist
 */
const getBlacklist = () => {
    return Array.from(ipBlacklist);
};

module.exports = {
    generalLimiter,
    authLimiter,
    voteLimiter,
    publicLimiter,
    adminLimiter,
    electionCreationLimiter,
    getRateLimitStats,
    checkBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist
};
