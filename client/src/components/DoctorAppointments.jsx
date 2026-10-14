import React, { useEffect, useState } from "react";
import {
    getDoctorAppointments,
    confirmAppointment,
    rejectAppointment,
    completeAppointment,
    cancelAppointment,
    rescheduleAppointment,
    getDoctorProfile,
    updateDoctorProfile,
} from "../services/api";
import ConsultationRoomModal from "./ConsultationRoomModal";
import DoctorCalendarView from "./DoctorCalendarView";

const DoctorAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionNotice, setActionNotice] = useState("");
    const [activeConsultationId, setActiveConsultationId] = useState(null);

    // View mode: "CALENDAR" or "LIST"
    const [viewMode, setViewMode] = useState("CALENDAR");

    // Active subtab: "REQUESTS", "UPCOMING", "ALL", "COMPLETED", "CANCELLED_REJECTED"
    const [activeTab, setActiveTab] = useState("REQUESTS");
    const [actionInProgressId, setActionInProgressId] = useState(null);

    // Doctor schedule & availability state
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        availableTimings: "09:00 AM - 05:00 PM (Mon - Sat)",
        availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        dailyStartTime: "09:00",
        dailyEndTime: "17:00",
        slotDuration: 30,
    });
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // Reschedule appointment state
    const [reschedulingApt, setReschedulingApt] = useState(null);
    const [rescheduleForm, setRescheduleForm] = useState({
        appointmentDate: "",
        startTime: "09:30",
        endTime: "10:00",
    });
    const [isSavingReschedule, setIsSavingReschedule] = useState(false);

    const fetchAppointments = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            // Fetch appointments and doctor profile in parallel
            const [aptRes, profileRes] = await Promise.all([
                getDoctorAppointments().catch((err) => {
                    if (err.message && err.message.toLowerCase().includes("doctor profile not found")) {
                        return { success: true, data: [] };
                    }
                    throw err;
                }),
                getDoctorProfile().catch(() => null),
            ]);

            if (aptRes && aptRes.success) {
                setAppointments(aptRes.data || []);
            }

            if (profileRes && profileRes.success && profileRes.data) {
                const doc = profileRes.data;
                setDoctorProfile(doc);
                setScheduleForm({
                    availableTimings: doc.availableTimings || "09:00 AM - 05:00 PM (Mon - Sat)",
                    availableDays: doc.availableDays && doc.availableDays.length > 0
                        ? doc.availableDays
                        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    dailyStartTime: doc.dailyStartTime || "09:00",
                    dailyEndTime: doc.dailyEndTime || "17:00",
                    slotDuration: doc.slotDuration || 30,
                });
            }
        } catch (err) {
            console.error("Error fetching doctor appointments:", err);
            setErrorMessage(err.message || "Failed to load clinical appointment schedule.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const toggleDay = (day) => {
        setScheduleForm((prev) => {
            const days = prev.availableDays?.includes(day)
                ? prev.availableDays.filter((d) => d !== day)
                : [...(prev.availableDays || []), day];
            return { ...prev, availableDays: days };
        });
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        setIsSavingSchedule(true);
        try {
            const res = await updateDoctorProfile(scheduleForm);
            if (res.success) {
                setDoctorProfile(res.data);
                setActionNotice("Consultation timings & schedule updated successfully!");
                setTimeout(() => setActionNotice(""), 4000);
                setIsScheduleModalOpen(false);
            }
        } catch (err) {
            console.error("Error updating doctor schedule:", err);
            alert(err.message || "Failed to update schedule.");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleOpenReschedule = (apt) => {
        setReschedulingApt(apt);
        const dateStr = apt.appointmentDate
            ? new Date(apt.appointmentDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
        setRescheduleForm({
            appointmentDate: dateStr,
            startTime: apt.startTime || "09:30",
            endTime: apt.endTime || "10:00",
        });
    };

    const handleSaveReschedule = async (e) => {
        e.preventDefault();
        if (!reschedulingApt) return;
        setIsSavingReschedule(true);
        try {
            const res = await rescheduleAppointment(reschedulingApt._id, rescheduleForm);
            if (res.success) {
                setActionNotice("Appointment date & time updated successfully!");
                setTimeout(() => setActionNotice(""), 4000);
                setReschedulingApt(null);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error rescheduling appointment:", err);
            alert(err.message || "Failed to reschedule appointment.");
        } finally {
            setIsSavingReschedule(false);
        }
    };

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

            {/* Doctor Consultation Availability & Working Hours Card */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-5 rounded-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#212842]/10 pb-3">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">🕒</span>
                            <h3 className="font-serif font-bold text-base text-[#212842]">
                                Consultation Timings & Available Appointment Days
                            </h3>
                        </div>
                        <p className="text-xs text-[#212842]/70 mt-0.5">
                            Set your active clinical consultation hours and days during which patients can schedule appointments.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="py-2 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
                    >
                        <span>⚙️</span>
                        <span>Update Timings & Working Days</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Consultation Timings</span>
                        <span className="font-bold text-xs text-[#212842] block mt-0.5">
                            🕒 {scheduleForm.availableTimings}
                        </span>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm sm:col-span-2">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Available Appointment Days</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                                const isAvailable = scheduleForm.availableDays?.includes(day);
                                return (
                                    <span
                                        key={day}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                                            isAvailable
                                                ? "bg-[#212842] text-[#F0E7D5]"
                                                : "bg-[#FAF6EE] text-[#212842]/40 line-through"
                                        }`}
                                    >
                                        {day.slice(0, 3)}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Daily Window & Slot</span>
                        <span className="font-mono font-bold text-xs text-[#212842] block mt-0.5">
                            {scheduleForm.dailyStartTime} - {scheduleForm.dailyEndTime} ({scheduleForm.slotDuration} min slots)
                        </span>
                    </div>
                </div>
            </div>

            {/* View Mode Switcher */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-2 rounded-md flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setViewMode("CALENDAR")}
                        className={`py-2 px-4 rounded-sm font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
                            viewMode === "CALENDAR"
                                ? "bg-[#212842] text-[#F0E7D5] shadow-sm"
                                : "bg-[#F0E7D5]/70 text-[#212842] hover:bg-[#F0E7D5]"
                        }`}
                    >
                        <span>📅</span>
                        <span>Interactive Calendar Schedule</span>
                    </button>

                    <button
                        onClick={() => setViewMode("LIST")}
                        className={`py-2 px-4 rounded-sm font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
                            viewMode === "LIST"
                                ? "bg-[#212842] text-[#F0E7D5] shadow-sm"
                                : "bg-[#F0E7D5]/70 text-[#212842] hover:bg-[#F0E7D5]"
                        }`}
                    >
                        <span>📋</span>
                        <span>Appointments List View</span>
                    </button>
                </div>

                <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-[#212842]/70">
                    <span className="font-bold text-[#212842]">{appointments.length}</span> appointments total
                </div>
            </div>

            {/* View Mode: CALENDAR */}
            {viewMode === "CALENDAR" && (
                <DoctorCalendarView
                    appointments={appointments}
                    doctorProfile={doctorProfile}
                    scheduleForm={scheduleForm}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onOpenReschedule={handleOpenReschedule}
                    onEnterConsultationRoom={(id) => setActiveConsultationId(id)}
                    onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                    actionInProgressId={actionInProgressId}
                />
            )}

            {/* View Mode: LIST */}
            {viewMode === "LIST" && (
                <div className="space-y-6">
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
                                <div className="pt-2 border-t border-[#212842]/15 flex flex-wrap items-center justify-end gap-2.5">
                                    {["REQUESTED", "CONFIRMED"].includes(apt.status) && (
                                        <button
                                            onClick={() => handleOpenReschedule(apt)}
                                            className="py-2 px-3.5 bg-[#FAF6EE] hover:bg-[#F0E7D5] text-[#212842] font-bold text-xs rounded-sm border border-[#212842]/40 transition cursor-pointer flex items-center space-x-1"
                                        >
                                            <span>📅</span>
                                            <span>Adjust Time & Date</span>
                                        </button>
                                    )}

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

                                    {["CONFIRMED", "COMPLETED"].includes(apt.status) && (
                                        <button
                                            onClick={() => setActiveConsultationId(apt._id)}
                                            className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-sm transition cursor-pointer flex items-center space-x-1"
                                        >
                                            <span>📹</span>
                                            <span>Enter Consultation Room</span>
                                        </button>
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
    )}

            {/* TELEMEDICINE CONSULTATION ROOM MODAL */}
            {activeConsultationId && (
                <ConsultationRoomModal
                    appointmentId={activeConsultationId}
                    onClose={() => setActiveConsultationId(null)}
                    onRefresh={fetchAppointments}
                />
            )}

            {/* Schedule Configuration Modal */}
            {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-[#212842]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-lg w-full p-6 shadow-2xl space-y-4 text-[#212842] max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-[#212842]">
                                    Configure Consultation Timings & Days
                                </h3>
                                <p className="text-[11px] text-[#212842]/70">
                                    Patients will schedule consultations within your designated times and working days.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsScheduleModalOpen(false)}
                                className="text-[#212842]/60 hover:text-[#212842] font-bold text-lg p-1 hover:bg-[#F0E7D5] rounded transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
                            {/* Available Days Picker */}
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1.5">
                                    Working Days of the Week
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                                        const isSelected = scheduleForm.availableDays?.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`py-2 px-1 text-xs font-bold rounded-sm border transition text-center cursor-pointer ${
                                                    isSelected
                                                        ? "bg-[#212842] text-[#F0E7D5] border-[#212842]"
                                                        : "bg-[#F0E7D5] text-[#212842]/60 border-[#212842]/20 hover:bg-[#E2D7C2]"
                                                }`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Daily Hours */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold uppercase tracking-wider mb-1">
                                        Daily Start Time (24h)
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleForm.dailyStartTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, dailyStartTime: e.target.value })}
                                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono focus:outline-none focus:border-[#212842]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold uppercase tracking-wider mb-1">
                                        Daily End Time (24h)
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleForm.dailyEndTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, dailyEndTime: e.target.value })}
                                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono focus:outline-none focus:border-[#212842]"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Slot Duration */}
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Default Consultation Slot Duration
                                </label>
                                <select
                                    value={scheduleForm.slotDuration}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, slotDuration: Number(e.target.value) })}
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-semibold"
                                >
                                    <option value={15}>15 Minutes per Consultation</option>
                                    <option value={20}>20 Minutes per Consultation</option>
                                    <option value={30}>30 Minutes per Consultation (Standard)</option>
                                    <option value={45}>45 Minutes per Consultation</option>
                                    <option value={60}>60 Minutes per Consultation</option>
                                </select>
                            </div>

                            {/* Consultation Timings Text Display */}
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Public Consultation Timings Display String
                                </label>
                                <input
                                    type="text"
                                    value={scheduleForm.availableTimings}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, availableTimings: e.target.value })}
                                    placeholder="e.g. 09:00 AM - 05:00 PM (Mon - Sat)"
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-semibold"
                                    required
                                />
                                <div className="flex items-center justify-between text-[10px] text-[#212842]/60 mt-1">
                                    <span>This text is shown on your verified clinician card & bookings.</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const days = (scheduleForm.availableDays || []).map(d => d.slice(0, 3)).join(", ");
                                            setScheduleForm(prev => ({
                                                ...prev,
                                                availableTimings: `${prev.dailyStartTime} - ${prev.dailyEndTime} (${days || "Mon - Sat"})`
                                            }));
                                        }}
                                        className="underline cursor-pointer hover:text-[#212842]"
                                    >
                                        Auto-generate from inputs
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsScheduleModalOpen(false)}
                                    className="py-2 px-4 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingSchedule}
                                    className="py-2 px-5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold rounded-sm transition cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                                >
                                    {isSavingSchedule ? "Saving Schedule..." : "Save Availability Schedule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reschedule Appointment Modal */}
            {reschedulingApt && (
                <div className="fixed inset-0 bg-[#212842]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-md w-full p-6 shadow-2xl space-y-4 text-[#212842]">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-[#212842]">
                                    Adjust Appointment Date & Times
                                </h3>
                                <p className="text-[11px] text-[#212842]/70">
                                    Patient: <strong>{reschedulingApt.patientId?.userId?.name || "Patient"}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setReschedulingApt(null)}
                                className="text-[#212842]/60 hover:text-[#212842] font-bold text-lg p-1 hover:bg-[#F0E7D5] rounded transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveReschedule} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Appointment Date <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    value={rescheduleForm.appointmentDate}
                                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, appointmentDate: e.target.value })}
                                    className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold uppercase tracking-wider mb-1">
                                        Start Time (24h) <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={rescheduleForm.startTime}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })}
                                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold uppercase tracking-wider mb-1">
                                        End Time (24h) <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={rescheduleForm.endTime}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })}
                                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Quick Slots */}
                            <div>
                                <span className="block font-bold uppercase tracking-wider text-[10px] text-[#212842]/70 mb-1.5">
                                    Quick Slot Options
                                </span>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[
                                        { start: "09:30", end: "10:00", label: "09:30 AM" },
                                        { start: "11:00", end: "11:30", label: "11:00 AM" },
                                        { start: "14:00", end: "14:30", label: "02:00 PM" },
                                        { start: "16:00", end: "16:30", label: "04:00 PM" },
                                    ].map((slot) => (
                                        <button
                                            key={slot.start}
                                            type="button"
                                            onClick={() => setRescheduleForm(prev => ({ ...prev, startTime: slot.start, endTime: slot.end }))}
                                            className="py-1.5 px-1 text-[10px] font-mono font-bold bg-[#F0E7D5] hover:bg-[#E2D7C2] border border-[#212842]/30 rounded-sm text-center cursor-pointer"
                                        >
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setReschedulingApt(null)}
                                    className="py-2 px-4 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingReschedule}
                                    className="py-2 px-5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold rounded-sm transition cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingReschedule ? "Saving..." : "Update Appointment Time & Date"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorAppointments;
