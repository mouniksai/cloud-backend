// src/middleware/roleMiddleware.js
module.exports = (requiredRole) => {
    return (req, res, next) => {
        // req.user is populated by the authMiddleware
        if (!req.user || req.user.role !== requiredRole) {
            console.warn(`[SECURITY] Unauthorized Access Attempt by User: ${req.user?.user_id}`);
            return res.status(403).json({ message: "Access Forbidden: Insufficient Permissions" });
        }
        next();
    };
};