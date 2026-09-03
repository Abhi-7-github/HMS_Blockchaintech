import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getAdminDoctorById,
    getAdminDoctorCertificate,
    approveAdminDoctor,
    rejectAdminDoctor,
    getCurrentUser,
    logout,
} from "../services/api";

const AdminDoctorVerification = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [doctorData, setDoctorData] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [actionSuccessMessage, setActionSuccessMessage] = useState("");

    // Rejection Modal State
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState("");
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);
    const [modalError, setModalError] = useState("");

    const fetchDoctorDetails = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const res = await getAdminDoctorById(id);
            if (res.data) {
                setDoctorData(res.data.doctor);
                setCertificates(res.data.certificates || []);
            }
        } catch (err) {
            console.error("Failed to load doctor verification details:", err.message);
            setErrorMessage(err.message || "Failed to load doctor profile details.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const me = await getCurrentUser();
                setUser(me?.user || null);
            } catch (e) {
                console.error("Failed to fetch admin user:", e.message);
            }
            fetchDoctorDetails();
        };

        init();
    }, [id]);

    const handleViewCertificate = async (certificateId) => {
        try {
            const res = await getAdminDoctorCertificate(id, certificateId);
            const signedUrl = res.data?.signedUrl;
            if (signedUrl) {
                window.open(signedUrl, "_blank", "noopener,noreferrer");
            } else {
                alert("Could not retrieve certificate preview link.");
            }
        } catch (err) {
            console.error("Failed to open certificate:", err.message);
            alert(`Error loading certificate preview: ${err.message}`);
        }
    };

    const handleApproveDoctor = async () => {
        if (!window.confirm(`Are you sure you want to APPROVE Dr. ${doctorData?.name}?`)) {
            return;
        }

        setIsSubmittingAction(true);
        setErrorMessage("");
        setActionSuccessMessage("");

        try {
            const res = await approveAdminDoctor(id);
            setActionSuccessMessage(res.message || "Doctor profile approved successfully!");
            fetchDoctorDetails();
        } catch (err) {
            console.error("Failed to approve doctor:", err.message);
            setErrorMessage(err.message || "Failed to approve doctor.");
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleOpenRejectionModal = () => {
        setRejectionReasonInput("");
        setModalError("");
        setIsRejectionModalOpen(true);
    };

    const handleConfirmRejection = async (e) => {
        e.preventDefault();
        if (!rejectionReasonInput.trim()) {
            setModalError("Please provide a rejection reason.");
            return;
        }

        setIsSubmittingAction(true);
        setModalError("");
        setErrorMessage("");
        setActionSuccessMessage("");

        try {
            const res = await rejectAdminDoctor(id, rejectionReasonInput.trim());
            setActionSuccessMessage(res.message || "Doctor profile verification rejected.");
            setIsRejectionModalOpen(false);
            fetchDoctorDetails();
        } catch (err) {
            console.error("Failed to reject doctor:", err.message);
            setModalError(err.message || "Failed to reject doctor profile.");
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex items-center justify-center">
                <div className="flex items-center space-x-3 text-xs font-bold uppercase tracking-wider">
                    <div className="w-5 h-5 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Loading Doctor Verification File...</span>
                </div>
            </div>
        );
    }

    if (errorMessage && !doctorData) {
        return (
            <div className="min-h-screen bg-[#F0E7D5] text-[#212842] p-8 max-w-3xl mx-auto space-y-4">
                <button
                    onClick={() => navigate("/admin/doctors")}
                    className="py-2 px-4 bg-[#212842] text-[#F0E7D5] text-xs font-bold rounded-sm cursor-pointer"
                >
                    ← Back to Doctors List
                </button>
                <div className="p-6 bg-[#FAF6EE] border border-[#212842] rounded-md space-y-2">
                    <h2 className="text-lg font-serif font-bold">Error Loading Doctor File</h2>
                    <p className="text-xs text-[#212842]/80">{errorMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0E7D5] text-[#212842] flex flex-col font-sans">
            {/* Header / Navigation Bar */}
            <header className="bg-[#212842] text-[#F0E7D5] border-b border-[#F0E7D5]/15 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo.jpg"
                            alt="AmedicK Official Logo"
                            className="w-10 h-10 object-cover border border-[#F0E7D5]/40 rounded-sm bg-[#FAF6EE]"
                        />
                        <div>
                            <span className="text-lg font-bold tracking-tight text-[#F0E7D5] block uppercase leading-none">
                                AmedicK
                            </span>
                            <span className="text-[8px] text-[#F0E7D5]/80 tracking-wider uppercase block mt-0.5">
                                CARE ROOTED IN COMPASSION
                            </span>
                        </div>

                        <div className="hidden md:flex items-center ml-6 pl-6 border-l border-[#F0E7D5]/20">
                            <span className="text-xs uppercase font-mono px-2.5 py-1 border border-[#F0E7D5]/30 text-[#F0E7D5] rounded-sm">
                                CREDENTIAL AUDIT DESK
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right hidden sm:block">
                            <span className="block text-xs font-bold text-[#F0E7D5] uppercase tracking-wider">
                                {user?.name || "System Administrator"}
                            </span>
                            <span className="block text-[11px] text-[#F0E7D5]/70">{user?.email}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="py-1.5 px-3.5 bg-[#F0E7D5] hover:bg-[#E2D7C2] text-[#212842] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumb Bar */}
            <div className="bg-[#FAF6EE] border-b border-[#212842]/15 px-4 sm:px-6 lg:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                        <button
                            onClick={() => navigate("/admin/doctors")}
                            className="font-bold text-[#212842]/70 hover:text-[#212842]"
                        >
                            ← Back to Doctors List
                        </button>
                        <span className="text-[#212842]/40">/</span>
                        <span className="font-bold text-[#212842] font-mono">
                            Verification: {doctorData?.registrationNumber}
                        </span>
                    </div>

                    <span
                        className={`px-3 py-1 text-xs font-mono font-bold uppercase border rounded-sm ${
                            doctorData?.verificationStatus === "VERIFIED"
                                ? "bg-[#212842] text-[#F0E7D5] border-[#212842]"
                                : doctorData?.verificationStatus === "REJECTED"
                                ? "bg-[#FAF6EE] text-[#212842] border-[#212842] line-through"
                                : "bg-[#F0E7D5] text-[#212842] border-[#212842]"
                        }`}
                    >
                        STATUS: {doctorData?.verificationStatus}
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                {/* ACTION SUCCESS BANNER */}
                {actionSuccessMessage && (
                    <div className="p-4 bg-[#FAF6EE] border-2 border-[#212842] rounded-md text-xs font-bold text-[#212842] flex items-center justify-between">
                        <span>✓ {actionSuccessMessage}</span>
                        <button onClick={() => setActionSuccessMessage("")} className="text-xs uppercase font-mono">
                            Dismiss
                        </button>
                    </div>
                )}

                {/* ERROR BANNER */}
                {errorMessage && (
                    <div className="p-4 bg-[#FAF6EE] border-2 border-[#212842] rounded-md text-xs text-[#212842] flex items-center justify-between">
                        <div>
                            <span className="font-bold uppercase tracking-wider block">Action Error</span>
                            <span>{errorMessage}</span>
                        </div>
                        <button onClick={() => setErrorMessage("")} className="text-xs uppercase font-mono">
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Profile Overview Banner */}
                <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#212842]">
                                {doctorData?.name}
                            </h1>
                            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border border-[#212842] text-[#212842] bg-[#F0E7D5] rounded-sm">
                                {doctorData?.specialization}
                            </span>
                        </div>
                        <p className="text-xs text-[#212842]/70 mt-1">
                            Medical Registration No: <strong className="font-mono">{doctorData?.registrationNumber}</strong> | Hospital: <strong>{doctorData?.hospital}</strong>
                        </p>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleApproveDoctor}
                            disabled={isSubmittingAction || doctorData?.verificationStatus === "VERIFIED" || certificates.length === 0}
                            className="py-2.5 px-5 bg-[#212842] hover:bg-[#181E32] disabled:opacity-50 text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                        >
                            {isSubmittingAction ? "Processing..." : "✓ Approve Doctor"}
                        </button>

                        <button
                            onClick={handleOpenRejectionModal}
                            disabled={isSubmittingAction}
                            className="py-2.5 px-5 bg-[#FAF6EE] hover:bg-[#F0E7D5] text-[#212842] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer"
                        >
                            ✕ Reject Doctor
                        </button>
                    </div>
                </div>

                {/* Clinical & Personal Info Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Practitioner Information */}
                    <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                        <h3 className="text-lg font-serif font-bold text-[#212842] border-b border-[#212842]/15 pb-3">
                            Doctor Identity & Contact
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Full Name</span>
                                <span className="font-bold text-sm text-[#212842]">{doctorData?.name}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Email Address</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">{doctorData?.email}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Phone Contact</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">{doctorData?.phone}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Profile Created</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">
                                    {new Date(doctorData?.submittedDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Professional Qualifications */}
                    <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                        <h3 className="text-lg font-serif font-bold text-[#212842] border-b border-[#212842]/15 pb-3">
                            Professional Credentials
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Specialization</span>
                                <span className="font-bold text-sm text-[#212842]">{doctorData?.specialization}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Qualifications</span>
                                <span className="font-bold text-xs text-[#212842]">{doctorData?.qualification}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Registration Number</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">{doctorData?.registrationNumber}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Clinical Experience</span>
                                <span className="font-bold text-xs text-[#212842]">{doctorData?.experience} Years</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Primary Hospital</span>
                                <span className="font-bold text-xs text-[#212842]">{doctorData?.hospital}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Consultation Fee</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">${doctorData?.consultationFee}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Consultation Mode</span>
                                <span className="font-mono font-bold text-xs text-[#212842]">{doctorData?.consultationMode}</span>
                            </div>

                            <div className="p-3 border border-[#212842]/15 bg-[#F0E7D5]">
                                <span className="block text-[10px] font-bold uppercase text-[#212842]/70">Spoken Languages</span>
                                <span className="font-bold text-xs text-[#212842]">
                                    {Array.isArray(doctorData?.languages) ? doctorData?.languages.join(", ") : doctorData?.languages}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Certificate Documents Section */}
                <div className="bg-[#FAF6EE] border border-[#212842]/15 rounded-md p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                        <div>
                            <h3 className="text-lg font-serif font-bold text-[#212842]">
                                Submitted Verification Certificates ({certificates.length})
                            </h3>
                            <p className="text-xs text-[#212842]/70">
                                Click "View Document" to open a secure temporary CDN link to audit credentials.
                            </p>
                        </div>

                        {certificates.length === 0 && (
                            <span className="text-xs font-mono font-bold text-[#212842] border border-[#212842] px-3 py-1 bg-[#F0E7D5] rounded-sm">
                                ⚠️ NO CERTIFICATES SUBMITTED
                            </span>
                        )}
                    </div>

                    {certificates.length === 0 ? (
                        <div className="p-8 text-center bg-[#F0E7D5] border border-[#212842]/15 rounded-sm space-y-2">
                            <span className="text-sm font-bold text-[#212842] block">No Verification Certificates Uploaded</span>
                            <p className="text-xs text-[#212842]/70 max-w-md mx-auto">
                                This doctor has created a clinical profile but has not uploaded required registration or degree certificates yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-[#212842]">
                                <thead>
                                    <tr className="bg-[#212842] text-[#F0E7D5] font-bold uppercase text-[10px] tracking-wider border-b border-[#212842]">
                                        <th className="py-3 px-4">Certificate Name</th>
                                        <th className="py-3 px-4">Certificate Type</th>
                                        <th className="py-3 px-4">Upload Date</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Document Access</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#212842]/10">
                                    {certificates.map((cert) => (
                                        <tr key={cert.id} className="hover:bg-[#F0E7D5]/70 transition">
                                            <td className="py-3.5 px-4 font-bold">{cert.originalFileName}</td>
                                            <td className="py-3.5 px-4 font-mono font-semibold text-[11px]">
                                                {cert.certificateType}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-[11px]">
                                                {new Date(cert.uploadDate || cert.uploadedAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="px-2 py-0.5 text-[10px] font-mono font-bold border border-[#212842] bg-[#F0E7D5] rounded-sm">
                                                    {cert.verificationStatus}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => handleViewCertificate(cert.id)}
                                                    className="py-1.5 px-3 bg-[#212842] hover:bg-[#181E32] text-[#F0E7D5] text-[10px] font-bold uppercase rounded-sm cursor-pointer border border-[#212842]"
                                                >
                                                    View Document ↗
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* REJECTION MODAL */}
            {isRejectionModalOpen && (
                <div className="fixed inset-0 bg-[#212842]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-[#FAF6EE] border-2 border-[#212842] rounded-md max-w-md w-full p-6 space-y-4 text-[#212842]">
                        <div className="flex items-center justify-between border-b border-[#212842]/15 pb-3">
                            <h3 className="text-lg font-serif font-bold text-[#212842]">
                                Reject Verification: {doctorData?.name}
                            </h3>
                            <button onClick={() => setIsRejectionModalOpen(false)} className="text-xs font-bold cursor-pointer">
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 bg-[#F0E7D5] border border-[#212842] text-xs font-bold text-[#212842]">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmRejection} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold uppercase tracking-wider mb-1">
                                    Mandatory Rejection Reason <span className="text-[#212842]">*</span>
                                </label>
                                <textarea
                                    rows="4"
                                    required
                                    placeholder="Enter the official reason for rejecting this doctor's verification (e.g. Invalid medical registration number, expired license, illegible certificate scan)..."
                                    value={rejectionReasonInput}
                                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                                    className="w-full p-3 bg-[#F0E7D5] border border-[#212842]/30 rounded-sm text-[#212842] placeholder-[#212842]/50 focus:outline-none focus:border-[#212842]"
                                ></textarea>
                            </div>

                            <div className="pt-3 border-t border-[#212842]/15 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsRejectionModalOpen(false)}
                                    className="py-2 px-4 bg-[#F0E7D5] border border-[#212842] text-[#212842] font-bold rounded-sm hover:bg-[#E2D7C2] cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSubmittingAction}
                                    className="py-2 px-4 bg-[#212842] text-[#F0E7D5] font-bold rounded-sm hover:bg-[#181E32] cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingAction ? "Submitting..." : "Confirm Rejection"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDoctorVerification;
