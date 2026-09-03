import React, { useEffect, useState } from "react";
import {
    getDoctorAppointments,
    confirmAppointment,
    rejectAppointment,
    completeAppointment,
    cancelAppointment,
} from "../services/api";

const DoctorAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionNotice, setActionNotice] = useState("");

    // Active subtab: "REQUESTS", "UPCOMING", "ALL", "COMPLETED", "CANCELLED_REJECTED"
    const [activeTab, setActiveTab] = useState("REQUESTS");
    const [actionInProgressId, setActionInProgressId] = useState(null);

    const fetchAppointments = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const res = await getDoctorAppointments();
            if (res.success) {
                setAppointments(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching doctor appointments:", err);
            if (err.message && err.message.toLowerCase().includes("doctor profile not found")) {
                setAppointments([]);
            } else {
                setErrorMessage(err.message || "Failed to load clinical appointment schedule.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    // Action handlers with state updates
    const handleConfirm = async (id) => {
        setActionInProgressId(id);
        try {
            const res = await confirmAppointment(id);
            if (res.success) {
                setActionNotice("Appointment confirmed successfully.");
                setTimeout(() => setActionNotice(""), 4000);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error confirming appointment:", err);
            alert(err.message || "Failed to confirm appointment.");
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this appointment request?")) {
            return;
        }
        setActionInProgressId(id);
        try {
            const res = await rejectAppointment(id);
            if (res.success) {
                setActionNotice("Appointment request rejected.");
                setTimeout(() => setActionNotice(""), 4000);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error rejecting appointment:", err);
            alert(err.message || "Failed to reject appointment.");
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleComplete = async (id) => {
        setActionInProgressId(id);
        try {
            const res = await completeAppointment(id);
            if (res.success) {
                setActionNotice("Appointment marked as COMPLETED.");
                setTimeout(() => setActionNotice(""), 4000);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error completing appointment:", err);
            alert(err.message || "Failed to mark appointment as completed.");
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this confirmed appointment?")) {
            return;
        }
        setActionInProgressId(id);
        try {
            const res = await cancelAppointment(id);
            if (res.success) {
                setActionNotice("Appointment cancelled successfully.");
                setTimeout(() => setActionNotice(""), 4000);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            alert(err.message || "Failed to cancel appointment.");
        } finally {
            setActionInProgressId(null);
        }
    };

    // Filter appointments for active tab
    const filteredAppointments = appointments.filter((apt) => {
        if (activeTab === "REQUESTS") return apt.status === "REQUESTED";
        if (activeTab === "UPCOMING") return apt.status === "CONFIRMED";
        if (activeTab === "COMPLETED") return apt.status === "COMPLETED";
        if (activeTab === "CANCELLED_REJECTED") return ["CANCELLED", "REJECTED"].includes(apt.status);
        return true; // ALL
    });

    const requestsCount = appointments.filter((a) => a.status === "REQUESTED").length;
    const upcomingCount = appointments.filter((a) => a.status === "CONFIRMED").length;

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "CONFIRMED":
                return "bg-emerald-800 text-emerald-100 border-emerald-900";
            case "REQUESTED":
                return "bg-amber-700 text-amber-100 border-amber-800";
            case "COMPLETED":
                return "bg-indigo-900 text-indigo-100 border-indigo-950";
            case "REJECTED":
            case "CANCELLED":
                return "bg-rose-900 text-rose-100 border-rose-950";
            default:
                return "bg-[#212842] text-[#F0E7D5] border-[#212842]";
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#212842]">Doctor Clinical Schedule</h2>
                    <p className="text-xs text-[#212842]/70 mt-1">
                        Review incoming patient consultation requests, manage upcoming appointments, and record completed sessions.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    {requestsCount > 0 && (
                        <span className="px-3 py-1 bg-amber-700 text-amber-100 text-xs font-mono font-bold rounded-sm animate-pulse">
                            ⚠️ {requestsCount} PENDING REQUESTS
                        </span>
                    )}
                    <span className="px-3 py-1 bg-[#212842] text-[#F0E7D5] text-xs font-mono font-bold rounded-sm">
                        {upcomingCount} UPCOMING CONFIRMED
                    </span>
                </div>
            </div>

            {/* Action Notice */}
            {actionNotice && (
                <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold rounded-sm flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>{actionNotice}</span>
                    </div>
                    <button onClick={() => setActionNotice("")} className="text-xs font-bold">✕</button>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-2 rounded-md flex items-center space-x-1 overflow-x-auto text-xs">
                <button
                    onClick={() => setActiveTab("REQUESTS")}
                    className={`px-4 py-2 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                        activeTab === "REQUESTS"
                            ? "bg-[#212842] text-[#F0E7D5]"
                            : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                    }`}
                >
                    <span>Appointment Requests</span>
                    <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-xs text-[10px]">
                        {requestsCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("UPCOMING")}
                    className={`px-4 py-2 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                        activeTab === "UPCOMING"
                            ? "bg-[#212842] text-[#F0E7D5]"
                            : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                    }`}
                >
                    <span>Upcoming Appointments</span>
                    <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded-xs text-[10px]">
                        {upcomingCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("COMPLETED")}
                    className={`px-4 py-2 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap ${
                        activeTab === "COMPLETED"
                            ? "bg-[#212842] text-[#F0E7D5]"
                            : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                    }`}
                >
                    Completed ({appointments.filter((a) => a.status === "COMPLETED").length})
                </button>

                <button
                    onClick={() => setActiveTab("CANCELLED_REJECTED")}
                    className={`px-4 py-2 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap ${
                        activeTab === "CANCELLED_REJECTED"
                            ? "bg-[#212842] text-[#F0E7D5]"
                            : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                    }`}
                >
                    Cancelled / Rejected ({appointments.filter((a) => ["CANCELLED", "REJECTED"].includes(a.status)).length})
                </button>

                <button
                    onClick={() => setActiveTab("ALL")}
                    className={`px-4 py-2 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap ${
                        activeTab === "ALL"
                            ? "bg-[#212842] text-[#F0E7D5]"
                            : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                    }`}
                >
                    All Records ({appointments.length})
                </button>
            </div>

            {/* LOADING STATE */}
            {isLoading && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span className="text-xs font-bold text-[#212842] uppercase tracking-wider">
                        Fetching Doctor Schedule...
                    </span>
                </div>
            )}

            {/* ERROR STATE */}
            {!isLoading && errorMessage && (
                <div className="bg-red-50 border border-red-300 p-6 rounded-md text-red-900 flex flex-col items-center justify-center space-y-3">
                    <p className="text-xs font-bold">Error loading appointments: {errorMessage}</p>
                    <button
                        onClick={fetchAppointments}
                        className="py-1.5 px-4 bg-red-900 text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                    >
                        Retry Loading
                    </button>
                </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && !errorMessage && filteredAppointments.length === 0 && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F0E7D5] border border-[#212842]/30 flex items-center justify-center font-serif text-xl font-bold text-[#212842]">
                        📋
                    </div>
                    <h3 className="text-base font-bold font-serif text-[#212842]">
                        No Appointments in this Category
                    </h3>
                    <p className="text-xs text-[#212842]/70 max-w-sm">
                        {activeTab === "REQUESTS"
                            ? "You have no pending appointment requests at this time."
                            : activeTab === "UPCOMING"
                            ? "You have no upcoming confirmed consultations."
                            : "No records found matching your selected view."}
                    </p>
                </div>
            )}

            {/* APPOINTMENTS CARDS GRID */}
            {!isLoading && !errorMessage && filteredAppointments.length > 0 && (
                <div className="space-y-4">
                    {filteredAppointments.map((apt) => {
                        const patientProfile = apt.patientId || {};
                        const patientUser = patientProfile.userId || {};
                        const emergency = patientProfile.emergencyContact || {};

                        const formattedDate = new Date(apt.appointmentDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        });

                        const isPendingAction = actionInProgressId === apt._id;

                        return (
                            <div
                                key={apt._id}
                                className="bg-[#FAF6EE] border border-[#212842]/15 hover:border-[#212842] rounded-md p-6 space-y-4 transition shadow-sm"
                            >
                                {/* Top Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#212842]/15 pb-3">
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase border rounded-sm ${getStatusBadgeClass(apt.status)}`}>
                                            {apt.status}
                                        </span>
                                        <span className="text-xs font-mono text-[#212842]/60">
                                            ID: {apt._id}
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F0E7D5] text-[#212842] border border-[#212842]/20 rounded-sm">
                                            {apt.consultationMode}
                                        </span>
                                    </div>

                                    <div className="text-xs font-mono font-bold text-[#212842]">
                                        📅 {formattedDate} • ⏰ {apt.startTime} - {apt.endTime}
                                    </div>
                                </div>

                                {/* Patient Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm space-y-1">
                                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Patient Information</span>
                                        <div className="font-bold text-sm text-[#212842]">{patientUser.name || "Patient"}</div>
                                        <div className="text-[#212842]/80">Email: {patientUser.email || "N/A"}</div>
                                        <div className="text-[#212842]/80">Phone: {patientUser.phone || "N/A"}</div>
                                    </div>

                                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm space-y-1">
                                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Clinical Demographics</span>
                                        <div>Gender: <strong>{patientProfile.gender || "N/A"}</strong></div>
                                        <div>Blood Group: <strong>{patientProfile.bloodGroup || "Not specified"}</strong></div>
                                        <div>Address: <strong>{patientProfile.address || "N/A"}</strong></div>
                                    </div>

                                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm space-y-1">
                                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Emergency Contact</span>
                                        {emergency.name ? (
                                            <>
                                                <div className="font-bold">{emergency.name} ({emergency.relationship})</div>
                                                <div className="font-mono">Phone: {emergency.phone}</div>
                                            </>
                                        ) : (
                                            <div className="text-[#212842]/60 italic">No emergency contact recorded</div>
                                        )}
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="text-xs text-[#212842]/90 bg-[#F0E7D5] p-3 border border-[#212842]/15 rounded-sm">
                                    <strong className="uppercase text-[10px] font-bold text-[#212842]/70 block mb-0.5">Consultation Reason / Symptoms</strong>
                                    {apt.reason}
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                                    {apt.status === "REQUESTED" && (
                                        <>
                                            <button
                                                onClick={() => handleReject(apt._id)}
                                                disabled={isPendingAction}
                                                className="py-2 px-4 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded-sm transition cursor-pointer disabled:opacity-50"
                                            >
                                                Reject Request
                                            </button>
                                            <button
                                                onClick={() => handleConfirm(apt._id)}
                                                disabled={isPendingAction}
                                                className="py-2 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-sm transition cursor-pointer disabled:opacity-50"
                                            >
                                                Confirm Appointment
                                            </button>
                                        </>
                                    )}

                                    {apt.status === "CONFIRMED" && (
                                        <>
                                            <button
                                                onClick={() => handleCancel(apt._id)}
                                                disabled={isPendingAction}
                                                className="py-2 px-4 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded-sm transition cursor-pointer disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleComplete(apt._id)}
                                                disabled={isPendingAction}
                                                className="py-2 px-5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer disabled:opacity-50"
                                            >
                                                Mark as Completed
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DoctorAppointments;
