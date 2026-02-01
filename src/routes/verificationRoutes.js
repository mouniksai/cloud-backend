const router = require('express').Router();
const verificationController = require('../controllers/verificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/face', authMiddleware, verificationController.verifyFace);
router.post('/token', authMiddleware, verificationController.validateToken);

module.exports = router;