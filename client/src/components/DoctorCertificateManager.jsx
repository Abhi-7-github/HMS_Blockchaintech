import React, { useEffect, useState } from "react";
import {
    getDoctorVerificationStatus,
    uploadDoctorCertificate,
    deleteDoctorCertificate,
} from "../services/api";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const DoctorCertificateManager = () => {
    const [verificationStatus, setVerificationStatus] = useState("PENDING");
    const [rejectionReason, setRejectionReason] = useState("");
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [certificateType, setCertificateType] = useState("MEDICAL_REGISTRATION");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileValidationMessage, setFileValidationMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
    const [uploadErrorMessage, setUploadErrorMessage] = useState("");
    const [deletingCertId, setDeletingCertId] = useState(null);

    const fetchVerificationDetails = async () => {
        setIsLoading(true);
        try {
            const res = await getDoctorVerificationStatus();
            if (res) {
                setVerificationStatus(res.status || "PENDING");
                setRejectionReason(res.rejectionReason || "");
                setCertificates(res.certificates || []);
            }
        } catch (err) {
            console.error("Failed to fetch doctor verification status:", err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVerificationDetails();
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setUploadSuccessMessage("");
        setUploadErrorMessage("");
        setFileValidationMessage("");

        if (!file) {
            setSelectedFile(null);
            return;
        }

        const ext = `.${file.name.split(".").pop().toLowerCase()}`;
        const isTypeValid = ALLOWED_TYPES.includes(file.type.toLowerCase()) || ALLOWED_EXTENSIONS.includes(ext);

        if (!isTypeValid) {
            setFileValidationMessage("Invalid file format. Only PDF, JPG, JPEG, and PNG files are accepted.");
            setSelectedFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
            setFileValidationMessage(`File size (${fileSizeMb} MB) exceeds the 5.0 MB maximum size limit.`);
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadErrorMessage("Please select a valid certificate file to upload.");
            return;
        }

        setIsUploading(true);
        setUploadSuccessMessage("");
        setUploadErrorMessage("");

        try {
            const formData = new FormData();
            formData.append("certificateType", certificateType);
            formData.append("certificate", selectedFile);

            const res = await uploadDoctorCertificate(formData);

            setUploadSuccessMessage(res.message || "Certificate uploaded successfully!");
            setSelectedFile(null);
            // Reset file input element
            const inputEl = document.getElementById("doctor-certificate-file-input");
            if (inputEl) inputEl.value = "";

            // Refresh verification status & certificates list
            await fetchVerificationDetails();
        } catch (err) {
            console.error("Certificate upload error:", err.message);
            setUploadErrorMessage(err.message || "Failed to upload certificate. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteCertificate = async (certId) => {
        if (!window.confirm("Are you sure you want to remove this certificate document?")) {
            return;
        }

        setDeletingCertId(certId);
        setUploadSuccessMessage("");
        setUploadErrorMessage("");

        try {
            const res = await deleteDoctorCertificate(certId);
            setUploadSuccessMessage(res.message || "Certificate deleted successfully.");
            await fetchVerificationDetails();
        } catch (err) {
            console.error("Failed to delete certificate:", err.message);
            setUploadErrorMessage(err.message || "Failed to delete certificate.");
        } finally {
            setDeletingCertId(null);
        }
    };

    const isVerifiedOrApproved = verificationStatus === "APPROVED" || verificationStatus === "VERIFIED";

    const renderStatusBadge = () => {
        if (isVerifiedOrApproved) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mr-2 animate-pulse"></span>
                    APPROVED / VERIFIED
                </span>
            );
        }
        if (verificationStatus === "REJECTED") {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-600 mr-2"></span>
                    REJECTED
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-600 mr-2 animate-spin"></span>
                PENDING VERIFICATION
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md text-center">
                <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#212842]">
                    <div className="w-4 h-4 border-2 border-[#212842] border-t-transparent animate-spin rounded-full"></div>
                    <span>Loading certificate verification records...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Status Card */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-serif font-bold text-[#212842] flex items-center space-x-2">
                        <span>📜 Doctor Certificate Verification</span>
                    </h2>
                    <p className="text-xs text-[#212842]/70 mt-1 max-w-2xl">
                        Upload official medical registration, degree, or specialization certificates to complete administrative practitioner verification.
                    </p>
                </div>
                <div>{renderStatusBadge()}</div>
            </div>

            {/* Rejection Alert Box */}
            {verificationStatus === "REJECTED" && (
                <div className="bg-rose-50 border border-rose-300 p-5 rounded-md text-rose-900">
                    <div className="flex items-start space-x-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider">
                                Certificate Verification Rejected
                            </h3>
                            <p className="text-xs mt-1 leading-relaxed">
                                <strong>Reason for rejection:</strong>{" "}
                                {rejectionReason || "Credentials require re-examination by administration."}
                            </p>
                            <p className="text-xs mt-2 font-medium underline">
                                Please upload a revised or legible certificate below to automatically resubmit your profile for verification (Status will reset to PENDING).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Approved Notice */}
            {isVerifiedOrApproved && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-md text-emerald-900 flex items-center space-x-3">
                    <span className="text-xl">✅</span>
                    <p className="text-xs font-medium">
                        Your medical practitioner credentials have been officially verified by hospital administration. Verified status allows active patient consultation scheduling.
                    </p>
                </div>
            )}

            {/* Certificate Upload Form */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#212842] mb-4 pb-2 border-b border-[#212842]/10">
                    Upload Qualification Certificate
                </h3>

                {uploadSuccessMessage && (
                    <div className="mb-4 p-3 bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs rounded-sm font-medium">
                        {uploadSuccessMessage}
                    </div>
                )}

                {uploadErrorMessage && (
                    <div className="mb-4 p-3 bg-rose-100 border border-rose-400 text-rose-900 text-xs rounded-sm font-medium">
                        {uploadErrorMessage}
                    </div>
                )}

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Certificate Type Selection */}
                        <div>
                            <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                Certificate Category <span className="text-rose-600">*</span>
                            </label>
                            <select
                                value={certificateType}
                                onChange={(e) => setCertificateType(e.target.value)}
                                className="w-full bg-[#FAF6EE] border border-[#212842]/30 text-[#212842] text-xs py-2 px-3 rounded-sm focus:outline-none focus:border-[#212842]"
                            >
                                <option value="MEDICAL_REGISTRATION">Medical Council Registration</option>
                                <option value="DEGREE">MBBS / MD / Degree Certificate</option>
                                <option value="SPECIALIZATION">Specialization Diploma / Certification</option>
                                <option value="IDENTITY">Government Medical ID Proof</option>
                                <option value="OTHER">Other Professional Qualification</option>
                            </select>
                        </div>

                        {/* File Input */}
                        <div>
                            <label className="block text-xs font-bold text-[#212842] uppercase tracking-wider mb-1">
                                Select Document File <span className="text-rose-600">*</span>
                            </label>
                            <input
                                id="doctor-certificate-file-input"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                onChange={handleFileSelect}
                                className="w-full bg-[#FAF6EE] border border-[#212842]/30 text-[#212842] text-xs py-1.5 px-3 rounded-sm file:mr-3 file:py-1 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-[#212842] file:text-[#F0E7D5] cursor-pointer"
                            />
                            <p className="text-[10px] text-[#212842]/60 mt-1">
                                Accepted formats: <strong>PDF, JPG, JPEG, PNG</strong> (Max size: <strong>5 MB</strong>)
                            </p>
                        </div>
                    </div>

                    {/* File Validation Warning */}
                    {fileValidationMessage && (
                        <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-sm font-medium">
                            ⚠️ {fileValidationMessage}
                        </div>
                    )}

                    {/* Selected File Details Box */}
                    {selectedFile && (
                        <div className="p-3 bg-[#212842]/5 border border-[#212842]/20 rounded-sm flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3">
                                <span className="text-xl">
                                    {selectedFile.type.includes("pdf") ? "📄" : "🖼️"}
                                </span>
                                <div>
                                    <span className="font-bold block text-[#212842]">
                                        {selectedFile.name}
                                    </span>
                                    <span className="text-[10px] text-[#212842]/70 font-mono">
                                        {(selectedFile.size / 1024).toFixed(1)} KB | {selectedFile.type || "Unknown Format"}
                                    </span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded-sm uppercase">
                                Valid File
                            </span>
                        </div>
                    )}

                    {/* Upload Action Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!selectedFile || isUploading}
                            className="py-2.5 px-6 bg-[#212842] hover:bg-[#181E32] disabled:opacity-50 disabled:cursor-not-allowed text-[#F0E7D5] text-xs font-bold rounded-sm border border-[#212842] transition cursor-pointer flex items-center space-x-2"
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-[#F0E7D5] border-t-transparent animate-spin rounded-full"></div>
                                    <span>Uploading to Cloudinary...</span>
                                </>
                            ) : (
                                <>
                                    <span>📤</span>
                                    <span>Upload Certificate Document</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* List of Submitted Certificates */}
            <div className="bg-[#FAF6EE] border border-[#212842]/15 p-6 rounded-md">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#212842] mb-4 pb-2 border-b border-[#212842]/10 flex items-center justify-between">
                    <span>Submitted Verification Documents ({certificates.length})</span>
                </h3>

                {certificates.length === 0 ? (
                    <p className="text-xs text-[#212842]/60 italic py-4 text-center border border-dashed border-[#212842]/20 rounded-sm">
                        No qualification certificates submitted yet. Please upload your medical registration certificate above.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-[#212842]/20 text-[#212842]/70 uppercase tracking-wider text-[10px]">
                                    <th className="py-2.5 px-3">Type</th>
                                    <th className="py-2.5 px-3">File Name</th>
                                    <th className="py-2.5 px-3">Upload Date</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#212842]/10">
                                {certificates.map((cert) => (
                                    <tr key={cert._id || cert.id} className="hover:bg-[#212842]/5 transition">
                                        <td className="py-3 px-3 font-bold text-[#212842]">
                                            {cert.certificateType}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[#212842]">
                                            {cert.originalFileName}
                                        </td>
                                        <td className="py-3 px-3 text-[#212842]/80">
                                            {new Date(cert.uploadedAt || cert.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                                                    cert.verificationStatus === "APPROVED" || cert.verificationStatus === "VERIFIED"
                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                        : cert.verificationStatus === "REJECTED"
                                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                        : "bg-amber-100 text-amber-800 border border-amber-300"
                                                }`}
                                            >
                                                {cert.verificationStatus}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right space-x-2">
                                            {cert.secureUrl && (
                                                <a
                                                    href={cert.secureUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block py-1 px-2.5 bg-[#212842] text-[#F0E7D5] hover:bg-[#181E32] text-[10px] font-bold rounded-sm border border-[#212842] transition"
                                                >
                                                    View
                                                </a>
                                            )}

                                            {!isVerifiedOrApproved && (
                                                <button
                                                    onClick={() => handleDeleteCertificate(cert._id || cert.id)}
                                                    disabled={deletingCertId === (cert._id || cert.id)}
                                                    className="py-1 px-2.5 bg-rose-700 text-white hover:bg-rose-800 text-[10px] font-bold rounded-sm border border-rose-700 transition cursor-pointer"
                                                >
                                                    {deletingCertId === (cert._id || cert.id) ? "Deleting..." : "Delete"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorCertificateManager;
