// src/routes/blockchainRoutes.js
const router = require('express').Router();
const blockchainController = require('../controllers/blockchainController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const adminGuard = [authMiddleware, roleMiddleware('admin')];

// Public endpoints
router.get('/status', blockchainController.getChainStatus);
router.get('/validate', blockchainController.validateChain);
router.get('/verify/:receiptHash', blockchainController.verifyVote);

// Admin-only endpoints
router.get('/chain', adminGuard, blockchainController.getFullChain);
router.get('/block/:index', authMiddleware, blockchainController.getBlock);

module.exports = router;
