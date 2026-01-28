const router = require('express').Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/verify-citizen', authController.verifyCitizen);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // req.user comes from the middleware!
        // We can use it to fetch data specific to this user
        
        // Example: Fetch user details again (or just return the ID)
        res.json({ 
            message: "Welcome to the Secret Dashboard!", 
            userID: req.user.user_id 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;

