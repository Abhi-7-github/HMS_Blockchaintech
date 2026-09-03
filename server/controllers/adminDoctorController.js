const Doctor = require("../models/Doctor");
const User = require("../models/User");

/**
 * @desc    Get all doctor profiles with optional verification status filter
 * @route   GET /api/admin/doctors
 * @access  Private (Admin only)
 */
const getAllDoctors = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};

        if (status) {
            const normalizedStatus = status.toUpperCase().trim();
            if (["PENDING", "VERIFIED", "REJECTED"].includes(normalizedStatus)) {
                filter.verificationStatus = normalizedStatus;
            }
        }

        const doctors = await Doctor.find(filter)
            .populate("userId", "name email phone role isVerified")
            .populate("verifiedBy", "name email role");

        return res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors,
        });
    } catch (error) {
        console.error("Error fetching doctor profiles for admin:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor profiles",
            error: error.message,
        });
    }
};

/**
 * @desc    Verify or Reject a doctor profile
 * @route   PUT /api/admin/doctors/:id/verify
 * @access  Private (Admin only)
 */
const verifyDoctor = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { status, rejectionReason } = req.body;

        // 1. Validate status input
        const normalizedStatus = status ? status.toUpperCase().trim() : "";
        if (!["VERIFIED", "REJECTED"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification status. Must be 'VERIFIED' or 'REJECTED'.",
            });
        }

        // 2. Find doctor profile
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 3. Requirement 5: Doctor cannot verify themselves
        if (doctor.userId.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Doctors cannot verify their own credentials.",
            });
        }

        // 4. Validate rejection reason if status is REJECTED
        if (normalizedStatus === "REJECTED" && (!rejectionReason || !rejectionReason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required when rejecting a doctor profile.",
            });
        }

        // 5. Update verification status & audit fields
        doctor.verificationStatus = normalizedStatus;
        doctor.verifiedBy = req.user._id;
        doctor.verifiedAt = new Date();
        doctor.rejectionReason = normalizedStatus === "REJECTED" ? rejectionReason.trim() : "";

        await doctor.save();

        const updatedDoctor = await Doctor.findById(doctor._id)
            .populate("userId", "name email phone role isVerified")
            .populate("verifiedBy", "name email role");

        return res.status(200).json({
            success: true,
            message: `Doctor profile status updated to ${normalizedStatus}.`,
            data: updatedDoctor,
        });
    } catch (error) {
        console.error("Error verifying doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while updating doctor verification status",
        });
    }
};

module.exports = {
    getAllDoctors,
    verifyDoctor,
};
