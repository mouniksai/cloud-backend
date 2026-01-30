// src/routes/electionRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const electionController = require('../controllers/electionController');

// GET /api/elections/results - Get all election results and history
router.get('/results', verifyToken, electionController.getElectionResults);

// GET /api/elections/:id/details - Get detailed results for a specific election
router.get('/:id/details', verifyToken, electionController.getElectionDetails);

module.exports = router;