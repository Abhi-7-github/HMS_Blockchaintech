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

module.exports = uploadCertificateMiddleware;
