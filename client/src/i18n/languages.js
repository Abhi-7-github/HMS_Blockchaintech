/**
 * Supported Languages Registry
 * To add a new language (e.g. Kannada, Malayalam, Marathi, Bengali):
 * 1. Add the locale JSON file in `client/src/i18n/locales/<code_name>.json`
 * 2. Add an entry to this array
 */
export const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
    { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
    { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
    { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
];

export const DEFAULT_LANGUAGE = "en";
