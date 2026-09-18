const multer = require("multer");
const envConfig = require("../config/env");
const { ALLOWED_MIME_TYPES } = require("../services/cloudinaryService");

// Use memory storage: Uploaded file is kept as an in-memory Buffer (file.buffer)
// This avoids writing temporary files to server disk before streaming to Cloudinary.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype ? file.mimetype.toLowerCase() : "")) {
        cb(null, true);
    } else {
        cb(
            new Error(`Invalid file type (${file.mimetype}). Only PDF, JPG, JPEG, and PNG files are allowed.`),
            false
        );
    }
};

const uploadCertificateMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: envConfig.MAX_CERTIFICATE_FILE_SIZE_BYTES, // 5MB limit
    },
    fileFilter: fileFilter,
});

/**
 * Express wrapper middleware to gracefully catch Multer validation & file size errors
 * and return structured HTTP 400 JSON error responses.
 */
const handleCertificateUpload = (req, res, next) => {
    uploadCertificateMiddleware.single("certificate")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                const maxSizeMb = (envConfig.MAX_CERTIFICATE_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1);
                return res.status(400).json({
                    success: false,
                    message: `File size exceeds the limit of ${maxSizeMb} MB.`,
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`,
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file upload.",
            });
        }
        next();
    });
};

module.exports = handleCertificateUpload;
