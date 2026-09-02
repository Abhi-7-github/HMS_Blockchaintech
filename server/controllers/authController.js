const User = require("../models/User");
const Otp = require("../models/Otp");
const { sendOTP } = require("../utils/sendEmail");
const crypto = require("crypto");

/**
 * Helper to generate secure 6-digit OTP string
 */
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * @desc    Register a new user and send OTP to email
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
        const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH, 10);
        if (password.length < minLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${minLength} characters long`,
            });
        }

        // 4. Role restriction dynamically read from process.env
        const formattedRole = role.toUpperCase().trim();
        const allowedRoles = (process.env.ALLOWED_SELF_REGISTER_ROLES || "").split(",").map((r) => r.trim());

        if (!allowedRoles.includes(formattedRole)) {
            return res.status(400).json({
                success: false,
                message: `Self-registration is not permitted for role '${role}'. Only ${allowedRoles.join(" and ")} accounts can be registered publicly.`,
            });
        }

        // 5. Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email address already exists and is verified.",
                });
            } else {
                // Remove previous unverified account registration to re-register clean
                await User.deleteOne({ _id: existingUser._id });
            }
        }

        // 6. Create new unverified user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password,
            role: formattedRole,
            isVerified: false,
        });

        // 7. Generate and save OTP
        const otpCode = generateOTP();
        await Otp.deleteMany({ email: normalizedEmail }); // Clear previous OTPs if any
        await Otp.create({
            email: normalizedEmail,
            otp: otpCode,
        });

        // 8. Send OTP via email
        await sendOTP(normalizedEmail, otpCode);

        return res.status(201).json({
            success: true,
            message: "Registration initiated. An OTP has been sent to your email address.",
            data: {
                email: user.email,
                isVerified: false,
            },
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
 * @desc    Verify OTP and activate user account
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and OTP",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found. Please register first.",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Account is already verified. You can proceed to log in.",
            });
        }

        // Find existing OTP record
        const otpRecord = await Otp.findOne({ email: normalizedEmail });
        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP. Please request a new OTP.",
            });
        }

        if (otpRecord.otp !== otp.trim()) {
            return res.status(400).json({
                success: false,
                message: "Incorrect OTP code. Please check and try again.",
            });
        }

        // Mark user as verified
        user.isVerified = true;
        await user.save();

        // Delete used OTP
        await Otp.deleteMany({ email: normalizedEmail });

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Registration complete.",
            data: userResponse,
        });
    } catch (error) {
        console.error("Error in OTP verification:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during OTP verification",
            error: error.message,
        });
    }
};

/**
 * @desc    Resend OTP to email
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please provide your email address",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found with this email",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "This account is already verified.",
            });
        }

        // Generate and send new OTP
        const otpCode = generateOTP();
        await Otp.deleteMany({ email: normalizedEmail });
        await Otp.create({
            email: normalizedEmail,
            otp: otpCode,
        });

        await sendOTP(normalizedEmail, otpCode);

        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your email address.",
        });
    } catch (error) {
        console.error("Error resending OTP:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error while resending OTP",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    verifyOtp,
    resendOtp,
};
