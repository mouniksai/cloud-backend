const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
    // 1. Get token from header or cookie
    let token = req.header('Authorization');

    // If no Authorization header, check cookies
    if (!token && req.cookies && req.cookies.voteGuardToken) {
        token = `Bearer ${req.cookies.voteGuardToken}`;
    }

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    // 2. Verify token
    try {
        // Remove "Bearer " prefix if present (Frontend often sends "Bearer <token>")
        const bearerToken = token.startsWith("Bearer ") ? token.slice(7, token.length) : token;

        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);

        // 3. Add user payload to request object
        req.user = decoded;
        next(); // Move to the next function (the controller)

    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};