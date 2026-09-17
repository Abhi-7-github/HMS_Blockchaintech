import React, { useState, useRef, useEffect } from "react";
import { sendAiHealthAssistantQuery } from "../services/api";
import { useLanguage } from "../i18n/i18nContext";

const AiHealthAssistant = ({ onFindSpecialist }) => {
    const { language, setLanguage, supportedLanguages, t } = useLanguage();

    const suggestedQueries = t("ai.queries") || [
        "I have a headache, mild fever, and fatigue. What should I do?",
        "Can you explain what an HbA1c level of 6.2% means in simple terms?",
        "Which specialist should I consult for persistent lower back pain?",
        "What are some key preventive lifestyle habits to manage blood pressure?",
    ];

    const [messages, setMessages] = useState([
        {
            id: "welcome-msg",
            sender: "ai",
            text: t("ai.welcomeMsg"),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            suggestedSpecialists: ["General Physician"],
            isEmergency: false,
        },
    ]);

    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async (textToSend = null) => {
        const queryText = (textToSend || inputMessage).trim();
        if (!queryText || isLoading) return;

        setError(null);
        const userMsgId = `user-${Date.now()}`;
        const userMsg = {
            id: userMsgId,
            sender: "user",
            text: queryText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, userMsg]);
        if (!textToSend) setInputMessage("");
        setIsLoading(true);

        try {
            // Real backend API call sending selected language
            const res = await sendAiHealthAssistantQuery({
                message: queryText,
                language: language,
            });

            if (res && res.success && res.data) {
                const aiMsg = {
                    id: `ai-${Date.now()}`,
                    sender: "ai",
                    text: res.data.response || "No response received.",
                    suggestedSpecialists: res.data.suggestedSpecialists || [],
                    isEmergency: Boolean(res.data.isEmergency),
                    disclaimer: res.data.disclaimer,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                };
                setMessages((prev) => [...prev, aiMsg]);
            } else {
                throw new Error("Failed to retrieve valid response from AI assistant.");
            }
        } catch (err) {
            console.error("AI Health Assistant API Error:", err.message);
            setError(err.message || "Failed to communicate with HealthBridge AI backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                id: `welcome-${Date.now()}`,
                sender: "ai",
                text: t("ai.clearedMsg"),
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                suggestedSpecialists: [],
                isEmergency: false,
            },
        ]);
        setError(null);
    };

    const renderFormattedText = (rawText) => {
        if (!rawText) return null;

        const lines = rawText.split("\n");
        return lines.map((line, idx) => {
            let formattedLine = line;

            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIdx = 0;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIdx) {
                    parts.push(line.substring(lastIdx, match.index));
                }
                parts.push(<strong key={`${idx}-${match.index}`}>{match[1]}</strong>);
                lastIdx = boldRegex.lastIndex;
            }
            if (lastIdx < line.length) {
                parts.push(line.substring(lastIdx));
            }

            const content = parts.length > 0 ? parts : line;

            if (line.startsWith("### ")) {
                return <h4 key={idx} className="ai-heading">{line.replace("### ", "")}</h4>;
            }
            if (line.startsWith("🚨 ")) {
                return <div key={idx} className="ai-alert-line">{content}</div>;
            }
            if (line.startsWith("- ")) {
                return <li key={idx} className="ai-bullet">{content}</li>;
            }
            if (line.trim() === "") {
                return <div key={idx} className="ai-spacer" />;
            }
            return <p key={idx} className="ai-paragraph">{content}</p>;
        });
    };

    return (
        <div className="ai-assistant-container">
            {/* Header */}
            <div className="ai-assistant-header">
                <div className="ai-header-title">
                    <div className="ai-bot-avatar">🤖</div>
                    <div>
                        <h2>{t("ai.title")}</h2>
                        <p className="ai-subtitle">{t("ai.subtitle")}</p>
                    </div>
                </div>

                <div className="ai-header-controls">
                    {/* Language Selector */}
                    <div className="ai-lang-select-wrapper">
                        <label htmlFor="ai-lang-select" className="ai-lang-label">{t("app.language")}:</label>
                        <select
                            id="ai-lang-select"
                            className="ai-lang-select"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {supportedLanguages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.nativeName} ({lang.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Conversation */}
                    <button onClick={handleClearChat} className="ai-clear-btn" title="Clear Chat History">
                        🗑️ {t("ai.clearBtn")}
                    </button>
                </div>
            </div>

            {/* Mandatory Medical Disclaimer Banner */}
            <div className="ai-disclaimer-banner" role="alert">
                <span className="disclaimer-icon">⚕️</span>
                <p className="disclaimer-text">
                    <strong>{t("ai.disclaimerTitle")}</strong> {t("ai.disclaimerText")}
                </p>
            </div>

            {/* Suggested Questions Bar */}
            <div className="ai-suggested-section">
                <span className="suggested-label">{t("ai.suggestedQueries")}</span>
                <div className="suggested-pills">
                    {Array.isArray(suggestedQueries) &&
                        suggestedQueries.map((q, i) => (
                            <button
                                key={i}
                                className="suggested-pill-btn"
                                onClick={() => handleSendMessage(q)}
                                disabled={isLoading}
                            >
                                {q}
                            </button>
                        ))}
                </div>
            </div>

            {/* Chat Stream */}
            <div className="ai-chat-stream">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-bubble-row ${msg.sender === "user" ? "row-user" : "row-ai"}`}
                    >
                        <div className={`chat-bubble ${msg.sender === "user" ? "bubble-user" : "bubble-ai"}`}>
                            <div className="bubble-header">
                                <span className="bubble-author">{msg.sender === "user" ? "You" : "HealthBridge AI"}</span>
                                <span className="bubble-time">{msg.timestamp}</span>
                            </div>

                            {/* Emergency Red Flag Card */}
                            {msg.isEmergency && (
                                <div className="ai-emergency-card">
                                    🚨 <strong>{t("ai.emergencyAlert")}</strong>
                                    <p>{t("ai.emergencyText")}</p>
                                </div>
                            )}

                            {/* Message Body */}
                            <div className="bubble-text">{renderFormattedText(msg.text)}</div>

                            {/* Specialist Recommendation Card */}
                            {msg.sender === "ai" && msg.suggestedSpecialists && msg.suggestedSpecialists.length > 0 && (
                                <div className="specialist-card">
                                    <div className="specialist-card-title">
                                        🏥 {t("ai.recommendedSpecialists")}
                                    </div>
                                    <div className="specialist-tags">
                                        {msg.suggestedSpecialists.map((spec, idx) => (
                                            <span key={idx} className="specialist-badge">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                    {onFindSpecialist && (
                                        <button
                                            className="find-specialist-btn"
                                            onClick={() => onFindSpecialist(msg.suggestedSpecialists[0])}
                                        >
                                            {t("ai.findBook")} {msg.suggestedSpecialists[0]}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading State */}
                {isLoading && (
                    <div className="chat-bubble-row row-ai">
                        <div className="chat-bubble bubble-ai bubble-loading">
                            <div className="ai-typing-indicator">
                                <span className="pulse-dot"></span>
                                <span className="pulse-dot"></span>
                                <span className="pulse-dot"></span>
                                <span className="loading-text">{t("ai.analyzing")}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="ai-error-banner" role="alert">
                        <span>❌ {error}</span>
                        <button className="retry-btn" onClick={() => handleSendMessage()}>
                            {t("ai.retry")}
                        </button>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="ai-input-bar">
                <textarea
                    className="ai-textarea"
                    placeholder={t("ai.typePlaceholder")}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    disabled={isLoading}
                    rows={2}
                />
                <button
                    className="ai-send-btn"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                >
                    {isLoading ? t("ai.sending") : t("ai.sendBtn")}
                </button>
            </div>
        </div>
    );
};

export default AiHealthAssistant;
