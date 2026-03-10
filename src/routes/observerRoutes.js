// src/routes/observerRoutes.js
// NEW FILE - Observer Dashboard API Routes

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { generalLimiter } = require('../middleware/rateLimitMiddleware');
const observerController = require('../controllers/observerController');

// Apply rate limiting to all observer routes
router.use(generalLimiter);

// Apply authentication middleware (observers must be logged in)
router.use(authMiddleware);

/**
 * GET /api/observer/live-stats
 * Get real-time election statistics for monitoring
 * Read-only access - no modifications allowed
 */
router.get('/live-stats', observerController.getLiveStats);

/**
 * GET /api/observer/audit-logs
 * Retrieve paginated audit logs from blockchain
 * Query params: ?limit=20&offset=0
 */
router.get('/audit-logs', observerController.getAuditLogs);

/**
 * GET /api/observer/anomalies
 * Detect and report statistical anomalies
 * Returns suspicious voting patterns
 */
router.get('/anomalies', observerController.getAnomalies);

/**
 * GET /api/observer/constituency/:constituencyName
 * Get detailed statistics for a specific constituency
 */
router.get('/constituency/:constituencyName', observerController.getConstituencyStats);

/**
 * GET /api/observer/blockchain-status
 * Get blockchain health and sync status
 */
router.get('/blockchain-status', observerController.getBlockchainStatus);

module.exports = router;
