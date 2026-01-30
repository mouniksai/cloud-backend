const router = require('express').Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const adminGuard = [authMiddleware, roleMiddleware('admin')];

router.get('/validate-token', adminGuard, adminController.validateToken);
router.get('/stats', adminGuard, adminController.getSystemStats);
router.get('/elections', adminGuard, adminController.getElections); // For dropdowns
router.post('/create-election', adminGuard, adminController.createElection);
router.post('/add-candidate', adminGuard, adminController.addCandidate);

module.exports = router;