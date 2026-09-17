const mongoose = require("mongoose");

const recordAccessSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor reference is required"],
            index: true,
        },
        recordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MedicalRecord",
            required: [true, "Medical record reference is required"],
            index: true,
        },
        status: {
            type: String,
            uppercase: true,
            enum: {
                values: ["GRANTED", "REVOKED"],
                message: "{VALUE} is not a valid access status",
            },
            required: [true, "Access status is required"],
            default: "GRANTED",
        },
        grantedAt: {
            type: Date,
            default: Date.now,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        blockchainTransactionHash: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for fast permission checks & uniqueness per patient-doctor-record triplet
recordAccessSchema.index({ patientId: 1, doctorId: 1, recordId: 1 }, { unique: true });
recordAccessSchema.index({ doctorId: 1, status: 1 });

const RecordAccess = mongoose.model("RecordAccess", recordAccessSchema);

module.exports = RecordAccess;
