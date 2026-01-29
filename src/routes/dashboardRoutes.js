const router = require('express').Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Any logged in user can hit this
router.get('/', authMiddleware, dashboardController.getDashboardData);

module.exports = router;