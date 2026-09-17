const mongoose = require("mongoose");

const emergencyAccessLogSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        accessedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        accessedRole: {
            type: String,
            default: "EMERGENCY_RESPONDER",
            uppercase: true,
        },
        accessorName: {
            type: String,
            trim: true,
            default: "ER Responder / Authorized Clinician",
        },
        reason: {
            type: String,
            trim: true,
            default: "Critical Medical Emergency Triage Access",
        },
        accessType: {
            type: String,
            enum: ["EMERGENCY_PROFILE_ONLY", "PATIENT_CONSENT_UNLOCKED"],
            default: "EMERGENCY_PROFILE_ONLY",
        },
        accessGrantedAt: {
            type: Date,
            default: Date.now,
        },
        ipAddress: {
            type: String,
            default: "127.0.0.1",
        },
        blockchainTransactionHash: {
            type: String,
            default: "",
        },
        accessStatus: {
            type: String,
            enum: ["LOGGED_ON_CHAIN", "RECORDED_LOCALLY", "FAILED"],
            default: "RECORDED_LOCALLY",
        },
    },
    {
        timestamps: true,
    }
);

emergencyAccessLogSchema.index({ patientId: 1, accessGrantedAt: -1 });

const EmergencyAccessLog = mongoose.model("EmergencyAccessLog", emergencyAccessLogSchema);

module.exports = EmergencyAccessLog;
