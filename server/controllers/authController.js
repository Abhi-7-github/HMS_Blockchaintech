const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Helper to generate JWT Token for user
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

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
        const normalizedEmail = email.toLowerCase().trim();
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        // 3. Validate password strength
        const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || "6", 10);
        if (password.length < minLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${minLength} characters long`,
            });
        }

        // 4. Role restriction: Only PATIENT and DOCTOR can self-register
        const formattedRole = role.toUpperCase().trim();
        const allowedRoles = (process.env.ALLOWED_SELF_REGISTER_ROLES || "PATIENT,DOCTOR")
            .split(",")
            .map((r) => r.trim());

        if (!allowedRoles.includes(formattedRole)) {
            return res.status(400).json({
                success: false,
                message: `Self-registration is not permitted for role '${role}'. Only ${allowedRoles.join(" and ")} accounts can be registered publicly.`,
            });
        }

        // 5. Check for duplicate email
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists",
            });
        }

        // 6. Create new user (password is automatically hashed via Mongoose pre-save hook)
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
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

/**
 * @desc    Login user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate inputs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 2. Find user by email (explicitly select password because select: false in schema)
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // 3. Compare password using user instance method
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // 4. Generate JWT Token (payload contains user ID and role)
        const token = generateToken(user._id, user.role);

        // 5. Prepare safe user object (excluding password)
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse,
        });
    } catch (error) {
        console.error("Error in user login:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during login",
            error: error.message,
        });
    }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        console.error("Error in getMe:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error fetching user profile",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
};
