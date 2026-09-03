import React from "react";

const DoctorProfileModal = ({ doctor, onClose, onBookAppointment }) => {
    if (!doctor) return null;

    const doctorUser = doctor.userId || {};

    return (
        <div className="fixed inset-0 bg-[#212842]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#FAF6EE] border border-[#212842] rounded-md max-w-xl w-full p-6 shadow-2xl space-y-6 text-[#212842] max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#212842]/15 pb-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full bg-[#212842] text-[#F0E7D5] flex items-center justify-center font-bold text-xl border border-[#212842]">
                            {doctorUser.name ? doctorUser.name.charAt(0).toUpperCase() : "D"}
                        </div>
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#212842]">
                                {doctorUser.name || "Doctor Profile"}
                            </h3>
                            <p className="text-xs font-semibold text-[#212842]/70 uppercase tracking-wider">
                                {doctor.specialization} • {doctor.qualification}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-[#212842] text-[#F0E7D5] rounded-sm">
                                VERIFIED CLINICIAN
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#212842]/60 hover:text-[#212842] font-bold text-lg p-1 hover:bg-[#F0E7D5] rounded transition cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Associated Hospital / Clinic</span>
                        <span className="font-bold text-sm text-[#212842] block mt-0.5">{doctor.hospital}</span>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Medical Registration Number</span>
                        <span className="font-mono font-bold text-xs text-[#212842] block mt-0.5">{doctor.registrationNumber}</span>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Years of Experience</span>
                        <span className="font-bold text-sm text-[#212842] block mt-0.5">{doctor.experience} Years</span>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Consultation Fee</span>
                        <span className="font-bold text-sm text-[#212842] block mt-0.5">₹{doctor.consultationFee}</span>
                    </div>

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm sm:col-span-2">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Consultation Mode Options</span>
                        <span className="font-bold text-xs text-[#212842] block mt-0.5 uppercase tracking-wide">
                            {doctor.consultationMode === "BOTH" ? "Online & In-Person Available" : doctor.consultationMode}
                        </span>
                    </div>

                    {doctor.languages && doctor.languages.length > 0 && (
                        <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm sm:col-span-2">
                            <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Languages Spoken</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {doctor.languages.map((lang, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-[#FAF6EE] border border-[#212842]/30 text-[11px] font-semibold text-[#212842] rounded-sm">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-[#F0E7D5] border border-[#212842]/15 rounded-sm sm:col-span-2">
                        <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Direct Contact Information</span>
                        <div className="mt-1 space-y-1 font-mono text-[11px]">
                            <div>Email: {doctorUser.email || "N/A"}</div>
                            <div>Phone: {doctorUser.phone || "N/A"}</div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 px-4 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer"
                    >
                        Close Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onBookAppointment(doctor);
                        }}
                        className="py-2.5 px-5 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer shadow-sm"
                    >
                        Book Appointment Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DoctorProfileModal;
