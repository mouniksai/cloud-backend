const express = require('express');
const router = express.Router();
const keyExchangeService = require('../utils/keyExchangeService');

/**
 * @route   GET /api/keys/public-key
 * @desc    Get server's RSA public key for secure key exchange
 * @access  Public (no authentication required)
 */
router.get('/public-key', (req, res) => {
    try {
        const publicKey = keyExchangeService.getPublicKey();

        res.json({
            success: true,
            publicKey: publicKey,
            algorithm: 'RSA-2048',
            usage: 'Encrypt sensitive data with this public key before sending to server',
            format: 'PEM'
        });
    } catch (error) {
        console.error('Error retrieving public key:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve public key',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/keys/info
 * @desc    Get key exchange mechanism information
 * @access  Public
 */
router.get('/info', (req, res) => {
    try {
        const info = keyExchangeService.getKeyExchangeInfo();

        res.json({
            success: true,
            keyExchange: info,
            description: 'RSA-based key exchange mechanism for secure communication'
        });
    } catch (error) {
        console.error('Error retrieving key info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve key information',
            error: error.message
        });
    }
});

module.exports = router;
