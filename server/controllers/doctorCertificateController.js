const Doctor = require("../models/Doctor");
const DoctorCertificate = require("../models/DoctorCertificate");
const {
    validateCertificateFile,
    uploadCertificateBuffer,
    deleteCertificate,
} = require("../services/cloudinaryService");

const VALID_CERTIFICATE_TYPES = [
    "MEDICAL_REGISTRATION",
    "DEGREE",
    "SPECIALIZATION",
    "IDENTITY",
    "OTHER",
];

/**
 * @desc    Upload doctor certificate to Cloudinary and record metadata in MongoDB
 * @route   POST /api/doctors/certificates or /api/doctor/certificates
 * @access  Private (Doctor only)
 */
const uploadCertificate = async (req, res) => {
    let uploadedCloudinaryMetadata = null;

    try {
        // 1. Get doctor identity strictly from JWT token (req.user._id)
        const userId = req.user._id;

        // 2. Verify that authenticated user owns a valid Doctor profile
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found. Please create your doctor profile before uploading certificates.",
            });
        }

        // 3. Validate certificateType field
        const { certificateType } = req.body;
        if (!certificateType) {
            return res.status(400).json({
                success: false,
                message: "certificateType is required. Must be one of: MEDICAL_REGISTRATION, DEGREE, SPECIALIZATION, IDENTITY, OTHER",
            });
        }

        const normalizedType = certificateType.toUpperCase().trim();
        if (!VALID_CERTIFICATE_TYPES.includes(normalizedType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid certificateType (${certificateType}). Allowed values: ${VALID_CERTIFICATE_TYPES.join(", ")}`,
            });
        }

        // 4. Validate uploaded file presence & format/size requirements
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please attach a certificate file (PDF, JPG, JPEG, or PNG).",
            });
        }

        const validation = validateCertificateFile(req.file);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error,
            });
        }

        // 5. Upload file buffer to Cloudinary
        uploadedCloudinaryMetadata = await uploadCertificateBuffer(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        // 6. Create DoctorCertificate record in MongoDB with status = PENDING
        let newCertificate;
        try {
            newCertificate = await DoctorCertificate.create({
                doctorId: doctor._id,
                certificateType: normalizedType,
                originalFileName: req.file.originalname,
                cloudinaryPublicId: uploadedCloudinaryMetadata.public_id,
                secureUrl: uploadedCloudinaryMetadata.url,
                resourceType: (uploadedCloudinaryMetadata.resource_type || "RAW").toUpperCase(),
                uploadedAt: uploadedCloudinaryMetadata.uploadedAt || new Date(),
                verificationStatus: "PENDING",
            });
        } catch (dbError) {
            // Requirement 14: Cleanup Cloudinary asset if MongoDB creation fails
            console.error("MongoDB creation failed. Initiating Cloudinary cleanup...", dbError.message);
            if (uploadedCloudinaryMetadata && uploadedCloudinaryMetadata.public_id) {
                try {
                    await deleteCertificate(
                        uploadedCloudinaryMetadata.public_id,
                        uploadedCloudinaryMetadata.resource_type
                    );
                    console.log("Cloudinary asset cleanup completed successfully.");
                } catch (cleanupError) {
                    console.error("Failed to delete Cloudinary asset during cleanup:", cleanupError.message);
                }
            }
            throw dbError; // Rethrow to main error block
        }

        // 7. Return certificate metadata only (Never return Cloudinary secrets)
        return res.status(201).json({
            success: true,
            message: "Doctor certificate uploaded successfully and is PENDING verification.",
            data: {
                id: newCertificate._id,
                doctorId: newCertificate.doctorId,
                certificateType: newCertificate.certificateType,
                originalFileName: newCertificate.originalFileName,
                cloudinaryPublicId: newCertificate.cloudinaryPublicId,
                secureUrl: newCertificate.secureUrl,
                resourceType: newCertificate.resourceType,
                verificationStatus: newCertificate.verificationStatus,
                uploadedAt: newCertificate.uploadedAt,
                createdAt: newCertificate.createdAt,
            },
        });
    } catch (error) {
        console.error("Error in uploadCertificate:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while uploading doctor certificate",
        });
    }
};

/**
 * @desc    Get all certificates belonging to the authenticated doctor
 * @route   GET /api/doctors/certificates or /api/doctor/certificates
 * @access  Private (Doctor only)
 */
const getDoctorCertificates = async (req, res) => {
    try {
        const userId = req.user._id;

        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        const certificates = await DoctorCertificate.find({ doctorId: doctor._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: certificates.length,
            data: certificates,
        });
    } catch (error) {
        console.error("Error fetching doctor certificates:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching doctor certificates",
            error: error.message,
        });
    }
};

/**
 * @desc    Get a single certificate by ID (Doctor ownership strictly enforced)
 * @route   GET /api/doctors/certificates/:id or /api/doctor/certificates/:id
 * @access  Private (Doctor only)
 */
const getCertificateById = async (req, res) => {
    try {
        const userId = req.user._id;
        const certId = req.params.id;

        // 1. Verify doctor profile existence
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 2. Fetch certificate by ID
        const certificate = await DoctorCertificate.findById(certId);
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found.",
            });
        }

        // 3. Requirements 3 & 4: Strictly verify doctor ownership
        if (certificate.doctorId.toString() !== doctor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to access another doctor's certificate.",
            });
        }

        // 4. Return metadata only
        return res.status(200).json({
            success: true,
            data: certificate,
        });
    } catch (error) {
        console.error("Error fetching certificate by ID:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while fetching certificate details",
        });
    }
};

/**
 * @desc    Delete a certificate by ID (Includes Cloudinary asset removal & verification protection)
 * @route   DELETE /api/doctors/certificates/:id or /api/doctor/certificates/:id
 * @access  Private (Doctor only)
 */
const deleteCertificateById = async (req, res) => {
    try {
        const userId = req.user._id;
        const certId = req.params.id;

        // 1. Verify doctor profile existence
        const doctor = await Doctor.findOne({ userId });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found.",
            });
        }

        // 2. Fetch certificate by ID
        const certificate = await DoctorCertificate.findById(certId);
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found.",
            });
        }

        // 3. Requirements 3 & 4: Strictly verify doctor ownership
        if (certificate.doctorId.toString() !== doctor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to delete another doctor's certificate.",
            });
        }

        // 4. Requirement 8: Active verification requirement protection rule
        if (certificate.verificationStatus === "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete a verified certificate. Please contact administration for credential updates.",
            });
        }

        if (doctor.verificationStatus === "VERIFIED") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete certificates for a verified doctor profile. Please contact administration to request credential modifications.",
            });
        }

        // 5. Requirements 7 & 10: Delete Cloudinary asset safely
        if (certificate.cloudinaryPublicId) {
            try {
                const resourceType = certificate.resourceType
                    ? certificate.resourceType.toLowerCase()
                    : "raw";
                await deleteCertificate(certificate.cloudinaryPublicId, resourceType);
                console.log(`Cloudinary asset ${certificate.cloudinaryPublicId} deleted successfully.`);
            } catch (cloudinaryErr) {
                console.error("Cloudinary asset deletion error (proceeding with DB deletion):", cloudinaryErr.message);
            }
        }

        // 6. Delete certificate document from MongoDB
        await DoctorCertificate.deleteOne({ _id: certificate._id });

        return res.status(200).json({
            success: true,
            message: "Doctor certificate deleted successfully.",
            data: {
                id: certificate._id,
                certificateType: certificate.certificateType,
                originalFileName: certificate.originalFileName,
            },
        });
    } catch (error) {
        console.error("Error deleting doctor certificate:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while deleting doctor certificate",
        });
    }
};

module.exports = {
    uploadCertificate,
    getDoctorCertificates,
    getCertificateById,
    deleteCertificateById,
};
