const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Uploader user reference is required"],
            index: true,
        },
        recordType: {
            type: String,
            uppercase: true,
            trim: true,
            required: [true, "Record type is required"],
            enum: {
                values: ["LAB_REPORT", "SCAN", "PRESCRIPTION", "DIAGNOSIS", "OTHER"],
                message: "{VALUE} is not a valid medical record type",
            },
        },
        title: {
            type: String,
            required: [true, "Record title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        fileUrl: {
            type: String,
            required: [true, "File URL is required"],
            trim: true,
        },
        fileHash: {
            type: String,
            required: [true, "SHA-256 file hash is required"],
            trim: true,
            lowercase: true,
            validate: {
                validator: function (v) {
                    return /^[a-f0-9]{64}$/i.test(v);
                },
                message: "fileHash must be a valid 64-character SHA-256 hexadecimal string",
            },
        },
        blockchainRecordId: {
            type: String,
            trim: true,
            default: "",
        },
        blockchainTransactionHash: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Compound indexes for optimized query performance & security lookups
medicalRecordSchema.index({ patientId: 1, recordType: 1, createdAt: -1 });
medicalRecordSchema.index({ uploadedBy: 1, createdAt: -1 });
medicalRecordSchema.index({ fileHash: 1 });

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

module.exports = MedicalRecord;
