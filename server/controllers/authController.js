const User = require("../models/User");

/**
 * @desc    Register a new user (PATIENT or DOCTOR)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // 1. Validate required fields
        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: name, email, phone, password, role",
            });
        }

        // 2. Validate email format
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        // 3. Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        // 4. Role restriction: Only PATIENT and DOCTOR can self-register
        const formattedRole = role.toUpperCase().trim();
        const allowedRoles = ["PATIENT", "DOCTOR"];

        if (!allowedRoles.includes(formattedRole)) {
            return res.status(400).json({
                success: false,
                message: `Self-registration is not permitted for role '${role}'. Only PATIENT and DOCTOR accounts can be registered publicly.`,
            });
        }

        // 5. Check for duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists",
            });
        }

        // 6. Create new user (password is automatically hashed via Mongoose pre-save hook)
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password,
            role: formattedRole,
        });

        // 7. Format user object without password
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: userResponse,
        });
    } catch (error) {
        console.error("Error in user registration:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during registration",
            error: error.message,
        });
    }
};

module.exports = {
    register,
};
