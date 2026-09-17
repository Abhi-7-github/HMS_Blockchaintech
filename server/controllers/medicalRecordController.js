const crypto = require("crypto");
const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const RecordAccess = require("../models/RecordAccess");
const {
    storeMedicalRecordHashOnChain,
    grantRecordAccessOnChain,
    revokeRecordAccessOnChain,
    verifyHashOnChain,
} = require("../blockchain/blockchainService");


/**
 * @desc    Upload / create a new medical record with SHA-256 hash on-chain
 * @route   POST /api/records
 * @access  Private (Patient, Doctor, Admin)
 */
const uploadMedicalRecord = async (req, res) => {
    try {
        const userId = req.user._id;
        const { patientId, recordType, title, description, fileUrl, fileHash } = req.body;

        if (!patientId || !recordType || !title || !fileUrl) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: patientId, recordType, title, fileUrl",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patientId format.",
            });
        }

        // Verify patient profile exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        // Calculate SHA-256 file hash if not provided explicitly
        let computedFileHash = fileHash;
        if (!computedFileHash || !/^[a-f0-9]{64}$/i.test(computedFileHash)) {
            computedFileHash = crypto.createHash("sha256").update(`${title}_${fileUrl}_${Date.now()}`).digest("hex");
        }

        // 1. Create temporary document instance to get ObjectId recordId
        const recordId = new mongoose.Types.ObjectId();

        // 2. Store off-chain SHA-256 hash on blockchain (Zero medical data / PII on-chain)
        let blockchainRecordId = "";
        let blockchainTransactionHash = "";

        const bcResult = await storeMedicalRecordHashOnChain(recordId.toString(), computedFileHash);
        if (bcResult && bcResult.success) {
            blockchainRecordId = bcResult.recordId;
            blockchainTransactionHash = bcResult.transactionHash;
        } else {
            console.warn("Blockchain recording warning:", bcResult ? bcResult.error : "Transaction pending");
        }

        // 3. Save Medical Record document to MongoDB
        const medicalRecord = new MedicalRecord({
            _id: recordId,
            patientId: patient._id,
            uploadedBy: userId,
            recordType: recordType.toUpperCase().trim(),
            title: title.trim(),
            description: description ? description.trim() : "",
            fileUrl: fileUrl.trim(),
            fileHash: computedFileHash.toLowerCase(),
            blockchainRecordId,
            blockchainTransactionHash,
        });

        await medicalRecord.save();

        const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email" },
            })
            .populate("uploadedBy", "name email role");

        return res.status(201).json({
            success: true,
            message: "Medical record uploaded successfully and integrity hash logged on-chain.",
            data: populatedRecord,
        });
    } catch (error) {
        console.error("Error uploading medical record:", error.message);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map((e) => e.message).join(". "),
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while uploading medical record",
        });
    }
};

/**
 * @desc    Verify medical record integrity on-chain
 * @route   GET /api/records/:id/verify
 * @access  Private (Authorized Patient, Doctor, Admin)
 */
const verifyMedicalRecordIntegrity = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid record ID format.",
            });
        }

        // 1. Retrieve authorized medical record from MongoDB
        const record = await MedicalRecord.findById(id).populate({
            path: "patientId",
            select: "userId",
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        // Authorization Check: Only authorized patient, uploader doctor, or admin can verify
        const userRole = req.user.role;
        const userIdStr = req.user._id.toString();

        let isAuthorized = false;
        if (userRole === "ADMIN") {
            isAuthorized = true;
        } else if (record.uploadedBy.toString() === userIdStr) {
            isAuthorized = true;
        } else if (userRole === "PATIENT" && record.patientId && record.patientId.userId.toString() === userIdStr) {
            isAuthorized = true;
        } else if (userRole === "DOCTOR") {
            // Check if doctor profile exists and is verified
            const doctorProfile = await Doctor.findOne({ userId: req.user._id });
            if (doctorProfile) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to verify this medical record.",
            });
        }

        // 2. Handle missing blockchain transaction case
        if (!record.blockchainTransactionHash || !record.fileHash) {
            return res.status(200).json({
                status: "TAMPERED",
                success: false,
                message: "No blockchain integrity proof found for this medical record.",
                data: {
                    recordId: record._id,
                    title: record.title,
                    blockchainTransactionHash: record.blockchainTransactionHash || "",
                },
            });
        }

        // 3. Calculate / retrieve current file SHA-256 hash
        const currentFileHash = record.fileHash;
        const recordIdStr = record._id.toString();

        // 4. Retrieve original blockchain hash & compare on-chain
        const onChainResult = await verifyHashOnChain("MEDICAL_RECORD", recordIdStr, currentFileHash);

        if (!onChainResult.success) {
            return res.status(500).json({
                status: "TAMPERED",
                success: false,
                message: `Blockchain verification check failed: ${onChainResult.error}`,
            });
        }

        // 5. Return VERIFIED or TAMPERED status
        if (onChainResult.isVerified) {
            return res.status(200).json({
                status: "VERIFIED",
                success: true,
                message: "Medical record integrity verified successfully against Ethereum blockchain.",
                data: {
                    recordId: record._id,
                    title: record.title,
                    fileHash: currentFileHash,
                    blockchainTransactionHash: record.blockchainTransactionHash,
                    onChainTimestamp: onChainResult.timestamp,
                },
            });
        } else {
            return res.status(200).json({
                status: "TAMPERED",
                success: false,
                message: "WARNING: File hash mismatch! Record content may have been modified off-chain.",
                data: {
                    recordId: record._id,
                    title: record.title,
                    fileHash: currentFileHash,
                    blockchainTransactionHash: record.blockchainTransactionHash,
                },
            });
        }
    } catch (error) {
        console.error("Error verifying medical record on-chain:", error.message);
        return res.status(500).json({
            status: "TAMPERED",
            success: false,
            message: "Server error while verifying medical record on-chain",
            error: error.message,
        });
    }
};

/**
 * @desc    Get all medical records for authenticated user/patient
 * @route   GET /api/records
 * @access  Private (Authenticated Users)
 */
const getMedicalRecords = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let query = {};
        if (userRole === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId });
            if (!patientProfile) {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
            query = { patientId: patientProfile._id };
        } else if (userRole === "DOCTOR") {
            query = { uploadedBy: userId };
        }

        const records = await MedicalRecord.find(query)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email" },
            })
            .populate("uploadedBy", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: records.length,
            data: records,
        });
    } catch (error) {
        console.error("Error fetching medical records:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching medical records",
        });
    }
};

/**
 * @desc    Get single medical record details by ID
 * @route   GET /api/records/:id
 * @access  Private (Authorized User)
 */
const getMedicalRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid record ID format.",
            });
        }

        const record = await MedicalRecord.findById(id)
            .populate({
                path: "patientId",
                populate: { path: "userId", select: "name email phone" },
            })
            .populate("uploadedBy", "name email role");

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        const userRole = req.user.role;
        const userIdStr = req.user._id.toString();

        // Access Authorization Check:
        // 1. Admin has access
        // 2. Uploading User / Doctor has access
        // 3. Patient owner has access
        // 4. Doctor has access ONLY if active GRANTED permission exists in RecordAccess
        if (userRole === "PATIENT") {
            if (record.patientId && record.patientId.userId && record.patientId.userId._id.toString() !== userIdStr) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view your own medical records.",
                });
            }
        } else if (userRole === "DOCTOR") {
            if (record.uploadedBy && record.uploadedBy._id.toString() !== userIdStr) {
                const doctorProfile = await Doctor.findOne({ userId: req.user._id });
                if (!doctorProfile) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied. Doctor profile not found.",
                    });
                }

                const accessPermission = await RecordAccess.findOne({
                    patientId: record.patientId._id,
                    doctorId: doctorProfile._id,
                    recordId: record._id,
                    status: "GRANTED",
                });

                if (!accessPermission) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied. Patient consent (GRANTED) is required to view this medical record.",
                    });
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: record,
        });
    } catch (error) {
        console.error("Error fetching medical record details:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching medical record details",
        });
    }
};

/**
 * @desc    Grant a doctor access to a medical record (Patient controlled)
 * @route   POST /api/records/access/grant
 * @access  Private (Patient only)
 */
const grantRecordAccess = async (req, res) => {
    try {
        const userId = req.user._id;
        const { doctorId, recordId } = req.body;

        if (!doctorId || !recordId) {
            return res.status(400).json({
                success: false,
                message: "Please provide both doctorId and recordId.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctorId or recordId format.",
            });
        }

        // 1. Fetch patient profile
        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        // 2. Fetch medical record & verify ownership
        const record = await MedicalRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        if (!record.patientId.equals(patientProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You can only grant access to your own medical records.",
            });
        }

        // 3. Fetch doctor profile
        const doctorProfile = await Doctor.findById(doctorId);
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 4. Log consent GRANTED on blockchain (Zero sensitive medical info on-chain)
        let blockchainTransactionHash = "";
        const bcResult = await grantRecordAccessOnChain(
            patientProfile._id.toString(),
            doctorProfile._id.toString(),
            record._id.toString()
        );

        if (bcResult && bcResult.success) {
            blockchainTransactionHash = bcResult.transactionHash;
        } else {
            console.warn("Blockchain grant consent warning:", bcResult ? bcResult.error : "Transaction pending");
        }

        // 5. Upsert RecordAccess document in MongoDB
        let access = await RecordAccess.findOne({
            patientId: patientProfile._id,
            doctorId: doctorProfile._id,
            recordId: record._id,
        });

        if (access) {
            access.status = "GRANTED";
            access.grantedAt = new Date();
            access.revokedAt = null;
            access.blockchainTransactionHash = blockchainTransactionHash || access.blockchainTransactionHash;
            await access.save();
        } else {
            access = await RecordAccess.create({
                patientId: patientProfile._id,
                doctorId: doctorProfile._id,
                recordId: record._id,
                status: "GRANTED",
                grantedAt: new Date(),
                revokedAt: null,
                blockchainTransactionHash,
            });
        }

        const populatedAccess = await RecordAccess.findById(access._id)
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash");

        return res.status(200).json({
            success: true,
            message: "Medical record access granted successfully.",
            data: populatedAccess,
        });
    } catch (error) {
        console.error("Error granting record access:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while granting record access",
        });
    }
};

/**
 * @desc    Revoke doctor access to a medical record (Patient controlled)
 * @route   POST /api/records/access/revoke
 * @access  Private (Patient only)
 */
const revokeRecordAccess = async (req, res) => {
    try {
        const userId = req.user._id;
        const { doctorId, recordId } = req.body;

        if (!doctorId || !recordId) {
            return res.status(400).json({
                success: false,
                message: "Please provide both doctorId and recordId.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctorId or recordId format.",
            });
        }

        // 1. Fetch patient profile
        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found.",
            });
        }

        // 2. Fetch access record
        const access = await RecordAccess.findOne({
            patientId: patientProfile._id,
            doctorId,
            recordId,
        });

        if (!access) {
            return res.status(404).json({
                success: false,
                message: "No existing access permission record found to revoke.",
            });
        }

        // 3. Log consent REVOKED on blockchain
        let blockchainTransactionHash = "";
        const bcResult = await revokeRecordAccessOnChain(
            patientProfile._id.toString(),
            doctorId.toString(),
            recordId.toString()
        );

        if (bcResult && bcResult.success) {
            blockchainTransactionHash = bcResult.transactionHash;
        } else {
            console.warn("Blockchain revoke consent warning:", bcResult ? bcResult.error : "Transaction pending");
        }

        // 4. Update MongoDB access record status to REVOKED
        access.status = "REVOKED";
        access.revokedAt = new Date();
        access.blockchainTransactionHash = blockchainTransactionHash || access.blockchainTransactionHash;
        await access.save();

        const populatedAccess = await RecordAccess.findById(access._id)
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash");

        return res.status(200).json({
            success: true,
            message: "Medical record access revoked successfully.",
            data: populatedAccess,
        });
    } catch (error) {
        console.error("Error revoking record access:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while revoking record access",
        });
    }
};

/**
 * @desc    Get all access permissions granted/revoked by authenticated patient
 * @route   GET /api/records/access/my-permissions
 * @access  Private (Patient only)
 */
const getMyAccessPermissions = async (req, res) => {
    try {
        const userId = req.user._id;

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const permissions = await RecordAccess.find({ patientId: patientProfile._id })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash createdAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: permissions.length,
            data: permissions,
        });
    } catch (error) {
        console.error("Error fetching access permissions:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching access permissions",
        });
    }
};

/**
 * @desc    Grant doctor access to a medical record by recordId (POST /api/records/:recordId/access)
 * @route   POST /api/records/:recordId/access
 * @access  Private (Patient only)
 */
const grantAccessByRecordId = async (req, res) => {
    try {
        const userId = req.user._id;
        const recordId = req.params.recordId || req.body.recordId;
        const doctorId = req.body.doctorId;

        if (!doctorId || !recordId) {
            return res.status(400).json({
                success: false,
                message: "Please provide doctorId and recordId.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctorId or recordId format.",
            });
        }

        // 1. Requirement 1: Fetch patient profile & verify patient role
        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only registered patients can grant access to medical records.",
            });
        }

        // 2. Requirement 1: Fetch medical record & verify ownership
        const record = await MedicalRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        if (!record.patientId.equals(patientProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Only the patient owning the medical record can grant access.",
            });
        }

        // 3. Requirement 2: Fetch doctor profile & verify status is VERIFIED
        const doctorProfile = await Doctor.findById(doctorId);
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        if (doctorProfile.verificationStatus !== "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Access denied. Only VERIFIED doctors can receive access to medical records.",
            });
        }

        // 4. Requirement 3: Doctor cannot grant themselves access
        if (doctorProfile.userId.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Forbidden: Doctors cannot grant themselves access. Only the record owner can grant access.",
            });
        }

        // 5. Requirement 5: Log consent GRANTED on blockchain (Zero sensitive medical data on-chain)
        let blockchainTransactionHash = "";
        const bcResult = await grantRecordAccessOnChain(
            patientProfile._id.toString(),
            doctorProfile._id.toString(),
            record._id.toString()
        );

        if (bcResult && bcResult.success) {
            blockchainTransactionHash = bcResult.transactionHash;
        } else {
            console.warn("Blockchain grant consent warning:", bcResult ? bcResult.error : "Transaction pending");
        }

        // 6. Upsert RecordAccess document in MongoDB
        let access = await RecordAccess.findOne({
            patientId: patientProfile._id,
            doctorId: doctorProfile._id,
            recordId: record._id,
        });

        if (access) {
            access.status = "GRANTED";
            access.grantedAt = new Date();
            access.revokedAt = null;
            access.blockchainTransactionHash = blockchainTransactionHash || access.blockchainTransactionHash;
            await access.save();
        } else {
            access = await RecordAccess.create({
                patientId: patientProfile._id,
                doctorId: doctorProfile._id,
                recordId: record._id,
                status: "GRANTED",
                grantedAt: new Date(),
                revokedAt: null,
                blockchainTransactionHash,
            });
        }

        const populatedAccess = await RecordAccess.findById(access._id)
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital verificationStatus",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash");

        return res.status(200).json({
            success: true,
            message: "Medical record access granted to verified doctor successfully.",
            data: populatedAccess,
        });
    } catch (error) {
        console.error("Error granting record access:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while granting record access",
        });
    }
};

/**
 * @desc    Revoke doctor access to a medical record (DELETE /api/records/:recordId/access/:doctorId)
 * @route   DELETE /api/records/:recordId/access/:doctorId
 * @access  Private (Patient only)
 */
const revokeAccessByRecordId = async (req, res) => {
    try {
        const userId = req.user._id;
        const { recordId, doctorId } = req.params;

        if (!doctorId || !recordId) {
            return res.status(400).json({
                success: false,
                message: "Please provide both recordId and doctorId in parameters.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(doctorId) || !mongoose.Types.ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctorId or recordId format.",
            });
        }

        // 1. Requirement 1: Fetch patient profile
        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only registered patients can revoke access.",
            });
        }

        // 2. Requirement 1: Verify medical record ownership
        const record = await MedicalRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        if (!record.patientId.equals(patientProfile._id)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Only the patient owning the medical record can revoke access.",
            });
        }

        // 3. Find existing RecordAccess permission
        const access = await RecordAccess.findOne({
            patientId: patientProfile._id,
            doctorId,
            recordId,
        });

        if (!access) {
            return res.status(404).json({
                success: false,
                message: "No access permission found to revoke for this doctor and record.",
            });
        }

        // 4. Requirement 5: Log consent REVOKED on blockchain
        let blockchainTransactionHash = "";
        const bcResult = await revokeRecordAccessOnChain(
            patientProfile._id.toString(),
            doctorId.toString(),
            recordId.toString()
        );

        if (bcResult && bcResult.success) {
            blockchainTransactionHash = bcResult.transactionHash;
        } else {
            console.warn("Blockchain revoke consent warning:", bcResult ? bcResult.error : "Transaction pending");
        }

        // 5. Update MongoDB RecordAccess status = REVOKED
        access.status = "REVOKED";
        access.revokedAt = new Date();
        access.blockchainTransactionHash = blockchainTransactionHash || access.blockchainTransactionHash;
        await access.save();

        const populatedAccess = await RecordAccess.findById(access._id)
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash");

        return res.status(200).json({
            success: true,
            message: "Medical record access revoked successfully.",
            data: populatedAccess,
        });
    } catch (error) {
        console.error("Error revoking record access:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while revoking record access",
        });
    }
};

/**
 * @desc    Get access permissions list for a specific record (GET /api/records/:recordId/access)
 * @route   GET /api/records/:recordId/access
 * @access  Private (Patient owner, Admin)
 */
const getRecordAccessList = async (req, res) => {
    try {
        const { recordId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(recordId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recordId format.",
            });
        }

        const record = await MedicalRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Medical record not found.",
            });
        }

        // Authorization check: Patient owner or Admin
        if (req.user.role === "PATIENT") {
            const patientProfile = await Patient.findOne({ userId: req.user._id });
            if (!patientProfile || !record.patientId.equals(patientProfile._id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view access logs for your own medical records.",
                });
            }
        } else if (req.user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Role not authorized to view record access logs.",
            });
        }

        const accessList = await RecordAccess.find({ recordId })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital verificationStatus",
                populate: { path: "userId", select: "name email" },
            })
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: accessList.length,
            data: accessList,
        });
    } catch (error) {
        console.error("Error fetching record access list:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching record access list",
        });
    }
};

/**
 * @desc    Get all record access permissions for patient (GET /api/patients/record-access)
 * @route   GET /api/patients/record-access
 * @access  Private (Patient only)
 */
const getPatientRecordAccess = async (req, res) => {
    try {
        const userId = req.user._id;

        const patientProfile = await Patient.findOne({ userId });
        if (!patientProfile) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const permissions = await RecordAccess.find({ patientId: patientProfile._id })
            .populate({
                path: "doctorId",
                select: "specialization qualification hospital verificationStatus",
                populate: { path: "userId", select: "name email" },
            })
            .populate("recordId", "title recordType fileHash createdAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: permissions.length,
            data: permissions,
        });
    } catch (error) {
        console.error("Error fetching patient record access permissions:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching patient record access permissions",
        });
    }
};

module.exports = {
    uploadMedicalRecord,
    verifyMedicalRecordIntegrity,
    getMedicalRecords,
    getMedicalRecordById,
    grantRecordAccess,
    revokeRecordAccess,
    getMyAccessPermissions,
    grantAccessByRecordId,
    revokeAccessByRecordId,
    getRecordAccessList,
    getPatientRecordAccess,
};


