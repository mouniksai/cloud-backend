// src/routes/publicRoutes.js
// NEW FILE - Public Verification API Routes (No Authentication Required)

const express = require('express');
const router = express.Router();
const { publicLimiter } = require('../middleware/rateLimitMiddleware');
const publicController = require('../controllers/publicController');

// Apply public rate limiting (more permissive than auth routes)
router.use(publicLimiter);

/**
 * POST /api/public/verify-receipt
 * Verify a vote receipt hash without authentication
 * Body: { receiptHash: "0x..." }
 */
router.post('/verify-receipt', publicController.verifyReceipt);

/**
 * GET /api/public/election-results/:electionId
 * Get public election results (for ended elections only)
 */
router.get('/election-results/:electionId', publicController.getElectionResults);

/**
 * GET /api/public/blockchain/:blockIndex
 * Public blockchain explorer - view specific block
 */
router.get('/blockchain/:blockIndex', publicController.getBlockInfo);

/**
 * GET /api/public/election-list
 * Get list of all public elections (metadata only)
 */
router.get('/election-list', publicController.getPublicElectionList);

/**
 * GET /api/public/stats
 * Get public aggregated statistics (no personal data)
 */
router.get('/stats', publicController.getPublicStats);

module.exports = router;
