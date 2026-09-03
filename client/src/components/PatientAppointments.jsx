import React, { useEffect, useState } from "react";
import { getPatientAppointments, cancelAppointment } from "../services/api";

const PatientAppointments = ({ onOpenBookModal }) => {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionNotice, setActionNotice] = useState("");
    const [cancellingId, setCancellingId] = useState(null);

    // Active status filter tab
    const [statusFilter, setStatusFilter] = useState("ALL");

    const fetchAppointments = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const res = await getPatientAppointments();
            if (res.success) {
                setAppointments(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching patient appointments:", err);
            if (err.message && err.message.toLowerCase().includes("patient profile not found")) {
                setAppointments([]);
            } else {
                setErrorMessage(err.message || "Failed to load your appointments.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleCancel = async (appointmentId) => {
        if (!window.confirm("Are you sure you want to cancel this appointment?")) {
            return;
        }

        setCancellingId(appointmentId);
        try {
            const res = await cancelAppointment(appointmentId);
            if (res.success) {
                setActionNotice("Appointment cancelled successfully.");
                setTimeout(() => setActionNotice(""), 4000);
                fetchAppointments();
            }
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            alert(err.message || "Failed to cancel appointment.");
        } finally {
            setCancellingId(null);
        }
    };

    // Filter appointments by status tab
    const filteredAppointments = appointments.filter((apt) => {
        if (statusFilter === "ALL") return true;
        return apt.status === statusFilter;
    });

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
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#212842]">My Clinical Appointments</h2>
                    <p className="text-xs text-[#212842]/70 mt-1">
                        Track and manage your scheduled consultations with attending clinicians.
                    </p>
                </div>

                <button
                    onClick={onOpenBookModal}
                    className="py-2.5 px-4 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                >
                    + Book New Appointment
                </button>
            </div>

            {/* Action notice toast */}
            {actionNotice && (
                <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold rounded-sm flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>{actionNotice}</span>
                    </div>
                    <button onClick={() => setActionNotice("")} className="text-xs font-bold">✕</button>
                </div>
            )}

            {/* Status Filter Tabs */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-2 rounded-md flex items-center space-x-1 overflow-x-auto text-xs">
                {["ALL", "REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED"].map((tab) => {
                    const count = tab === "ALL" ? appointments.length : appointments.filter((a) => a.status === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded-sm transition cursor-pointer whitespace-nowrap ${
                                statusFilter === tab
                                    ? "bg-[#212842] text-[#F0E7D5]"
                                    : "text-[#212842]/70 hover:bg-[#F0E7D5] hover:text-[#212842]"
                            }`}
                        >
                            {tab} ({count})
                        </button>
                    );
                })}
            </div>

            {/* LOADING STATE */}
            {isLoading && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span className="text-xs font-bold text-[#212842] uppercase tracking-wider">
                        Loading Appointments...
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
                        📅
                    </div>
                    <h3 className="text-base font-bold font-serif text-[#212842]">No Appointments Found</h3>
                    <p className="text-xs text-[#212842]/70 max-w-sm">
                        {statusFilter === "ALL"
                            ? "You do not have any scheduled appointments yet. Find a doctor and book your consultation."
                            : `You have no appointments with status '${statusFilter}'.`}
                    </p>
                    {statusFilter === "ALL" && (
                        <button
                            onClick={onOpenBookModal}
                            className="py-2 px-4 bg-[#212842] text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer mt-2"
                        >
                            Book Appointment Now
                        </button>
                    )}
                </div>
            )}

            {/* SUCCESS STATE - APPOINTMENTS LIST */}
            {!isLoading && !errorMessage && filteredAppointments.length > 0 && (
                <div className="space-y-4">
                    {filteredAppointments.map((apt) => {
                        const doctorObj = apt.doctorId || {};
                        const doctorUser = doctorObj.userId || {};
                        const formattedDate = new Date(apt.appointmentDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        });

                        const canCancel = ["REQUESTED", "CONFIRMED"].includes(apt.status);

                        return (
                            <div
                                key={apt._id}
                                className="bg-[#FAF6EE] border border-[#212842]/15 hover:border-[#212842] rounded-md p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition shadow-sm"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase border rounded-sm ${getStatusBadgeClass(apt.status)}`}>
                                            {apt.status}
                                        </span>
                                        <span className="text-[11px] font-mono text-[#212842]/60">
                                            ID: {apt._id}
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F0E7D5] text-[#212842] border border-[#212842]/20 rounded-sm">
                                            {apt.consultationMode}
                                        </span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-1">
                                        <div>
                                            <h4 className="font-serif font-bold text-base text-[#212842]">
                                                {doctorUser.name || "Attending Physician"}
                                            </h4>
                                            <p className="text-xs text-[#212842]/70 font-semibold">
                                                {doctorObj.specialization || "Specialist"} • {doctorObj.hospital || "Clinic"}
                                            </p>
                                        </div>

                                        <div className="sm:border-l sm:border-[#212842]/15 sm:pl-6">
                                            <div className="text-xs font-mono font-bold text-[#212842]">
                                                📅 {formattedDate}
                                            </div>
                                            <div className="text-xs font-mono text-[#212842]/80">
                                                ⏰ {apt.startTime} - {apt.endTime}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-[#212842]/80 bg-[#F0E7D5] p-2.5 border border-[#212842]/10 rounded-sm mt-2">
                                        <strong>Reason:</strong> {apt.reason}
                                    </div>
                                </div>

                                {/* Actions */}
                                {canCancel && (
                                    <div className="flex items-center space-x-2 w-full md:w-auto border-t md:border-t-0 border-[#212842]/15 pt-3 md:pt-0">
                                        <button
                                            onClick={() => handleCancel(apt._id)}
                                            disabled={cancellingId === apt._id}
                                            className="w-full md:w-auto py-2 px-4 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded-sm transition cursor-pointer disabled:opacity-50"
                                        >
                                            {cancellingId === apt._id ? "Cancelling..." : "Cancel Appointment"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PatientAppointments;
