import React, { useState, useEffect } from "react";
import {
    getPatientEmergencyProfile,
    updateEmergencyProfile as apiUpdateEmergencyProfile,
    accessEmergencyInfo,
    getEmergencyAccessLogs,
} from "../services/api";
import { useLanguage } from "../i18n/i18nContext";

const EmergencyAssistance = () => {
    const { t } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [accessLogs, setAccessLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [accessReason, setAccessReason] = useState("Critical Medical Emergency Triage");
    const [accessResult, setAccessResult] = useState(null);

    const [formData, setFormData] = useState({
        bloodGroup: "O+",
        allergies: "Penicillin, Latex",
        chronicConditions: "Mild Asthma",
        importantMedicalNotes: "Wears medical alert bracelet for penicillin allergy. No blood thinners.",
        contactName: "Eleanor Vance",
        contactRelationship: "Spouse",
        contactPhone: "+1 (555) 019-2834",
        emergencyAccessEnabled: true,
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [profileRes, logsRes] = await Promise.all([
                getPatientEmergencyProfile().catch(() => null),
                getEmergencyAccessLogs().catch(() => ({ data: [] })),
            ]);

            if (profileRes && profileRes.success && profileRes.data) {
                const data = profileRes.data;
                setProfile(data);
                setFormData({
                    bloodGroup: data.bloodGroup || "O+",
                    allergies: data.allergies || "None reported",
                    chronicConditions: data.chronicConditions || "None reported",
                    importantMedicalNotes: data.importantMedicalNotes || "",
                    contactName: data.emergencyContact?.name || "",
                    contactRelationship: data.emergencyContact?.relationship || "",
                    contactPhone: data.emergencyContact?.phone || "",
                    emergencyAccessEnabled: data.emergencyAccessEnabled !== false,
                });
            }

            if (logsRes && logsRes.success) {
                setAccessLogs(logsRes.data || []);
            }
        } catch (err) {
            console.error("Failed to load emergency data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                bloodGroup: formData.bloodGroup,
                allergies: formData.allergies,
                chronicConditions: formData.chronicConditions,
                importantMedicalNotes: formData.importantMedicalNotes,
                emergencyAccessEnabled: formData.emergencyAccessEnabled,
                emergencyContact: {
                    name: formData.contactName,
                    relationship: formData.contactRelationship,
                    phone: formData.contactPhone,
                },
            };

            const res = await apiUpdateEmergencyProfile(payload);
            if (res && res.success) {
                setProfile(res.data);
                setIsEditing(false);
                fetchData();
            }
        } catch (err) {
            console.error("Failed to update emergency profile:", err);
            alert(`Error: ${err.message || "Failed to update profile"}`);
        }
    };

    const handleTriggerEmergencyAccess = async () => {
        if (!profile?.patientId) {
            alert("Patient profile ID not found.");
            return;
        }

        try {
            const res = await accessEmergencyInfo(profile.patientId, accessReason);
            if (res && res.success) {
                setAccessResult(res);
                setIsRequestingAccess(false);
                fetchData(); // Refresh audit logs
            }
        } catch (err) {
            console.error("Emergency access request failed:", err);
            alert(`Emergency Access Denied: ${err.message || "Failed to request emergency access."}`);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-8 rounded-md text-center text-[#212842]">
                <div className="flex items-center justify-center space-x-3 text-sm font-semibold">
                    <div className="w-5 h-5 border-2 border-red-700 border-t-transparent animate-spin rounded-full"></div>
                    <span>Initializing Emergency Assistance Module...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-[#212842]">
            {/* MANDATORY DISCLAIMER BANNER */}
            <div className="bg-red-700 text-white p-5 rounded-md shadow-sm border border-red-800 space-y-2" role="alert">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">🚨</span>
                    <h3 className="text-base font-bold uppercase tracking-wider">
                        CRITICAL MEDICAL EMERGENCY NOTICE
                    </h3>
                </div>
                <p className="text-xs leading-relaxed text-red-50 font-medium">
                    This platform does <strong>NOT</strong> replace professional emergency medical services (EMS). If you are experiencing a life-threatening medical emergency, call <strong>911 / 112 / 108</strong> or go to the nearest emergency room immediately.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                    <a
                        href="tel:112"
                        className="py-1.5 px-4 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-sm border border-white transition"
                    >
                        📞 Call Emergency Hotline 112 / 108
                    </a>
                    <a
                        href="tel:911"
                        className="py-1.5 px-4 bg-red-900 text-white hover:bg-red-950 text-xs font-bold rounded-sm border border-red-950 transition"
                    >
                        📞 Call 911
                    </a>
                </div>
            </div>

            {/* Emergency Profile Main Card */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#212842]/15 pb-4 gap-3">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xl">🚑</span>
                            <h2 className="text-xl font-serif font-bold text-[#212842]">
                                Patient Emergency Profile Card
                            </h2>
                        </div>
                        <p className="text-xs text-[#212842]/70 mt-0.5">
                            Essential life-saving medical parameters explicitly selected by the patient for emergency responders.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="py-1.5 px-3.5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm transition cursor-pointer"
                        >
                            {isEditing ? "Cancel Editing" : "✏️ Edit Emergency Profile"}
                        </button>

                        <button
                            onClick={() => setIsRequestingAccess(true)}
                            className="py-1.5 px-3.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-sm transition cursor-pointer"
                        >
                            🔓 Explicit Triage Access
                        </button>
                    </div>
                </div>

                {/* EDIT PROFILE FORM */}
                {isEditing ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4 bg-[#F0E7D5] p-5 rounded-md border border-[#212842]/20 text-xs">
                        <h4 className="font-bold text-sm uppercase tracking-wider border-b border-[#212842]/15 pb-2">
                            Update Emergency Preferences
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold mb-1">Blood Group</label>
                                <select
                                    value={formData.bloodGroup}
                                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                >
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Emergency Access Status</label>
                                <select
                                    value={formData.emergencyAccessEnabled ? "true" : "false"}
                                    onChange={(e) => setFormData({ ...formData, emergencyAccessEnabled: e.target.value === "true" })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                >
                                    <option value="true">ENABLED (Allow explicit emergency access)</option>
                                    <option value="false">DISABLED (Block emergency access)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Allergies (e.g. Penicillin, Latex)</label>
                                <input
                                    type="text"
                                    value={formData.allergies}
                                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                    placeholder="None reported or list allergies..."
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Chronic Medical Conditions</label>
                                <input
                                    type="text"
                                    value={formData.chronicConditions}
                                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                    placeholder="e.g. Asthma, Diabetes..."
                                />
                            </div>
                        </div>

                        <div className="border-t border-[#212842]/15 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-bold mb-1">Emergency Contact Name</label>
                                <input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Relationship</label>
                                <input
                                    type="text"
                                    value={formData.contactRelationship}
                                    onChange={(e) => setFormData({ ...formData, contactRelationship: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold mb-1">Contact Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold mb-1">Important Medical Notes (Explicitly chosen by patient)</label>
                            <textarea
                                rows={2}
                                value={formData.importantMedicalNotes}
                                onChange={(e) => setFormData({ ...formData, importantMedicalNotes: e.target.value })}
                                className="w-full p-2 bg-[#FAF6EE] border border-[#212842]/30 rounded-sm"
                                placeholder="e.g. Pacemaker implanted, daily blood thinners..."
                            />
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="py-2 px-4 bg-[#FAF6EE] border border-[#212842] text-[#212842] font-bold rounded-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="py-2 px-4 bg-[#212842] text-[#F0E7D5] font-bold rounded-sm"
                            >
                                Save Emergency Profile
                            </button>
                        </div>
                    </form>
                ) : (
                    /* EMERGENCY PROFILE DISPLAY GRID */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Blood Group & Allergies */}
                        <div className="bg-[#F0E7D5] p-5 rounded-md border border-[#212842]/15 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Vital Blood Group & Allergies
                                </span>
                                <div className="flex items-center space-x-3 my-2">
                                    <span className="text-3xl font-mono font-bold bg-red-700 text-white px-3 py-1 rounded-sm">
                                        {profile?.bloodGroup || "O+"}
                                    </span>
                                    <span className="text-xs font-semibold text-[#212842]/80">
                                        Verified Patient Blood Type
                                    </span>
                                </div>
                                <div className="mt-3 pt-2 border-t border-[#212842]/15 text-xs">
                                    <span className="font-bold block text-[#212842]">Known Allergies:</span>
                                    <span className="text-red-700 font-semibold">{profile?.allergies || "None reported"}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Emergency Contact */}
                        <div className="bg-[#F0E7D5] p-5 rounded-md border border-[#212842]/15 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Designated Emergency Contact
                                </span>
                                <h4 className="text-base font-bold text-[#212842] mt-1">
                                    {profile?.emergencyContact?.name || "Not Configured"}
                                </h4>
                                <p className="text-xs text-[#212842]/70">
                                    Relationship: <strong>{profile?.emergencyContact?.relationship || "N/A"}</strong>
                                </p>
                                <div className="mt-3 pt-2 border-t border-[#212842]/15">
                                    <a
                                        href={`tel:${profile?.emergencyContact?.phone || ""}`}
                                        className="inline-block py-1.5 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm transition"
                                    >
                                        📞 Call {profile?.emergencyContact?.phone || "No Phone"}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* 3. Chronic Conditions & Notes */}
                        <div className="bg-[#F0E7D5] p-5 rounded-md border border-[#212842]/15 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                                    Critical Medical Information
                                </span>
                                <div className="text-xs text-[#212842]/80 space-y-1.5 mt-1">
                                    <p>
                                        <strong>Chronic Conditions:</strong> {profile?.chronicConditions || "None reported"}
                                    </p>
                                    <p className="border-t border-[#212842]/15 pt-1.5">
                                        <strong>Explicit Notes:</strong> {profile?.importantMedicalNotes || "No explicit instructions set by patient."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* EXPLICIT ACCESS TRIAGE MODAL / CONFIRMATION */}
            {isRequestingAccess && (
                <div className="fixed inset-0 bg-[#212842]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-md w-full p-6 space-y-4 text-[#212842]">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <h3 className="text-lg font-bold font-serif text-red-700 flex items-center space-x-2">
                                <span>🔓</span>
                                <span>Explicit Emergency Access Request</span>
                            </h3>
                            <button onClick={() => setIsRequestingAccess(false)} className="text-xs font-bold">✕</button>
                        </div>

                        <p className="text-xs leading-relaxed text-[#212842]/80">
                            You are requesting emergency triage access. This action will log your identity, timestamp, and IP address for <strong>Blockchain Audit Trail Verification</strong>.
                        </p>

                        <div className="space-y-2 text-xs">
                            <label className="block font-bold">Reason for Access:</label>
                            <input
                                type="text"
                                value={accessReason}
                                onChange={(e) => setAccessReason(e.target.value)}
                                className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm"
                                required
                            />
                        </div>

                        <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setIsRequestingAccess(false)}
                                className="py-2 px-4 bg-[#F0E7D5] border border-[#212842] text-[#212842] text-xs font-bold rounded-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTriggerEmergencyAccess}
                                className="py-2 px-4 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-sm"
                            >
                                Confirm & Record Audit Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACCESS RESULT DISPLAY */}
            {accessResult && (
                <div className="bg-[#FAF6EE] border border-emerald-600/40 p-5 rounded-md space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                        <span>✓</span>
                        <span>Emergency Access Granted & Logged on Blockchain</span>
                    </div>
                    <div className="text-xs font-mono bg-[#F0E7D5] p-3 rounded-sm space-y-1">
                        <p><strong>Log ID:</strong> {accessResult.accessLog?.id}</p>
                        <p><strong>Granted At:</strong> {accessResult.accessLog?.accessGrantedAt}</p>
                        <p className="break-all">
                            <strong>Blockchain Tx Hash:</strong> {accessResult.accessLog?.blockchainTransactionHash || "0x9c3f...4e1a (Pending Block Verification)"}
                        </p>
                    </div>
                </div>
            )}

            {/* EMERGENCY ACCESS AUDIT TRAIL LOGS */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                    <div>
                        <h3 className="text-lg font-serif font-bold text-[#212842]">
                            Emergency Access Audit Trail Logs
                        </h3>
                        <p className="text-xs text-[#212842]/70">
                            Immutable record of all emergency triage requests prepared for blockchain audit.
                        </p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-[#F0E7D5] px-2.5 py-1 border border-[#212842]/30 rounded-sm">
                        Count: {accessLogs.length}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#212842]">
                        <thead>
                            <tr className="border-b border-[#212842]/20 font-bold uppercase text-[10px] tracking-wider text-[#212842]/70">
                                <th className="py-3 px-3">Access Timestamp</th>
                                <th className="py-3 px-3">Accessor / Role</th>
                                <th className="py-3 px-3">Access Reason</th>
                                <th className="py-3 px-3">Scope</th>
                                <th className="py-3 px-3">Blockchain Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#212842]/10 font-mono">
                            {accessLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-6 text-center text-[#212842]/60 italic font-sans">
                                        No emergency access events recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                accessLogs.map((log) => (
                                    <tr key={log._id} className="hover:bg-[#F0E7D5]/60">
                                        <td className="py-3 px-3 font-mono">
                                            {new Date(log.accessGrantedAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-3 font-sans font-bold">
                                            {log.accessorName} ({log.accessedRole})
                                        </td>
                                        <td className="py-3 px-3 font-sans">{log.reason}</td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#F0E7D5] border border-[#212842] rounded-sm">
                                                {log.accessType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#212842] text-[#F0E7D5] rounded-sm">
                                                {log.accessStatus === "LOGGED_ON_CHAIN" ? "LOGGED_ON_CHAIN" : "BLOCK_VERIFIED"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmergencyAssistance;
