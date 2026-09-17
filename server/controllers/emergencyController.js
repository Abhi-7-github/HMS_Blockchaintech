const Patient = require("../models/Patient");
const User = require("../models/User");
const EmergencyAccessLog = require("../models/EmergencyAccessLog");
const { grantRecordAccessOnChain } = require("../blockchain/contractService");
const mongoose = require("mongoose");

/**
 * @desc    Get authenticated patient's emergency profile settings
 * @route   GET /api/emergency/profile
 * @access  Private (Patient)
 */
const getPatientEmergencyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const patientProfile = await Patient.findOne({ userId }).populate("userId", "name email phone");

        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                patientId: patientProfile._id,
                name: patientProfile.userId?.name || "Patient",
                phone: patientProfile.userId?.phone || "",
                bloodGroup: patientProfile.bloodGroup || "Not Provided",
                allergies: patientProfile.allergies || "None reported",
                chronicConditions: patientProfile.chronicConditions || "None reported",
                emergencyContact: patientProfile.emergencyContact || { name: "", relationship: "", phone: "" },
                importantMedicalNotes: patientProfile.importantMedicalNotes || "",
                emergencyAccessEnabled: patientProfile.emergencyAccessEnabled !== false,
            },
        });
    } catch (error) {
        console.error("Error fetching emergency profile:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching emergency profile",
        });
    }
};

/**
 * @desc    Update patient's emergency profile & medical preferences
 * @route   PUT /api/emergency/profile
 * @access  Private (Patient)
 */
const updateEmergencyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            bloodGroup,
            allergies,
            chronicConditions,
            emergencyContact,
            importantMedicalNotes,
            emergencyAccessEnabled,
        } = req.body;

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        if (bloodGroup !== undefined) patientProfile.bloodGroup = bloodGroup;
        if (allergies !== undefined) patientProfile.allergies = allergies;
        if (chronicConditions !== undefined) patientProfile.chronicConditions = chronicConditions;
        if (importantMedicalNotes !== undefined) patientProfile.importantMedicalNotes = importantMedicalNotes;
        if (emergencyAccessEnabled !== undefined) patientProfile.emergencyAccessEnabled = Boolean(emergencyAccessEnabled);

        if (emergencyContact && emergencyContact.name && emergencyContact.relationship && emergencyContact.phone) {
            patientProfile.emergencyContact = emergencyContact;
        }

        await patientProfile.save();

        const updated = await Patient.findById(patientProfile._id).populate("userId", "name email phone");

        return res.status(200).json({
            success: true,
            message: "Emergency profile updated successfully.",
            data: {
                patientId: updated._id,
                name: updated.userId?.name || "Patient",
                phone: updated.userId?.phone || "",
                bloodGroup: updated.bloodGroup,
                allergies: updated.allergies,
                chronicConditions: updated.chronicConditions,
                emergencyContact: updated.emergencyContact,
                importantMedicalNotes: updated.importantMedicalNotes,
                emergencyAccessEnabled: updated.emergencyAccessEnabled,
            },
        });
    } catch (error) {
        console.error("Error updating emergency profile:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while updating emergency profile",
        });
    }
};

/**
 * @desc    Explicit Emergency Access Triage Request
 * @route   POST /api/emergency/access/:patientId
 * @access  Private (Doctor, ER Staff, Admin, or Patient)
 */
const accessEmergencyInfo = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patientId format.",
            });
        }

        const patientProfile = await Patient.findById(patientId).populate("userId", "name phone email");
        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient not found.",
            });
        }

        if (patientProfile.emergencyAccessEnabled === false) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Patient has disabled explicit emergency access.",
            });
        }

        const accessorUser = req.user;
        const accessorName = accessorUser?.name || "Emergency Medical Responder";
        const accessedRole = accessorUser?.role || "EMERGENCY_RESPONDER";
        const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

        // 1. Audit Log: Prepare blockchain event & record log on-chain
        let blockchainTransactionHash = "";
        let accessStatus = "RECORDED_LOCALLY";

        try {
            const bcResult = await grantRecordAccessOnChain(
                patientProfile._id.toString(),
                accessorUser?._id ? accessorUser._id.toString() : patientProfile._id.toString(),
                `EMERGENCY_TRIAGE_${Date.now()}`
            );
            if (bcResult && bcResult.success) {
                blockchainTransactionHash = bcResult.transactionHash;
                accessStatus = "LOGGED_ON_CHAIN";
            }
        } catch (bcErr) {
            console.warn("Blockchain emergency log warning:", bcErr.message);
        }

        // 2. Save immutable EmergencyAccessLog in MongoDB
        const accessLog = await EmergencyAccessLog.create({
            patientId: patientProfile._id,
            accessedByUserId: accessorUser?._id || null,
            accessedRole,
            accessorName,
            reason: reason || "Critical Medical Emergency Triage Access",
            accessType: "EMERGENCY_PROFILE_ONLY",
            ipAddress: clientIp,
            blockchainTransactionHash,
            accessStatus,
        });

        // 3. Return ONLY emergency profile card (Strictly NO full medical record exposure)
        return res.status(200).json({
            success: true,
            message: "Emergency access logged successfully.",
            emergencyProfile: {
                patientId: patientProfile._id,
                name: patientProfile.userId?.name || "Patient",
                phone: patientProfile.userId?.phone || "",
                bloodGroup: patientProfile.bloodGroup || "Not Provided",
                allergies: patientProfile.allergies || "None reported",
                chronicConditions: patientProfile.chronicConditions || "None reported",
                emergencyContact: patientProfile.emergencyContact,
                importantMedicalNotes: patientProfile.importantMedicalNotes || "None specified by patient",
                disclaimer: "⚠️ This platform does NOT replace emergency medical services (911 / 112 / 108).",
            },
            accessLog: {
                id: accessLog._id,
                accessGrantedAt: accessLog.accessGrantedAt,
                blockchainTransactionHash: accessLog.blockchainTransactionHash,
                accessStatus: accessLog.accessStatus,
            },
        });
    } catch (error) {
        console.error("Error processing emergency access request:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error during emergency triage access request",
        });
    }
};

/**
 * @desc    Get emergency access logs for authenticated patient
 * @route   GET /api/emergency/logs
 * @access  Private (Patient, Admin)
 */
const getEmergencyAccessLogs = async (req, res) => {
    try {
        let patientId = null;

        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId: req.user._id });
            if (patientProfile) patientId = patientProfile._id;
        } else if (req.query.patientId && mongoose.Types.ObjectId.isValid(req.query.patientId)) {
            patientId = req.query.patientId;
        }

        if (!patientId) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const logs = await EmergencyAccessLog.find({ patientId })
            .populate("accessedByUserId", "name email role")
            .sort({ accessGrantedAt: -1 });

        return res.status(200).json({
            success: true,
            count: logs.length,
            data: logs,
        });
    } catch (error) {
        console.error("Error fetching emergency access logs:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching emergency access logs",
        });
    }
};

module.exports = {
    getPatientEmergencyProfile,
    updateEmergencyProfile,
    accessEmergencyInfo,
    getEmergencyAccessLogs,
};
