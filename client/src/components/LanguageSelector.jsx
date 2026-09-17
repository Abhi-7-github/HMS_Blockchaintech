import React from "react";
import { useLanguage } from "../i18n/i18nContext";

const LanguageSelector = ({ className = "", compact = false }) => {
    const { language, setLanguage, supportedLanguages, t } = useLanguage();

    return (
        <div className={`flex items-center space-x-1.5 text-xs ${className}`}>
            {!compact && (
                <label htmlFor="global-language-selector" className="font-semibold text-current opacity-80 flex items-center space-x-1">
                    <span>🌐</span>
                    <span>{t("app.language", "Language")}:</span>
                </label>
            )}
            <select
                id="global-language-selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#FAF6EE] text-[#212842] border border-[#212842]/30 rounded-sm px-2 py-1 font-sans font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#212842] cursor-pointer"
                title="Select Language / 🌐 மொழி / 🌐 भाषा / 🌐 భాష"
            >
                {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.nativeName} ({lang.name})
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;
