const cloudinary = require("../config/cloudinary");
const envConfig = require("../config/env");
const path = require("path");

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

/**
 * Validate file type and file size for doctor certificate upload
 * @param {Object} file - File object (from Multer or memory buffer)
 * @returns {Object} { isValid: boolean, error?: string }
 */
const validateCertificateFile = (file) => {
    if (!file) {
        return { isValid: false, error: "No file provided for upload." };
    }

    const mimeType = file.mimetype ? file.mimetype.toLowerCase() : "";
    const ext = file.originalname ? path.extname(file.originalname).toLowerCase() : "";
    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);

    // 1. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return {
            isValid: false,
            error: `Invalid file format (${mimeType || "unknown"}). Only PDF, JPG, JPEG, and PNG files are supported.`,
        };
    }

    // 2. Validate Extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
            isValid: false,
            error: `Invalid file extension (${ext}). Only .pdf, .jpg, .jpeg, and .png are allowed.`,
        };
    }

    // 3. Validate File Size
    if (fileSize > envConfig.MAX_CERTIFICATE_FILE_SIZE_BYTES) {
        const maxSizeMb = (envConfig.MAX_CERTIFICATE_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1);
        return {
            isValid: false,
            error: `File size exceeds the limit of ${maxSizeMb} MB.`,
        };
    }

    return { isValid: true };
};

/**
 * Upload certificate buffer directly to Cloudinary via stream.
 * Certificates are stored in Cloudinary under configured folder (amedick/doctor-certificates/).
 * MongoDB receives only the returning metadata object.
 *
 * @param {Buffer} fileBuffer - In-memory file buffer
 * @param {String} originalName - Original filename
 * @param {String} mimeType - File MIME type
 * @param {String} [folder] - Optional custom folder path
 * @returns {Promise<Object>} Cloudinary metadata object
 */
const uploadCertificateBuffer = (fileBuffer, originalName, mimeType, folder = envConfig.CLOUDINARY_FOLDER) => {
    return new Promise((resolve, reject) => {
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
            return reject(new Error("Invalid file buffer provided for Cloudinary upload."));
        }

        // Determine Cloudinary resource_type: 'raw' for PDFs, 'image' for JPG/PNG
        const isPdf = mimeType.toLowerCase() === "application/pdf" || originalName.toLowerCase().endsWith(".pdf");
        const resourceType = isPdf ? "raw" : "image";

        // Generate clean public ID
        const cleanName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const publicId = `${cleanName}_${Date.now()}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: publicId,
                resource_type: resourceType,
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return reject(new Error(`Cloudinary upload failed: ${error.message || JSON.stringify(error)}`));
                }

                // Return ONLY metadata object (MongoDB stores this metadata)
                const metadata = {
                    public_id: result.public_id,
                    url: result.secure_url,
                    format: result.format || (isPdf ? "pdf" : mimeType.split("/")[1]),
                    bytes: result.bytes,
                    resource_type: result.resource_type,
                    original_filename: originalName,
                    uploadedAt: new Date(),
                };

                resolve(metadata);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

/**
 * Remove certificate document from Cloudinary by public_id
 * @param {String} publicId - Cloudinary public ID
 * @param {String} [resourceType='raw'] - 'raw' or 'image'
 * @returns {Promise<Object>} Cloudinary destruction result
 */
const deleteCertificate = async (publicId, resourceType = "raw") => {
    try {
        if (!publicId) {
            throw new Error("Public ID is required to delete Cloudinary asset.");
        }
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    } catch (error) {
        console.error("Cloudinary Delete Error:", error.message);
        throw new Error(`Failed to delete asset from Cloudinary: ${error.message}`);
    }
};

module.exports = {
    validateCertificateFile,
    uploadCertificateBuffer,
    deleteCertificate,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
};
