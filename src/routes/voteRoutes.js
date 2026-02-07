const router = require('express').Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

// Route: GET /api/vote/ballot
router.get('/ballot', authMiddleware, voteController.getBallot);

// Route: POST /api/vote/cast
router.post('/cast', authMiddleware, voteController.castVote);

// Route: POST /api/vote/verify-receipt (Encoding/Decoding demonstration)
router.post('/verify-receipt', authMiddleware, voteController.verifyEncodedReceipt);

// Route: POST /api/vote/verify-signature (Digital Signature Verification)
router.post('/verify-signature', voteController.verifyDigitalSignature);

module.exports = router;