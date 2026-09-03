const Patient = require("../models/Patient");
const User = require("../models/User");

/**
 * @desc    Create a new patient profile for authenticated patient
 * @route   POST /api/patient/profile
 * @access  Private (Patient only)
 */
const createProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Check if patient profile already exists for this user
        const existingProfile = await Patient.findOne({ userId });
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                message: "Patient profile already exists for this user account.",
            });
        }

        const { dateOfBirth, gender, bloodGroup, address, emergencyContact, profilePhoto } = req.body;

        // 2. Validate required fields
        if (!dateOfBirth || !gender || !address || !emergencyContact) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: dateOfBirth, gender, address, emergencyContact (name, relationship, phone)",
            });
        }

        // 3. Validate emergency contact structure
        if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
            return res.status(400).json({
                success: false,
                message: "Emergency contact must include name, relationship, and phone",
            });
        }

        // 4. Create Patient Profile
        const patientProfile = await Patient.create({
            userId,
            dateOfBirth,
            gender: gender.toUpperCase().trim(),
            bloodGroup: bloodGroup ? bloodGroup.toUpperCase().trim() : null,
            address: address.trim(),
            emergencyContact: {
                name: emergencyContact.name.trim(),
                relationship: emergencyContact.relationship.trim(),
                phone: emergencyContact.phone.trim(),
            },
            profilePhoto: profilePhoto ? profilePhoto.trim() : "",
        });

        // 5. Return created profile with populated user details
        const populatedProfile = await Patient.findById(patientProfile._id).populate(
            "userId",
            "name email phone role isVerified"
        );

        return res.status(201).json({
            success: true,
            message: "Patient profile created successfully.",
            data: populatedProfile,
        });
    } catch (error) {
        console.error("Error creating patient profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating patient profile",
        });
    }
};

/**
 * @desc    Get authenticated patient's profile
 * @route   GET /api/patient/profile
 * @access  Private (Patient only)
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch patient profile strictly scoped to authenticated user ID
        const profile = await Patient.findOne({ userId }).populate(
            "userId",
            "name email phone role isVerified"
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found. Please create your profile first.",
            });
        }

        return res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        console.error("Error fetching patient profile:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching patient profile",
            error: error.message,
        });
    }
};

/**
 * @desc    Update authenticated patient's profile
 * @route   PUT /api/patient/profile
 * @access  Private (Patient only)
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find patient profile strictly by authenticated user ID
        const profile = await Patient.findOne({ userId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found. Please create your profile first.",
            });
        }

        const { dateOfBirth, gender, bloodGroup, address, emergencyContact, profilePhoto } = req.body;

        // Update fields if provided
        if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
        if (gender) profile.gender = gender.toUpperCase().trim();
        if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup ? bloodGroup.toUpperCase().trim() : null;
        if (address) profile.address = address.trim();

        if (emergencyContact) {
            if (emergencyContact.name) profile.emergencyContact.name = emergencyContact.name.trim();
            if (emergencyContact.relationship) profile.emergencyContact.relationship = emergencyContact.relationship.trim();
            if (emergencyContact.phone) profile.emergencyContact.phone = emergencyContact.phone.trim();
        }

        if (profilePhoto !== undefined) profile.profilePhoto = profilePhoto ? profilePhoto.trim() : "";

        await profile.save();

        const updatedProfile = await Patient.findById(profile._id).populate(
            "userId",
            "name email phone role isVerified"
        );

        return res.status(200).json({
            success: true,
            message: "Patient profile updated successfully.",
            data: updatedProfile,
        });
    } catch (error) {
        console.error("Error updating patient profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while updating patient profile",
        });
    }
};

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
};
