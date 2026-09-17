const { processHealthQuery } = require("../services/aiHealthAssistantService");

/**
 * @desc    AI Health Assistant Endpoint
 * @route   POST /api/ai/health-assistant
 * @access  Private (Authenticated Users) / Public Access Supported
 */
const getHealthAssistantResponse = async (req, res) => {
    try {
        const { message, language } = req.body;

        // 1. Input Validation
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 'message' text in the request body.",
            });
        }

        // 2. Anonymization: Ensure no sensitive user session PII is forwarded to external provider
        const cleanMessage = message.trim();
        const lang = language && typeof language === "string" ? language.trim() : "en";

        // 3. Process Health Assistant Query (Stateless - No permanent DB storage of conversation)
        const result = await processHealthQuery({
            message: cleanMessage,
            language: lang,
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in AI Health Assistant controller:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error processing AI health assistant query",
        });
    }
};

module.exports = {
    getHealthAssistantResponse,
};
