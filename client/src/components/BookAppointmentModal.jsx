import React, { useState } from "react";
import { createAppointment } from "../services/api";

const BookAppointmentModal = ({ doctor, verifiedDoctors = [], onClose, onSuccess }) => {
    const [selectedDoctor, setSelectedDoctor] = useState(doctor || verifiedDoctors[0] || null);

    // Get today's YYYY-MM-DD string for min date limit
    const todayStr = new Date().toISOString().split("T")[0];

    const [form, setForm] = useState({
        appointmentDate: todayStr,
        startTime: "09:30",
        endTime: "10:00",
        consultationMode: selectedDoctor?.consultationMode === "IN_PERSON" ? "IN_PERSON" : "ONLINE",
        reason: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleDoctorChange = (e) => {
        const docId = e.target.value;
        const doc = verifiedDoctors.find((d) => d._id === docId);
        setSelectedDoctor(doc);
        if (doc) {
            setForm((prev) => ({
                ...prev,
                consultationMode: doc.consultationMode === "IN_PERSON" ? "IN_PERSON" : "ONLINE",
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!selectedDoctor) {
            setErrorMessage("Please select a verified doctor.");
            return;
        }

        if (!form.appointmentDate || !form.startTime || !form.endTime || !form.reason.trim()) {
            setErrorMessage("Please fill in all required fields.");
            return;
        }

        // Time ordering validation
        if (form.startTime >= form.endTime) {
            setErrorMessage("End time must be strictly after start time.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                doctorId: selectedDoctor._id,
                appointmentDate: form.appointmentDate,
                startTime: form.startTime,
                endTime: form.endTime,
                consultationMode: form.consultationMode,
                reason: form.reason.trim(),
            };

            const response = await createAppointment(payload);

            if (response.success) {
                setSuccessMessage("Appointment requested successfully!");
                setTimeout(() => {
                    if (onSuccess) onSuccess(response.data);
                    onClose();
                }, 1500);
            }
        } catch (err) {
            console.error("Booking error:", err);
            setErrorMessage(err.message || "Failed to schedule appointment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#212842]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-md w-full p-6 shadow-2xl space-y-4 text-[#212842] max-h-[90vh] overflow-y-auto">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                    <div>
                        <h3 className="text-lg font-serif font-bold text-[#212842]">
                            Book Clinical Consultation
                        </h3>
                        <p className="text-[11px] text-[#212842]/70">
                            Schedule an appointment with a verified clinician.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#212842]/60 hover:text-[#212842] font-bold text-lg p-1 hover:bg-[#F0E7D5] rounded transition cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Feedback Alerts */}
                {errorMessage && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-800 text-xs rounded-sm">
                        <strong>Error: </strong> {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="p-3 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold rounded-sm flex items-center space-x-2">
                        <span>✓</span>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    
                    {/* Doctor Selection */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider mb-1">
                            Attending Doctor <span className="text-red-600">*</span>
                        </label>
                        {doctor ? (
                            <div className="p-3 bg-[#F0E7D5] border border-[#212842]/20 rounded-sm font-semibold">
                                <div className="text-sm font-bold text-[#212842]">
                                    {doctor.userId?.name || "Doctor"}
                                </div>
                                <div className="text-[11px] text-[#212842]/70">
                                    {doctor.specialization} • {doctor.hospital} (Fee: ₹{doctor.consultationFee})
                                </div>
                            </div>
                        ) : (
                            <select
                                value={selectedDoctor?._id || ""}
                                onChange={handleDoctorChange}
                                className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-semibold focus:outline-none focus:border-[#212842]"
                                required
                            >
                                <option value="" disabled>Select Verified Doctor...</option>
                                {verifiedDoctors.map((doc) => (
                                    <option key={doc._id} value={doc._id}>
                                        {doc.userId?.name} ({doc.specialization} - {doc.hospital})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Date picker */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider mb-1">
                            Appointment Date <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="date"
                            min={todayStr}
                            value={form.appointmentDate}
                            onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                            className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono focus:outline-none focus:border-[#212842]"
                            required
                        />
                    </div>

                    {/* Start & End Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold uppercase tracking-wider mb-1">
                                Start Time (24h) <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono focus:outline-none focus:border-[#212842]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold uppercase tracking-wider mb-1">
                                End Time (24h) <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-mono focus:outline-none focus:border-[#212842]"
                                required
                            />
                        </div>
                    </div>

                    {/* Consultation Mode */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider mb-1">
                            Consultation Mode <span className="text-red-600">*</span>
                        </label>
                        <select
                            value={form.consultationMode}
                            onChange={(e) => setForm({ ...form, consultationMode: e.target.value })}
                            className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] font-semibold focus:outline-none focus:border-[#212842]"
                        >
                            {(selectedDoctor?.consultationMode === "BOTH" || selectedDoctor?.consultationMode === "ONLINE") && (
                                <option value="ONLINE">ONLINE (Teleconsultation)</option>
                            )}
                            {(selectedDoctor?.consultationMode === "BOTH" || selectedDoctor?.consultationMode === "IN_PERSON") && (
                                <option value="IN_PERSON">IN_PERSON (Hospital Visit)</option>
                            )}
                        </select>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block font-bold uppercase tracking-wider mb-1">
                            Reason for Visit <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Describe symptoms or reason for appointment..."
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                            required
                        ></textarea>
                    </div>

                    {/* Submit Actions */}
                    <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="py-2 px-4 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="py-2 px-5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold rounded-sm transition cursor-pointer flex items-center space-x-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-[#F0E7D5] border-t-transparent animate-spin rounded-full"></div>
                                    <span>Scheduling...</span>
                                </>
                            ) : (
                                <span>Confirm Appointment</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookAppointmentModal;
