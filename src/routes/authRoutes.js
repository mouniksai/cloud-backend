const router = require('express').Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/verify-citizen', authController.verifyCitizen);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser); // Now returns requires2FA: true

router.post('/verify-otp', authController.verifyOtp); // NEW ROUTE

router.get('/dashboard', authMiddleware, (req, res) => {
    res.json({ message: "Secret Dashboard", userId: req.user.user_id });
});

module.exports = router;

