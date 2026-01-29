const router = require('express').Router();
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

// Route: GET /api/vote/ballot
router.get('/ballot', authMiddleware, voteController.getBallot);

// Route: POST /api/vote/cast
router.post('/cast', authMiddleware, voteController.castVote);

module.exports = router;