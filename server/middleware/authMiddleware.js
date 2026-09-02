const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes: Verifies JWT token and attaches authenticated user to req.user
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check Authorization header format: "Bearer <token>"
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No authentication token provided.",
            });
        }

        // Verify token using JWT_SECRET from environment
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB excluding password
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication failed. User no longer exists.",
            });
        }

        // Attach user object to req.user
        req.user = user;
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Invalid or expired token.",
            error: error.message,
        });
    }
};

/**
 * Flexible Role-based Authorization Middleware
 * Usage: authorize("ADMIN", "DOCTOR")
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${roles.join(", ")}`,
            });
        }

        next();
    };
};

/**
 * Role-specific helper middleware for PATIENT, DOCTOR, ADMIN, PHARMACY
 */
const isPatient = authorize("PATIENT");
const isDoctor = authorize("DOCTOR");
const isAdmin = authorize("ADMIN");
const isPharmacy = authorize("PHARMACY");

module.exports = {
    protect,
    authorize,
    isPatient,
    isDoctor,
    isAdmin,
    isPharmacy,
};
