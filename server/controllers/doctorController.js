const Doctor = require("../models/Doctor");
const User = require("../models/User");

/**
 * @desc    Create a new doctor profile (Starts as PENDING)
 * @route   POST /api/doctor/profile
 * @access  Private (Doctor only)
 */
const createProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Check if doctor profile already exists for this user
        const existingProfile = await Doctor.findOne({ userId });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Doctor profile already exists for this account.",
            });
        }

        const {
            specialization,
            qualification,
            registrationNumber,
            experience,
            hospital,
            consultationFee,
            languages,
            consultationMode,
        } = req.body;

        // 2. Validate required fields
        if (
            !specialization ||
            !qualification ||
            !registrationNumber ||
            experience === undefined ||
            !hospital ||
            consultationFee === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: specialization, qualification, registrationNumber, experience, hospital, consultationFee",
            });
        }

        // 3. Check for unique medical registration number
        const existingRegNo = await Doctor.findOne({ registrationNumber: registrationNumber.trim() });
        if (existingRegNo) {
            return res.status(409).json({
                success: false,
                message: "A doctor profile with this medical registration number already exists.",
            });
        }

        // 4. Create Doctor Profile (Requirement 3: New doctors start as PENDING, Requirement 6: Cannot modify status)
        const doctorProfile = await Doctor.create({
            userId,
            specialization: specialization.trim(),
            qualification: qualification.trim(),
            registrationNumber: registrationNumber.trim(),
            experience: Number(experience),
            hospital: hospital.trim(),
            consultationFee: Number(consultationFee),
            languages: Array.isArray(languages) && languages.length > 0 ? languages : ["English"],
            consultationMode: consultationMode ? consultationMode.toUpperCase().trim() : "BOTH",
            verificationStatus: "PENDING", // Strictly set by system
            verifiedBy: null,
            verifiedAt: null,
            rejectionReason: "",
        });

        const populatedProfile = await Doctor.findById(doctorProfile._id).populate(
            "userId",
            "name email phone role isVerified"
        );

        return res.status(201).json({
            success: true,
            message: "Doctor profile created successfully. Profile status is PENDING admin verification.",
            data: populatedProfile,
        });
    } catch (error) {
        console.error("Error creating doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating doctor profile",
        });
    }
};

/**
 * @desc    Get authenticated doctor's profile
 * @route   GET /api/doctor/profile
 * @access  Private (Doctor only)
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const profile = await Doctor.findOne({ userId }).populate(
            "userId",
            "name email phone role isVerified"
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found. Please create your profile first.",
            });
        }

        return res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error("Error fetching doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor profile",
            error: error.message,
        });
    }
};

/**
 * @desc    Update authenticated doctor's clinical profile
 * @route   PUT /api/doctor/profile
 * @access  Private (Doctor only)
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const profile = await Doctor.findOne({ userId });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found. Please create your profile first.",
            });
        }

        const {
            specialization,
            qualification,
            registrationNumber,
            experience,
            hospital,
            consultationFee,
            languages,
            consultationMode,
        } = req.body;

        // Check registrationNumber uniqueness if updated
        if (registrationNumber && registrationNumber.trim() !== profile.registrationNumber) {
            const existingRegNo = await Doctor.findOne({ registrationNumber: registrationNumber.trim() });
            if (existingRegNo) {
                return res.status(409).json({
                    success: false,
                    message: "A doctor profile with this medical registration number already exists.",
                });
            }
            profile.registrationNumber = registrationNumber.trim();
        }

        if (specialization) profile.specialization = specialization.trim();
        if (qualification) profile.qualification = qualification.trim();
        if (experience !== undefined) profile.experience = Number(experience);
        if (hospital) profile.hospital = hospital.trim();
        if (consultationFee !== undefined) profile.consultationFee = Number(consultationFee);
        if (Array.isArray(languages)) profile.languages = languages;
        if (consultationMode) profile.consultationMode = consultationMode.toUpperCase().trim();

        // Requirement 6: Doctor cannot modify verificationStatus, verifiedBy, verifiedAt, rejectionReason
        // These fields are intentionally left untouched on profile update.

        await profile.save();

        const updatedProfile = await Doctor.findById(profile._id).populate(
            "userId",
            "name email phone role isVerified"
        );

        return res.status(200).json({
            success: true,
            message: "Doctor profile updated successfully.",
            data: updatedProfile,
        });
    } catch (error) {
        console.error("Error updating doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while updating doctor profile",
        });
    }
};

/**
 * @desc    Get list of all verified doctors (for patients/system)
 * @route   GET /api/doctor/verified
 * @access  Private (Authenticated users)
 */
const getVerifiedDoctors = async (req, res) => {
    try {
        const verifiedDoctors = await Doctor.find({ verificationStatus: "VERIFIED" }).populate(
            "userId",
            "name email phone role"
        );

        return res.status(200).json({
            success: true,
            count: verifiedDoctors.length,
            data: verifiedDoctors,
        });
    } catch (error) {
        console.error("Error fetching verified doctors:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching verified doctors",
            error: error.message,
        });
    }
};

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
    getVerifiedDoctors,
};
