import React, { useState, useEffect } from "react";
import { getRuralWellnessData } from "../services/api";
import { useLanguage } from "../i18n/i18nContext";

const RuralHealthcare = () => {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState("all");
    const [wellnessData, setWellnessData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWellness = async () => {
            setIsLoading(true);
            try {
                const res = await getRuralWellnessData();
                if (res && res.success) {
                    setWellnessData(res.data);
                }
            } catch (err) {
                console.error("Error fetching rural wellness data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWellness();
    }, []);

    if (isLoading) {
        return (
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-8 rounded-md text-center text-[#212842]">
                <div className="flex items-center justify-center space-x-3 text-sm font-semibold">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Loading Rural Health & Wellness Knowledge Base...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-[#212842]">
            {/* Header Banner */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl">🌾</span>
                        <h2 className="text-2xl font-serif font-bold tracking-tight">
                            Rural Healthcare & Wellness Portal
                        </h2>
                    </div>
                    <p className="text-xs text-[#212842]/70 mt-1">
                        Accessible health education, traditional Ayurvedic wellness, nutrition, yoga, and ASHA worker directory.
                    </p>
                </div>

                <div className="flex items-center space-x-2 bg-[#F0E7D5] border border-[#212842]/20 px-3 py-1.5 rounded-sm text-xs font-mono font-bold">
                    <span>🌐 Multilingual Ready (EN / HI / TA / TE)</span>
                </div>
            </div>

            {/* MANDATORY GENERAL WELLNESS DISCLAIMER */}
            <div className="bg-[#F0E7D5] border border-[#212842]/20 p-4 rounded-md text-xs leading-relaxed text-[#212842]/90 flex items-start space-x-3">
                <span className="text-xl">⚠️</span>
                <div>
                    <strong>General Wellness & Preventive Education Notice:</strong>
                    <p className="mt-0.5">
                        Information provided in this portal is for general health literacy, traditional wellness awareness, and preventive education only. It does <strong>NOT</strong> constitute a medical diagnosis, prescription, or treatment plan. Always consult a qualified medical doctor or your local ASHA health worker for any medical symptoms.
                    </p>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-2 rounded-md flex items-center space-x-1.5 overflow-x-auto text-xs font-bold">
                {[
                    { id: "all", label: "🌟 All Guides" },
                    { id: "asha", label: "👩‍⚕️ ASHA Directory" },
                    { id: "specialist", label: "🏥 Specialist Referral" },
                    { id: "ayurveda", label: "🌿 Ayurvedic Wellness" },
                    { id: "nutrition", label: "🥗 Nutrition & Millets" },
                    { id: "yoga", label: "🧘 Yoga & Pranayama" },
                    { id: "lifestyle", label: "🏡 Healthy Habits" },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`px-3.5 py-1.5 rounded-sm transition cursor-pointer whitespace-nowrap ${
                            activeSection === item.id
                                ? "bg-[#212842] text-[#F0E7D5]"
                                : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* SECTION 1: COMMUNITY HEALTH WORKER (ASHA / ANM) SUPPORT DIRECTORY */}
            {(activeSection === "all" || activeSection === "asha") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                        <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2">
                            <span>👩‍⚕️</span>
                            <span>Community Health Worker Directory (ASHA / ANM Support)</span>
                        </h3>
                        <span className="text-xs font-mono bg-[#F0E7D5] px-2 py-1 rounded-sm border border-[#212842]/20">
                            Primary Rural Contact
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(wellnessData?.ashaWorkerDirectory || []).map((worker, idx) => (
                            <div key={idx} className="bg-[#F0E7D5]/80 border border-[#212842]/15 p-4 rounded-md space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#212842] text-sm">{worker.contactPerson}</span>
                                    <span className="font-mono text-[10px] bg-[#212842] text-[#F0E7D5] px-2 py-0.5 rounded-sm">
                                        {worker.region}
                                    </span>
                                </div>
                                <p className="text-[#212842]/80"><strong>Services Offered:</strong> {worker.services}</p>
                                <div className="pt-2 border-t border-[#212842]/15">
                                    <a
                                        href={`tel:${worker.phone}`}
                                        className="inline-block py-1.5 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm transition"
                                    >
                                        📞 Call ASHA Helpline: {worker.phone}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 2: SPECIALIST RECOMMENDATION & PHC GUIDANCE */}
            {(activeSection === "all" || activeSection === "specialist") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2 border-b border-[#212842]/15 pb-3">
                        <span>🏥</span>
                        <span>Rural Specialist Referral & Care Navigation</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(wellnessData?.specialistGuidance || []).map((guide, idx) => (
                            <div key={idx} className="bg-[#F0E7D5]/70 border border-[#212842]/15 p-4 rounded-md space-y-1.5 text-xs">
                                <h4 className="font-bold text-sm text-[#212842]">{guide.category}</h4>
                                <p className="text-[#212842]/80">{guide.description}</p>
                                <div className="pt-2 text-[11px] font-semibold text-[#212842]/70">
                                    <strong>Recommended Point of Contact:</strong> {guide.recommendedContact}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 3: AYURVEDIC WELLNESS INFORMATION */}
            {(activeSection === "all" || activeSection === "ayurveda") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                        <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2">
                            <span>🌿</span>
                            <span>Ayurvedic Wellness & Herbal Awareness</span>
                        </h3>
                        <span className="text-[11px] text-[#212842]/60 italic font-mono">Traditional Lifestyle Support</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {((wellnessData?.ayurvedicWellness?.[0]?.items) || []).map((herb, idx) => (
                            <div key={idx} className="bg-[#F0E7D5]/80 border border-[#212842]/15 p-4 rounded-md space-y-2 text-xs">
                                <h4 className="font-bold text-sm text-[#212842] border-b border-[#212842]/10 pb-1">{herb.name}</h4>
                                <p className="text-[#212842]/80 leading-relaxed">{herb.benefits}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-[11px] text-[#212842]/70 bg-[#F0E7D5] p-3 rounded-sm border border-[#212842]/10">
                        📌 <strong>Ayurveda Safety Note:</strong> Ayurvedic remedies are intended for daily wellness maintenance and traditional dietary awareness. Always inform your treating doctor before taking herbal supplements alongside prescription medications.
                    </div>
                </div>
            )}

            {/* SECTION 4: NUTRITION & TRADITIONAL MILLETS */}
            {(activeSection === "all" || activeSection === "nutrition") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2 border-b border-[#212842]/15 pb-3">
                        <span>🥗</span>
                        <span>Nutrition Guidance & Anemia Prevention</span>
                    </h3>

                    <div className="bg-[#F0E7D5]/80 border border-[#212842]/15 p-5 rounded-md space-y-3 text-xs">
                        <h4 className="font-bold text-sm text-[#212842]">Essential Dietary Recommendations for Rural Health</h4>
                        <ul className="list-disc pl-5 space-y-2 text-[#212842]/80">
                            {((wellnessData?.nutritionGuidance?.[0]?.recommendations) || []).map((rec, idx) => (
                                <li key={idx} className="leading-relaxed">{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* SECTION 5: YOGA & PRANAYAMA GUIDANCE */}
            {(activeSection === "all" || activeSection === "yoga") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2 border-b border-[#212842]/15 pb-3">
                        <span>🧘</span>
                        <span>Yoga & Breathwork (Pranayama) Guidance</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {((wellnessData?.yogaGuidance?.[0]?.practices) || []).map((practice, idx) => (
                            <div key={idx} className="bg-[#F0E7D5]/80 border border-[#212842]/15 p-4 rounded-md space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#212842] text-sm">{practice.name}</span>
                                    <span className="font-mono text-[10px] bg-[#212842] text-[#F0E7D5] px-2 py-0.5 rounded-sm">
                                        {practice.duration}
                                    </span>
                                </div>
                                <p className="text-[#212842]/80"><strong>Health Benefit:</strong> {practice.purpose}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION 6: HEALTHY LIFESTYLE & PREVENTIVE HYGIENE */}
            {(activeSection === "all" || activeSection === "lifestyle") && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <h3 className="text-lg font-serif font-bold text-[#212842] flex items-center space-x-2 border-b border-[#212842]/15 pb-3">
                        <span>🏡</span>
                        <span>Healthy Lifestyle & Preventive Hygiene</span>
                    </h3>

                    <div className="bg-[#F0E7D5]/80 border border-[#212842]/15 p-5 rounded-md space-y-3 text-xs">
                        <ul className="list-disc pl-5 space-y-2 text-[#212842]/80">
                            {((wellnessData?.healthyLifestyle?.[0]?.habits) || []).map((habit, idx) => (
                                <li key={idx} className="leading-relaxed">{habit}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuralHealthcare;
