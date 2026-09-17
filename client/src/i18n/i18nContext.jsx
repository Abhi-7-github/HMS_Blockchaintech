import React, { createContext, useContext, useState, useEffect } from "react";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./languages";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";

const translations = { en, hi, ta, te };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const savedLang = localStorage.getItem("healthbridge_language");
        if (savedLang && translations[savedLang]) {
            return savedLang;
        }
        return DEFAULT_LANGUAGE;
    });

    const setLanguage = (langCode) => {
        if (translations[langCode]) {
            setLanguageState(langCode);
            localStorage.setItem("healthbridge_language", langCode);
        } else {
            console.warn(`Translation for language code "${langCode}" not found.`);
        }
    };

    /**
     * Translation helper method
     * @param {string} keyPath - e.g. "nav.overview" or "ai.welcomeMsg"
     * @param {string} [fallback] - Optional fallback text
     */
    const t = (keyPath, fallback = "") => {
        if (!keyPath) return fallback;

        const keys = keyPath.split(".");
        let result = translations[language];

        for (const k of keys) {
            if (result && typeof result === "object" && k in result) {
                result = result[k];
            } else {
                result = null;
                break;
            }
        }

        // Fallback to English if translation key is missing in selected language
        if (result === null || result === undefined) {
            let enResult = translations["en"];
            for (const k of keys) {
                if (enResult && typeof enResult === "object" && k in enResult) {
                    enResult = enResult[k];
                } else {
                    enResult = null;
                    break;
                }
            }
            return enResult !== null && enResult !== undefined ? enResult : fallback || keyPath;
        }

        return result;
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage,
                t,
                supportedLanguages: SUPPORTED_LANGUAGES,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
