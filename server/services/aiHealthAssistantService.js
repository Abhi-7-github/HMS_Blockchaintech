const envConfig = require("../config/env");

/**
 * Emergency Red-Flag Keywords for Rapid Triage Detection
 */
const EMERGENCY_KEYWORDS = [
    "chest pain",
    "pain in chest",
    "shortness of breath",
    "difficulty breathing",
    "can't breathe",
    "cannot breathe",
    "sudden numbness",
    "facial drooping",
    "slurred speech",
    "paralysis",
    "severe bleeding",
    "uncontrolled bleeding",
    "coughing up blood",
    "vomiting blood",
    "anaphylaxis",
    "throat swelling",
    "loss of consciousness",
    "fainted",
    "passed out",
    "severe head injury",
    "suicidal thoughts",
];

/**
 * Specialist Mapping Matrix
 */
const SPECIALIST_MAPPINGS = [
    {
        specialty: "Cardiologist",
        keywords: ["chest", "heart", "palpitations", "high blood pressure", "hypertension", "pulse", "arrhythmia"],
    },
    {
        specialty: "Dermatologist",
        keywords: ["skin", "rash", "acne", "eczema", "psoriasis", "mole", "itching", "lesion", "hives"],
    },
    {
        specialty: "Neurologist",
        keywords: ["headache", "migraine", "dizziness", "seizure", "numbness", "tingling", "tremor", "memory loss"],
    },
    {
        specialty: "Gastroenterologist",
        keywords: ["stomach", "abdominal", "digestive", "nausea", "vomiting", "diarrhea", "constipation", "acid reflux", "heartburn", "ulcer"],
    },
    {
        specialty: "Pulmonologist",
        keywords: ["cough", "lung", "asthma", "bronchitis", "wheezing", "breathlessness", "respiratory"],
    },
    {
        specialty: "Orthopedist",
        keywords: ["bone", "joint", "back pain", "knee pain", "fracture", "arthritis", "spine", "muscle pain"],
    },
    {
        specialty: "Endocrinologist",
        keywords: ["diabetes", "sugar", "thyroid", "hba1c", "hormone", "metabolism", "insulin"],
    },
    {
        specialty: "Ophthalmologist",
        keywords: ["eye", "vision", "blurriness", "cataract", "glaucoma", "red eye"],
    },
    {
        specialty: "ENT Specialist (Otolaryngologist)",
        keywords: ["ear", "nose", "throat", "sinus", "hearing", "tonsils", "tinnitus", "vertigo"],
    },
    {
        specialty: "Psychiatrist / Psychologist",
        keywords: ["anxiety", "depression", "stress", "insomnia", "panic attack", "mental health", "mood"],
    },
    {
        specialty: "Urologist / Nephrologist",
        keywords: ["kidney", "urine", "urinary", "kidney stone", "creatinine", "bladder"],
    },
];

/**
 * Emergency Triage Scanner
 */
const detectEmergency = (messageText) => {
    const text = (messageText || "").toLowerCase();
    for (const kw of EMERGENCY_KEYWORDS) {
        if (text.includes(kw)) {
            return {
                isEmergency: true,
                flaggedKeyword: kw,
            };
        }
    }
    return { isEmergency: false };
};

/**
 * Specialist Recommender Engine
 */
const recommendSpecialists = (messageText) => {
    const text = (messageText || "").toLowerCase();
    const recommended = new Set();

    for (const item of SPECIALIST_MAPPINGS) {
        for (const kw of item.keywords) {
            if (text.includes(kw)) {
                recommended.add(item.specialty);
                break;
            }
        }
    }

    if (recommended.size === 0) {
        recommended.add("General Physician");
    } else {
        recommended.add("General Physician"); // Always include primary care doctor as initial contact
    }

    return Array.from(recommended);
};

/**
 * System Safety Prompt Template
 */
const SYSTEM_SAFETY_PROMPT = `
You are HealthBridge AI, a compassionate, educational AI Health Assistant.
Your goal is to provide general symptom guidance, recommend appropriate medical specialists, explain medical reports in simple terms, offer preventive health education, and provide general wellness advice.

STRICT SAFETY & COMPLIANCE RULES:
1. NEVER state or claim a definitive medical diagnosis. Always frame suggestions as general possibilities to discuss with a doctor.
2. ALWAYS urge professional medical consultation.
3. If symptoms suggest an emergency (e.g. severe chest pain, shortness of breath, sudden numbness, severe bleeding), urge immediate emergency medical care (calling emergency services like 911 or visiting the nearest ER).
4. Explain complex medical terms or lab values (e.g. HbA1c, Lipid panel, CBC, TSH) in simple, accessible language.
5. Keep answers clear, supportive, and structured with bullet points.
`;

/**
 * External Call to Google Gemini REST API (Server-side key execution)
 */
const callGeminiAPI = async (userPrompt, language = "en") => {
    const apiKey = envConfig.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("your_")) {
        return null; // Fallback to local intelligent medical engine if API key is not configured
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
${SYSTEM_SAFETY_PROMPT}

Language requested: ${language}.
Patient Query: "${userPrompt}"

Please provide a helpful, structured, and educational response strictly adhering to all safety guidelines.
`;

    const requestPayload = {
        contents: [
            {
                parts: [{ text: promptText }],
            },
        ],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
        },
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
            console.warn(`Gemini API returned status ${response.status}`);
            return null;
        }

        const data = await response.json();
        const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return outputText || null;
    } catch (err) {
        console.error("Gemini API request error:", err.message);
        return null;
    }
};

/**
 * Built-In Intelligent Medical Engine (Fallback when external API key is absent)
 */
const generateLocalResponse = (messageText, emergencyCheck, specialists, language = "en") => {
    const text = messageText.trim();
    const lang = (language || "en").toLowerCase();

    if (emergencyCheck.isEmergency) {
        let emergencyMsg = `🚨 **EMERGENCY WARNING**: The symptoms you described (including: "${emergencyCheck.flaggedKeyword}") may indicate a potentially serious medical emergency. Please seek immediate professional emergency medical care at the nearest hospital emergency room or call your local emergency hotline (911 / 112 / 108) immediately.`;
        if (lang.startsWith("hi")) {
            emergencyMsg = `🚨 **गंभीर चेतावनी (EMERGENCY WARNING)**: आपके द्वारा बताए गए लक्षण (जैसे: ${emergencyCheck.flaggedKeyword}) एक संभावित आपातकालीन स्थिति का संकेत दे सकते हैं। कृपया तुरंत निकटतम अस्पताल जाएं या आपातकालीन सेवा (102/108/112) को कॉल करें।`;
        } else if (lang.startsWith("ta")) {
            emergencyMsg = `🚨 **அவசர எச்சரிக்கை (EMERGENCY WARNING)**: நீங்கள் விவரித்த அறிகுறிகள் (${emergencyCheck.flaggedKeyword}) ஆபத்தான மருத்துவ அவசரநிலையைக் குறிக்கலாம். உடனடியாக அருகிலுள்ள மருத்துவமனைக்குச் செல்லவும் அல்லது அவசர எண்ணை (108/112) அழைக்கவும்.`;
        } else if (lang.startsWith("te")) {
            emergencyMsg = `🚨 **అత్యవసర హెచ్చరిక (EMERGENCY WARNING)**: మీరు వివరించిన లక్షణాలు (${emergencyCheck.flaggedKeyword}) తీవ్రమైన అత్యవసర పరిస్థితిని సూచించవచ్చు. దయచేసి వెంటనే దగ్గరలోని ఆసుపత్రికి వెళ్లండి లేదా అత్యవసర నంబరును (108/112) సంప్రదించండి.`;
        }

        return {
            isEmergency: true,
            response: emergencyMsg,
        };
    }

    const specialistListStr = specialists.join(", ");

    let formattedResponse = "";

    if (lang.startsWith("hi")) {
        formattedResponse = `
### 🩺 HealthBridge AI स्वास्थ्य सहायक मार्गदर्शन

**1. सामान्य मार्गदर्शन और विश्लेषण:**
संपर्क करने के लिए धन्यवाद। आपके विवरण के आधार पर: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}", यहाँ आपका मार्गदर्शन करने के लिए सामान्य स्वास्थ्य जानकारी दी गई है।

**2. अनुशंसित चिकित्सा विशेषज्ञ:**
हम औपचारिक मूल्यांकन के लिए निम्नलिखित विशेषज्ञों से परामर्श करने की सलाह देते हैं:
- **${specialistListStr}**

**3. सामान्य स्वास्थ्य और निवारक शिक्षा:**
- पर्याप्त जलपान सुनिश्चित करें (प्रतिदिन 2-3 लीटर पानी)।
- विश्राम करें और अपने लक्षणों की बारीकी से निगरानी करें।
- पोषक तत्वों से भरपूर संतुलित आहार बनाए रखें।

---
⚠️ **चिकित्सा अस्वीकरण**:
यह मार्गदर्शन केवल शैक्षिक और सूचनात्मक उद्देश्यों के लिए प्रदान किया गया है और यह चिकित्सा निदान नहीं प्रस्तुत करता है। कृपया व्यक्तिगत चिकित्सा मूल्यांकन के लिए एक योग्य स्वास्थ्य सेवा पेशेवर से परामर्श लें।
`;
    } else if (lang.startsWith("ta")) {
        formattedResponse = `
### 🩺 HealthBridge AI சுகாதார உதவியாளர் வழிகாட்டுதல்

**1. பொதுவான வழிகாட்டுதல் மற்றும் பகுப்பாய்வு:**
தொடர்பு கொண்டதற்கு நன்றி. உங்கள் விளக்கத்தின் அடிப்படையில்: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}", உங்கள் பயன்பாட்டிற்கான பொதுவான சுகாதார தகவல்கள் கீழே கொடுக்கப்பட்டுள்ளன.

**2. பரிந்துரைக்கப்பட்ட மருத்துவ நிபுணர்கள்:**
முறையான பரிசோதனைக்கு பின்வரும் நிபுணர்களை அணுக பரிந்துரைக்கிறோம்:
- **${specialistListStr}**

**3. பொதுவான ஆரோக்கியம் மற்றும் தடுப்புக் கல்வி:**
- போதுமான அளவு தண்ணீர் குடிக்கவும் (தினமும் 2-3 லிட்டர்).
- ஓய்வெடுத்து உங்கள் அறிகுறிகளைக் கவனியுங்கள்.
- சத்தான சீரான உணவை உட்கொள்ளுங்கள்.

---
⚠️ **மருத்துவ மறுப்புறுதி**:
இந்த வழிகாட்டுதல் தகவல் நோக்கங்களுக்காக மட்டுமே வழங்கப்படுகிறது. இது உத்தியோகபூர்வ மருத்துவ நோயறிதலாகாது. தனிப்பட்ட மருத்துவ பரிசோதனைக்கு தகுதியான மருத்துவரை அணுகவும்.
`;
    } else if (lang.startsWith("te")) {
        formattedResponse = `
### 🩺 HealthBridge AI ఆరోగ్య సహాయక మార్గదర్శకత్వం

**1. సాధారణ మార్గదర్శకత్వం మరియు విశ్లేషణ:**
సంప్రదించినందుకు ధన్యవాదాలు. మీ వివరాల ఆధారంగా: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}", మీ మార్గదర్శకత్వం కోసం సాధారణ ఆరోగ్య సమాచారం ఇక్కడ ఇవ్వబడింది.

**2. సూచించిన వైద్య నిపుణులు:**
తగిన పరిశీలన కోసం క్రింది నిపుణులను సంప్రదించాలని మేము సిఫార్సు చేస్తున్నాము:
- **${specialistListStr}**

**3. సాధారణ ఆరోగ్యం మరియు నివారణ విద్య:**
- తగినంత నీరు త్రాగండి (రోజుకు 2-3 లీటర్లు).
- విశ్రాంతి తీసుకోండి మరియు మీ లక్షణాలను గమనించండి.
- సమతుల్య ఆహారాన్ని తీసుకోండి.

---
⚠️ **వైద్య నిరాకరణ**:
ఈ మార్గదర్శకత్వం సమాచారం కోసం మాత్రమే అందించబడింది. ఇది అధికారిక వైద్య నిర్ధారణ కాదు. వ్యక్తిగత వైద్య పరిశీలన కోసం తగిన వైద్యుడిని సంప్రదించండి.
`;
    } else {
        formattedResponse = `
### 🩺 HealthBridge AI Assistant Guidance

**1. General Guidance & Analysis:**
Thank you for reaching out. Based on your description: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}", here is general health information for your guidance.

**2. Recommended Medical Specialists:**
We recommend consulting with the following specialists for a formal evaluation:
- **${specialistListStr}**

**3. General Health & Preventive Education:**
- Ensure adequate hydration (2-3 liters of water daily).
- Rest and monitor your symptoms closely.
- Maintain a balanced diet rich in whole foods, vegetables, and lean proteins.

---
⚠️ **Medical Disclaimer**:
This guidance is provided by HealthBridge AI for educational and informational purposes only and does **NOT** constitute a medical diagnosis or treatment plan. Please consult a qualified healthcare professional for personalized medical evaluation.
`;
    }

    return {
        isEmergency: false,
        response: formattedResponse.trim(),
    };
};

/**
 * Core Health Assistant Processor Method
 * @param {Object} params - { message, language }
 * @returns {Promise<Object>} Processed response structure
 */
const processHealthQuery = async ({ message, language = "en" }) => {
    if (!message || !message.trim()) {
        throw new Error("Query message is required.");
    }

    const cleanMessage = message.trim();
    const lang = (language || "en").toLowerCase();

    // 1. Safety Triage: Detect potential emergencies
    const emergencyCheck = detectEmergency(cleanMessage);

    // 2. Recommend appropriate medical specialists
    const specialists = recommendSpecialists(cleanMessage);

    // 3. Attempt External AI Call (Google Gemini) with server-side API Key
    let aiResponse = await callGeminiAPI(cleanMessage, lang);

    // 4. Fallback to Local Medical Engine if external AI is not configured or fails
    let isEmergency = emergencyCheck.isEmergency;
    if (!aiResponse) {
        const localData = generateLocalResponse(cleanMessage, emergencyCheck, specialists, lang);
        aiResponse = localData.response;
        isEmergency = localData.isEmergency;
    }

    const disclaimer = "This response is generated by HealthBridge AI for educational guidance only and does NOT constitute a medical diagnosis. Always consult a qualified medical professional for diagnosis and treatment.";

    return {
        success: true,
        data: {
            response: aiResponse,
            suggestedSpecialists: specialists,
            isEmergency,
            disclaimer,
            language: lang,
        },
    };
};

module.exports = {
    detectEmergency,
    recommendSpecialists,
    processHealthQuery,
};
