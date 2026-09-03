const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const Doctor = require("../models/Doctor");
const DoctorCertificate = require("../models/DoctorCertificate");
const User = require("../models/User");
const {
    sendDoctorApprovedEmail,
    sendDoctorRejectedEmail,
} = require("../utils/sendEmail");

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
 * @desc    Get list of doctors with PENDING verification status
 * @route   GET /api/admin/doctors/pending
 * @access  Private (Admin only)
 */
const getPendingDoctors = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "10", 10);
        const skip = (page - 1) * limit;

        const filter = { verificationStatus: "PENDING" };

        // Calculate total count of pending doctors
        const total = await Doctor.countDocuments(filter);

        // Query pending doctors and populate basic user fields (explicitly excluding passwords/secrets)
        const pendingDoctors = await Doctor.find(filter)
            .populate("userId", "name email phone role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Aggregate certificate counts for the returned doctors
        const doctorIds = pendingDoctors.map((doc) => doc._id);
        const certificateCounts = await DoctorCertificate.aggregate([
            { $match: { doctorId: { $in: doctorIds } } },
            { $group: { _id: "$doctorId", count: { $sum: 1 } } },
        ]);

        const certCountMap = {};
        certificateCounts.forEach((item) => {
            certCountMap[item._id.toString()] = item.count;
        });

        // Format clean output response (Requirement 4, 5, 6)
        const formattedDoctors = pendingDoctors.map((doc) => ({
            doctorId: doc._id,
            name: doc.userId ? doc.userId.name : "N/A",
            email: doc.userId ? doc.userId.email : "N/A",
            specialization: doc.specialization,
            qualification: doc.qualification,
            registrationNumber: doc.registrationNumber,
            experience: doc.experience,
            hospital: doc.hospital,
            numberOfCertificates: certCountMap[doc._id.toString()] || 0,
            submittedDate: doc.createdAt,
            verificationStatus: doc.verificationStatus,
        }));

        return res.status(200).json({
            success: true,
            count: formattedDoctors.length,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
            data: formattedDoctors,
        });
    } catch (error) {
        console.error("Error fetching pending doctors for admin:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching pending doctors",
            error: error.message,
        });
    }
};

/**
 * @desc    Get detailed doctor profile and submitted certificates by Doctor ID
 * @route   GET /api/admin/doctors/:id
 * @access  Private (Admin only)
 */
const getDoctorDetailsById = async (req, res) => {
    try {
        const doctorId = req.params.id;

        // 1. Requirement 2: Validate Doctor ID format
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID format.",
            });
        }

        // 2. Fetch doctor profile populated with user details (excluding passwords/secrets)
        const doctor = await Doctor.findById(doctorId).populate(
            "userId",
            "name email phone role"
        );

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 3. Fetch doctor certificates
        const certificates = await DoctorCertificate.find({ doctorId: doctor._id })
            .select("_id certificateType originalFileName secureUrl verificationStatus uploadedAt createdAt")
            .sort({ createdAt: -1 });

        // 4. Return clean, formatted response (Requirements 3, 4, 5)
        return res.status(200).json({
            success: true,
            data: {
                doctor: {
                    id: doctor._id,
                    name: doctor.userId ? doctor.userId.name : "N/A",
                    email: doctor.userId ? doctor.userId.email : "N/A",
                    phone: doctor.userId ? doctor.userId.phone : "N/A",
                    specialization: doctor.specialization,
                    qualification: doctor.qualification,
                    registrationNumber: doctor.registrationNumber,
                    experience: doctor.experience,
                    hospital: doctor.hospital,
                    consultationFee: doctor.consultationFee,
                    languages: doctor.languages,
                    consultationMode: doctor.consultationMode,
                    verificationStatus: doctor.verificationStatus,
                    submittedDate: doctor.createdAt,
                },
                certificates: certificates.map((cert) => ({
                    id: cert._id,
                    certificateType: cert.certificateType,
                    originalFileName: cert.originalFileName,
                    uploadDate: cert.uploadedAt || cert.createdAt,
                    verificationStatus: cert.verificationStatus,
                    secureUrl: cert.secureUrl, // Safe view URL for admin review
                })),
            },
        });
    } catch (error) {
        console.error("Error fetching doctor details for admin:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor details",
            error: error.message,
        });
    }
};

/**
 * @desc    Get secure signed access URL & details for a specific doctor certificate (Admin only)
 * @route   GET /api/admin/doctors/:doctorId/certificates/:certificateId
 * @access  Private (Admin only)
 */
const getDoctorCertificateForAdmin = async (req, res) => {
    try {
        const { doctorId, certificateId } = req.params;

        // 1. Requirement 7: Validate ObjectIDs
        if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(certificateId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID or certificate ID format.",
            });
        }

        // 2. Requirement 7: Verify Doctor profile exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 3. Requirement 7: Verify Certificate document exists
        const certificate = await DoctorCertificate.findById(certificateId);
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found.",
            });
        }

        // 4. Requirements 2 & 3: Verify certificate actually belongs to the requested doctor
        if (certificate.doctorId.toString() !== doctor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: This certificate does not belong to the specified doctor profile.",
            });
        }

        // 5. Requirements 4, 5, 6: Generate secure signed temporary access URL (expires in 1 hour)
        const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL
        const resourceType = certificate.resourceType
            ? certificate.resourceType.toLowerCase()
            : "raw";

        let signedUrl = certificate.secureUrl;
        try {
            if (certificate.cloudinaryPublicId) {
                signedUrl = cloudinary.url(certificate.cloudinaryPublicId, {
                    resource_type: resourceType,
                    type: "upload",
                    sign_url: true,
                    expires_at: expiresAtSeconds,
                    secure: true,
                });
            }
        } catch (cloudinaryErr) {
            console.error("Signed URL generation warning (falling back to secureUrl):", cloudinaryErr.message);
        }

        // 6. Requirement 8: Record audit log entry
        console.log(
            `[AUDIT LOG] Admin (${req.user.email} - ID: ${req.user._id}) accessed certificate ${certificate._id} (${certificate.certificateType}) for Doctor ${doctor._id} at ${new Date().toISOString()}`
        );

        return res.status(200).json({
            success: true,
            message: "Secure temporary certificate access link generated.",
            data: {
                certificateId: certificate._id,
                doctorId: doctor._id,
                certificateType: certificate.certificateType,
                originalFileName: certificate.originalFileName,
                verificationStatus: certificate.verificationStatus,
                signedUrl: signedUrl,
                expiresAt: new Date(expiresAtSeconds * 1000),
            },
        });
    } catch (error) {
        console.error("Error accessing doctor certificate for admin:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while accessing doctor certificate",
            error: error.message,
        });
    }
};

/**
 * @desc    Approve/Verify a doctor profile
 * @route   PATCH /api/admin/doctors/:id/verify or PUT /api/admin/doctors/:id/verify
 * @access  Private (Admin only)
 */
const approveDoctorProfile = async (req, res) => {
    try {
        const doctorId = req.params.id;

        // 1. Validate Doctor ID format
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID format.",
            });
        }

        // 2. Requirement 1: Doctor must exist
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 3. Security: Doctor cannot approve themselves
        if (doctor.userId.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Doctors cannot approve their own verification.",
            });
        }

        // 4. Requirement 2: Doctor must have required verification documents
        const certificateCount = await DoctorCertificate.countDocuments({ doctorId: doctor._id });
        if (certificateCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot verify doctor. Doctor must have uploaded at least one verification certificate.",
            });
        }

        // 5. Update fields: verificationStatus = VERIFIED, store verifiedBy, verifiedAt, clear rejectionReason
        doctor.verificationStatus = "VERIFIED";
        doctor.verifiedBy = req.user._id;
        doctor.verifiedAt = new Date();
        doctor.rejectionReason = ""; // Clear old rejection reason

        await doctor.save();

        const updatedDoctor = await Doctor.findById(doctor._id)
            .populate("userId", "name email phone role isVerified")
            .populate("verifiedBy", "name email role");

        // Send Email Notification to Doctor: Verification APPROVED
        if (updatedDoctor.userId?.email && updatedDoctor.userId?.name) {
            sendDoctorApprovedEmail(updatedDoctor.userId.email, updatedDoctor.userId.name).catch((err) =>
                console.error("Failed to send Doctor Approved email:", err.message)
            );
        }

        return res.status(200).json({
            success: true,
            message: "Doctor profile successfully verified and approved.",
            data: updatedDoctor,
        });
    } catch (error) {
        console.error("Error approving doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while verifying doctor profile",
        });
    }
};

/**
 * @desc    Reject a doctor profile with rejection reason
 * @route   PATCH /api/admin/doctors/:id/reject
 * @access  Private (Admin only)
 */
const rejectDoctorProfile = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { rejectionReason } = req.body;

        // 1. Validate Doctor ID format
        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID format.",
            });
        }

        // 2. REJECT Requirement 1: Rejection reason is required
        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required when rejecting a doctor profile.",
            });
        }

        // 3. Find doctor profile
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 4. Security: Doctor cannot reject themselves
        if (doctor.userId.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Doctors cannot reject their own verification.",
            });
        }

        // 5. Update fields: verificationStatus = REJECTED, store verifiedBy/admin ID, rejectionReason
        doctor.verificationStatus = "REJECTED";
        doctor.verifiedBy = req.user._id;
        doctor.verifiedAt = new Date();
        doctor.rejectionReason = rejectionReason.trim();

        await doctor.save();

        const updatedDoctor = await Doctor.findById(doctor._id)
            .populate("userId", "name email phone role isVerified")
            .populate("verifiedBy", "name email role");

        // Send Email Notification to Doctor: Verification REJECTED
        if (updatedDoctor.userId?.email && updatedDoctor.userId?.name) {
            sendDoctorRejectedEmail(
                updatedDoctor.userId.email,
                updatedDoctor.userId.name,
                rejectionReason.trim()
            ).catch((err) => console.error("Failed to send Doctor Rejected email:", err.message));
        }

        return res.status(200).json({
            success: true,
            message: "Doctor profile has been rejected.",
            data: updatedDoctor,
        });
    } catch (error) {
        console.error("Error rejecting doctor profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while rejecting doctor profile",
        });
    }
};

/**
 * @desc    Verify or Reject a doctor profile (Legacy wrapper for PUT endpoint)
 * @route   PUT /api/admin/doctors/:id/verify
 * @access  Private (Admin only)
 */
const verifyDoctor = async (req, res) => {
    const { status } = req.body;
    if (status && status.toUpperCase().trim() === "REJECTED") {
        return rejectDoctorProfile(req, res);
    }
    return approveDoctorProfile(req, res);
};

module.exports = {
    getAllDoctors,
    getPendingDoctors,
    getDoctorDetailsById,
    getDoctorCertificateForAdmin,
    approveDoctorProfile,
    rejectDoctorProfile,
    verifyDoctor,
};
