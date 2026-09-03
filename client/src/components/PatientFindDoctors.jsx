import React, { useEffect, useState } from "react";
import { getVerifiedDoctors } from "../services/api";
import DoctorProfileModal from "./DoctorProfileModal";
import BookAppointmentModal from "./BookAppointmentModal";

const PatientFindDoctors = () => {
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSpecialization, setSelectedSpecialization] = useState("");
    const [selectedMode, setSelectedMode] = useState("");

    // Modals
    const [profileDoctor, setProfileDoctor] = useState(null);
    const [bookingDoctor, setBookingDoctor] = useState(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [bookingSuccessNotice, setBookingSuccessNotice] = useState("");

    const fetchDoctors = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const res = await getVerifiedDoctors();
            if (res.success) {
                setDoctors(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching verified doctors:", err);
            setErrorMessage(err.message || "Failed to load verified doctors list.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    // Unique specializations for filter dropdown
    const specializations = Array.from(
        new Set(doctors.map((d) => d.specialization).filter(Boolean))
    );

    // Filter doctors list
    const filteredDoctors = doctors.filter((doc) => {
        const docName = doc.userId?.name || "";
        const docHospital = doc.hospital || "";
        const docSpec = doc.specialization || "";

        const matchesSearch =
            docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            docHospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
            docSpec.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSpec = selectedSpecialization
            ? docSpec.toLowerCase() === selectedSpecialization.toLowerCase()
            : true;

        const matchesMode = selectedMode
            ? doc.consultationMode === "BOTH" || doc.consultationMode === selectedMode
            : true;

        return matchesSearch && matchesSpec && matchesMode;
    });

    const handleOpenBooking = (doctor) => {
        setBookingDoctor(doctor);
        setIsBookingOpen(true);
    };

    const handleBookingSuccess = () => {
        setBookingSuccessNotice("Appointment booked successfully! Check 'My Appointments' to track status.");
        setTimeout(() => setBookingSuccessNotice(""), 5000);
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-[#212842]">Find Verified Doctors</h2>
                    <p className="text-xs text-[#212842]/70 mt-1 max-w-xl">
                        Search and book clinical consultations with verified medical specialists on the AmedicK system.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-[#212842] text-[#F0E7D5] text-xs font-mono font-bold rounded-sm">
                        {filteredDoctors.length} VERIFIED CLINICIANS
                    </span>
                </div>
            </div>

            {/* Success Toast */}
            {bookingSuccessNotice && (
                <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold rounded-sm flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2">
                        <span className="text-base">✓</span>
                        <span>{bookingSuccessNotice}</span>
                    </div>
                    <button onClick={() => setBookingSuccessNotice("")} className="text-xs font-bold">✕</button>
                </div>
            )}

            {/* Filter controls */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-4 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                    <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">Search Doctor or Hospital</label>
                    <input
                        type="text"
                        placeholder="Search by name, hospital, specialization..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                    />
                </div>

                <div>
                    <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">Filter Specialization</label>
                    <select
                        value={selectedSpecialization}
                        onChange={(e) => setSelectedSpecialization(e.target.value)}
                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                    >
                        <option value="">All Specializations</option>
                        {specializations.map((spec, i) => (
                            <option key={i} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block font-bold text-[#212842] uppercase tracking-wider mb-1">Consultation Mode</label>
                    <select
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                        className="w-full p-2.5 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] focus:outline-none focus:border-[#212842]"
                    >
                        <option value="">All Modes (Online & In-Person)</option>
                        <option value="ONLINE">ONLINE (Teleconsultation)</option>
                        <option value="IN_PERSON">IN_PERSON (Hospital Visit)</option>
                    </select>
                </div>
            </div>

            {/* LOADING STATE */}
            {isLoading && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span className="text-xs font-bold text-[#212842] uppercase tracking-wider">
                        Fetching Verified Doctors...
                    </span>
                </div>
            )}

            {/* ERROR STATE */}
            {!isLoading && errorMessage && (
                <div className="bg-red-50 border border-red-300 p-6 rounded-md text-red-900 flex flex-col items-center justify-center space-y-3">
                    <p className="text-xs font-bold">Error loading doctors: {errorMessage}</p>
                    <button
                        onClick={fetchDoctors}
                        className="py-1.5 px-4 bg-red-900 text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && !errorMessage && filteredDoctors.length === 0 && (
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-12 rounded-md flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F0E7D5] border border-[#212842]/30 flex items-center justify-center font-serif text-xl font-bold text-[#212842]">
                        👨‍⚕️
                    </div>
                    <h3 className="text-base font-bold font-serif text-[#212842]">No Verified Doctors Found</h3>
                    <p className="text-xs text-[#212842]/70 max-w-sm">
                        {doctors.length === 0
                            ? "There are currently no verified doctors in the system. Check back later once admin verifies clinician applications."
                            : "No doctors match your current search filters. Try adjusting your search term or specialization filters."}
                    </p>
                    {doctors.length > 0 && (
                        <button
                            onClick={() => { setSearchTerm(""); setSelectedSpecialization(""); setSelectedMode(""); }}
                            className="py-1.5 px-3.5 bg-[#212842] text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            )}

            {/* SUCCESS STATE - DOCTORS GRID */}
            {!isLoading && !errorMessage && filteredDoctors.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDoctors.map((doc) => {
                        const docUser = doc.userId || {};
                        return (
                            <div
                                key={doc._id}
                                className="bg-[#FAF6EE] border border-[#212842]/15 hover:border-[#212842] rounded-md p-5 flex flex-col justify-between space-y-4 transition shadow-sm"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-[#212842] text-[#F0E7D5] flex items-center justify-center font-bold text-sm">
                                                {docUser.name ? docUser.name.charAt(0).toUpperCase() : "D"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-[#212842] leading-tight">
                                                    {docUser.name || "Dr. Clinician"}
                                                </h3>
                                                <span className="text-[11px] font-semibold text-[#212842]/70">
                                                    {doc.specialization}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#212842] text-[#F0E7D5] rounded-sm">
                                            VERIFIED
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-[#212842]/80 border-t border-b border-[#212842]/10 py-2.5">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#212842]/60">Qualification:</span>
                                            <span className="font-bold text-[#212842]">{doc.qualification}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#212842]/60">Hospital / Clinic:</span>
                                            <span className="font-bold text-[#212842]">{doc.hospital}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#212842]/60">Experience:</span>
                                            <span className="font-bold text-[#212842]">{doc.experience} Years</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#212842]/60">Consultation Fee:</span>
                                            <span className="font-bold text-[#212842]">₹{doc.consultationFee}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-[#212842]/60">Mode:</span>
                                            <span className="font-mono font-bold text-[#212842]">
                                                {doc.consultationMode}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 pt-2">
                                    <button
                                        onClick={() => setProfileDoctor(doc)}
                                        className="flex-1 py-2 px-3 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer text-center"
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        onClick={() => handleOpenBooking(doc)}
                                        className="flex-1 py-2 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] font-bold text-xs rounded-sm border border-[#212842] transition cursor-pointer text-center"
                                    >
                                        Book Consultation
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Doctor Profile Modal */}
            {profileDoctor && (
                <DoctorProfileModal
                    doctor={profileDoctor}
                    onClose={() => setProfileDoctor(null)}
                    onBookAppointment={(doc) => handleOpenBooking(doc)}
                />
            )}

            {/* Book Appointment Modal */}
            {isBookingOpen && (
                <BookAppointmentModal
                    doctor={bookingDoctor}
                    verifiedDoctors={doctors}
                    onClose={() => {
                        setIsBookingOpen(false);
                        setBookingDoctor(null);
                    }}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </div>
    );
};

export default PatientFindDoctors;
