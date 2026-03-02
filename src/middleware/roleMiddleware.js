// src/middleware/roleMiddleware.js
module.exports = (requiredRole) => {
    return (req, res, next) => {
        // req.user is populated by the authMiddleware
        if (!req.user) {
            console.warn(`[SECURITY] No user object in request for ${req.path}`);
            return res.status(403).json({ message: "Access Forbidden: No user authentication" });
        }
        
        if (req.user.role !== requiredRole) {
            console.warn(`[SECURITY] Unauthorized Access Attempt by User: ${req.user?.user_id}, has role: ${req.user?.role}, requires: ${requiredRole}`);
            return res.status(403).json({ 
                message: "Access Forbidden: Insufficient Permissions",
                currentRole: req.user.role,
                requiredRole: requiredRole
            });
        }
        
        console.log(`[ROLE] Access granted to user ${req.user.user_id} with role ${req.user.role}`);
        next();
    };
};