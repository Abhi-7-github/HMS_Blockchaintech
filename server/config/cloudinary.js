const cloudinary = require("cloudinary").v2;
const envConfig = require("./env");

/**
 * Configure official Cloudinary Node.js SDK (v2)
 * Credentials are safely retrieved from centralized server environment variables.
 * Never hardcoded and never exposed to the frontend/React application.
 */
cloudinary.config({
    cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
    api_key: envConfig.CLOUDINARY_API_KEY,
    api_secret: envConfig.CLOUDINARY_API_SECRET,
    secure: true, // Force HTTPS URLs for secure document access
});

module.exports = cloudinary;
