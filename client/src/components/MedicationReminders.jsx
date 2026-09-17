import React, { useState, useEffect } from "react";
import {
    getTodayMedicationSchedule,
    updateMedicationStatus as apiUpdateMedicationStatus,
    getMedicationAdherenceHistory,
} from "../services/api";
import { useLanguage } from "../i18n/i18nContext";

const MedicationReminders = () => {
    const { t } = useLanguage();
    const [schedule, setSchedule] = useState([]);
    const [metrics, setMetrics] = useState({
        totalDoses: 0,
        taken: 0,
        skipped: 0,
        pending: 0,
        adherenceRate: 100,
    });
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [schedRes, historyRes] = await Promise.all([
                getTodayMedicationSchedule().catch(() => ({ data: [] })),
                getMedicationAdherenceHistory().catch(() => ({ metrics: {}, data: [] })),
            ]);

            if (schedRes && schedRes.success) {
                setSchedule(schedRes.data || []);
            }
            if (historyRes && historyRes.success) {
                setMetrics(
                    historyRes.metrics || {
                        totalDoses: 0,
                        taken: 0,
                        skipped: 0,
                        pending: 0,
                        adherenceRate: 100,
                    }
                );
                setHistory(historyRes.data || []);
            }
        } catch (err) {
            console.error("Error loading medication reminder data:", err);
            setError(err.message || "Failed to load medication reminders.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdate = async (adherenceId, newStatus) => {
        setActionLoadingId(adherenceId);
        try {
            const res = await apiUpdateMedicationStatus({
                adherenceId,
                status: newStatus,
            });

            if (res && res.success) {
                // Optimistically update local schedule state
                setSchedule((prev) =>
                    prev.map((item) =>
                        item._id === adherenceId ? { ...item, status: newStatus, loggedAt: new Date() } : item
                    )
                );
                // Refresh full metrics & history logs
                const historyRes = await getMedicationAdherenceHistory();
                if (historyRes && historyRes.success) {
                    setMetrics(historyRes.metrics);
                    setHistory(historyRes.data);
                }
            }
        } catch (err) {
            console.error("Failed to update medication status:", err);
            alert(`Error: ${err.message || "Failed to log medication status"}`);
        } finally {
            setActionLoadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-8 rounded-md text-center text-[#212842]">
                <div className="flex items-center justify-center space-x-3 text-sm font-semibold">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Generating today's medication schedule from digital prescriptions...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-[#212842]">
            {/* Header Section */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl">💊</span>
                        <h2 className="text-2xl font-serif font-bold tracking-tight">
                            {t("medications.title")}
                        </h2>
                    </div>
                    <p className="text-xs text-[#212842]/70 mt-1">
                        {t("medications.subtitle")}
                    </p>
                </div>

                {/* Architecture Notification Status Indicator */}
                <div className="flex items-center space-x-2 bg-[#F0E7D5] border border-[#212842]/20 px-3.5 py-2 rounded-sm text-xs">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="font-semibold text-[11px] uppercase tracking-wider">
                        In-App Reminders Active 🔔
                    </span>
                </div>
            </div>

            {/* Compliance Adherence Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                            {t("medications.adherenceScore")}
                        </span>
                        <span className="text-3xl font-serif font-bold text-[#212842]">
                            {metrics.adherenceRate}%
                        </span>
                    </div>
                    <div className="w-full bg-[#F0E7D5] h-2 rounded-full mt-3 overflow-hidden border border-[#212842]/20">
                        <div
                            className="bg-emerald-600 h-full transition-all duration-500"
                            style={{ width: `${metrics.adherenceRate}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                        {t("medications.totalDoses")}
                    </span>
                    <span className="text-3xl font-serif font-bold text-[#212842]">
                        {metrics.totalDoses}
                    </span>
                    <span className="text-xs block text-[#212842]/60 mt-1">
                        Doses generated from prescriptions
                    </span>
                </div>

                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                        {t("medications.takenDoses")}
                    </span>
                    <span className="text-3xl font-serif font-bold text-emerald-700">
                        {metrics.taken}
                    </span>
                    <span className="text-xs block text-emerald-800/70 mt-1 font-semibold">
                        ✓ Logged as taken
                    </span>
                </div>

                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#212842]/70 block mb-1">
                        {t("medications.skippedDoses")}
                    </span>
                    <span className="text-3xl font-serif font-bold text-amber-700">
                        {metrics.skipped}
                    </span>
                    <span className="text-xs block text-amber-800/70 mt-1 font-semibold">
                        ✕ Logged as skipped
                    </span>
                </div>
            </div>

            {/* Today's Schedule Card Stream */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                    <h3 className="text-lg font-serif font-bold text-[#212842]">
                        {t("medications.todaysSchedule")} ({schedule.length})
                    </h3>
                    <span className="text-xs font-mono font-bold bg-[#F0E7D5] px-2.5 py-1 border border-[#212842]/30 rounded-sm">
                        Date: {new Date().toLocaleDateString()}
                    </span>
                </div>

                {schedule.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#212842]/70 italic">
                        {t("medications.noMedicines")}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {schedule.map((item) => {
                            const isPending = item.status === "PENDING";
                            const isTaken = item.status === "TAKEN";
                            const isSkipped = item.status === "SKIPPED";
                            const isUpdating = actionLoadingId === item._id;

                            return (
                                <div
                                    key={item._id}
                                    className={`p-5 rounded-md border transition-all ${
                                        isTaken
                                            ? "bg-emerald-50/70 border-emerald-600/40"
                                            : isSkipped
                                            ? "bg-amber-50/70 border-amber-600/40"
                                            : "bg-[#F0E7D5]/70 border-[#212842]/20 hover:border-[#212842]/50"
                                    }`}
                                >
                                    <div className="flex items-start justify-between border-b border-[#212842]/15 pb-2 mb-3">
                                        <div>
                                            <span className="text-xs font-bold uppercase font-mono tracking-wider px-2 py-0.5 bg-[#212842] text-[#F0E7D5] rounded-sm">
                                                {item.timeSlot} • {item.scheduledTime}
                                            </span>
                                            <h4 className="text-base font-bold text-[#212842] mt-2">
                                                {item.medicineName}
                                            </h4>
                                        </div>

                                        {/* Status Badge */}
                                        <span
                                            className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 border rounded-sm ${
                                                isTaken
                                                    ? "bg-emerald-700 text-white border-emerald-800"
                                                    : isSkipped
                                                    ? "bg-amber-700 text-white border-amber-800"
                                                    : "bg-[#212842] text-[#F0E7D5] border-[#212842]"
                                            }`}
                                        >
                                            {t(`medications.status${item.status.charAt(0) + item.status.slice(1).toLowerCase()}`, item.status)}
                                        </span>
                                    </div>

                                    {/* Medicine Details */}
                                    <div className="grid grid-cols-2 gap-2 text-xs text-[#212842]/80 mb-3">
                                        <div>
                                            <span className="font-bold text-[11px] block">{t("medications.dosage")}:</span>
                                            <span>{item.dosage}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[11px] block">{t("medications.frequency")}:</span>
                                            <span>{item.frequency}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[11px] block">{t("medications.duration")}:</span>
                                            <span>{item.duration || "As prescribed"}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[11px] block">{t("medications.instructions")}:</span>
                                            <span>{item.instructions || "Take as directed"}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-[#212842]/15 flex items-center space-x-3">
                                        <button
                                            disabled={isUpdating}
                                            onClick={() => handleStatusUpdate(item._id, "TAKEN")}
                                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-sm border transition cursor-pointer ${
                                                isTaken
                                                    ? "bg-emerald-800 text-white border-emerald-900"
                                                    : "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800"
                                            }`}
                                        >
                                            {isUpdating ? "Logging..." : t("medications.markTaken")}
                                        </button>

                                        <button
                                            disabled={isUpdating}
                                            onClick={() => handleStatusUpdate(item._id, "SKIPPED")}
                                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-sm border transition cursor-pointer ${
                                                isSkipped
                                                    ? "bg-amber-800 text-white border-amber-900"
                                                    : "bg-amber-700 hover:bg-amber-800 text-white border-amber-800"
                                            }`}
                                        >
                                            {isUpdating ? "Logging..." : t("medications.markSkipped")}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Historical Adherence Log Table */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                <h3 className="text-lg font-serif font-bold text-[#212842]">
                    {t("medications.history")} ({history.length})
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#212842]">
                        <thead>
                            <tr className="border-b border-[#212842]/20 font-bold uppercase text-[10px] tracking-wider text-[#212842]/70">
                                <th className="py-3 px-3">Date & Slot</th>
                                <th className="py-3 px-3">Medicine Name</th>
                                <th className="py-3 px-3">Dosage & Frequency</th>
                                <th className="py-3 px-3">Prescription & Doctor</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Logged Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#212842]/10">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center text-[#212842]/60 italic">
                                        No historical adherence logs recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                history.map((log) => (
                                    <tr key={log._id} className="hover:bg-[#F0E7D5]/60">
                                        <td className="py-3 px-3 font-mono font-bold">
                                            {log.scheduledDate} ({log.timeSlot})
                                        </td>
                                        <td className="py-3 px-3 font-bold">{log.medicineName}</td>
                                        <td className="py-3 px-3">
                                            {log.dosage} — {log.frequency}
                                        </td>
                                        <td className="py-3 px-3">
                                            {log.prescriptionId?.doctorId?.userId?.name || "Attending Doctor"}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span
                                                className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border rounded-sm ${
                                                    log.status === "TAKEN"
                                                        ? "bg-emerald-700 text-white border-emerald-800"
                                                        : log.status === "SKIPPED"
                                                        ? "bg-amber-700 text-white border-amber-800"
                                                        : "bg-[#212842] text-[#F0E7D5] border-[#212842]"
                                                }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-[#212842]/70">
                                            {log.loggedAt ? new Date(log.loggedAt).toLocaleString() : "Not logged yet"}
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

export default MedicationReminders;
