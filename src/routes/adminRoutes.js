const router = require('express').Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Only Admins can hit this route
router.post('/create-election', 
    authMiddleware, 
    roleMiddleware('admin'), 
    adminController.createElection
);

module.exports = router;