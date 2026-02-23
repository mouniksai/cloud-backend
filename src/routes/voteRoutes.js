const router = require('express').Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

// Route: GET /api/vote/ballot (temporarily without auth for testing)
router.get('/ballot', voteController.getBallot);

// Route: POST /api/vote/cast
router.post('/cast', authMiddleware, voteController.castVote);

// Route: POST /api/vote/verify-receipt (Encoding/Decoding demonstration)
router.post('/verify-receipt', authMiddleware, voteController.verifyEncodedReceipt);

// Route: POST /api/vote/verify-signature (Digital Signature Verification)
router.post('/verify-signature', voteController.verifyDigitalSignature);

// Route: GET /api/vote/decrypt/:voteId (Decryption demonstration)
router.get('/decrypt/:voteId', authMiddleware, voteController.decryptVoteDetails);

module.exports = router;