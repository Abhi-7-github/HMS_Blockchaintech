const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const express = require("express");
const http = require("http");
const connectDB = require("./config/db");
const User = require("./models/User");
const Doctor = require("./models/Doctor");
const DoctorCertificate = require("./models/DoctorCertificate");

const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/admin", adminRoutes);

async function runPhase5TestSuite() {
    console.log("==================================================");
    console.log("   RUNNING PHASE 5 DOCTOR VERIFICATION TEST SUITE");
    console.log("==================================================");

    await connectDB();

    // Start ephemeral server
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`✓ Test HTTP server listening on ${baseUrl}`);

    const timestamp = Date.now();
    const docEmail = `testdoc_${timestamp}@hms.com`;
    const adminEmail = `testadmin_${timestamp}@hms.com`;

    let docUser, adminUser, doctorProfile, docToken, adminToken;

    try {
        // 1. Create Test Users & Doctor Profile in DB
        docUser = await User.create({
            name: "Dr. Phase5 Tester",
            email: docEmail,
            phone: "+19998887777",
            password: "password123",
            role: "DOCTOR",
            isVerified: true,
        });

        adminUser = await User.create({
            name: "Admin Phase5 Evaluator",
            email: adminEmail,
            phone: "+18887776666",
            password: "password123",
            role: "ADMIN",
            isVerified: true,
        });

        doctorProfile = await Doctor.create({
            userId: docUser._id,
            specialization: "Cardiology",
            qualification: "MBBS, MD",
            registrationNumber: `REG-${timestamp}`,
            experience: 8,
            hospital: "City Central Medical Center",
            consultationFee: 150,
            verificationStatus: "PENDING",
        });

        docToken = jwt.sign({ id: docUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        console.log("✓ Created Test Doctor User ID:", docUser._id);
        console.log("✓ Created Test Admin User ID:", adminUser._id);
        console.log("✓ Created Doctor Profile ID:", doctorProfile._id);

        // TEST 1: Unauthenticated request to upload certificate should be rejected (401)
        console.log("\n[TEST 1] Unauthenticated certificate upload request...");
        const formData1 = new FormData();
        formData1.append("certificateType", "MEDICAL_REGISTRATION");
        formData1.append("certificate", new Blob(["mock pdf"], { type: "application/pdf" }), "sample.pdf");

        const res1 = await fetch(`${baseUrl}/api/doctors/certificates`, {
            method: "POST",
            body: formData1,
        });
        const body1 = await res1.json();
        console.log("Status:", res1.status, body1.message);
        if (res1.status !== 401) throw new Error("Test 1 Failed: Expected HTTP 401");
        console.log("✓ TEST 1 PASSED: Unauthenticated upload rejected.");

        // TEST 2: Normal Doctor attempting to access Admin Endpoints should be forbidden (403)
        console.log("\n[TEST 2] Doctor role accessing Admin endpoints...");
        const res2 = await fetch(`${baseUrl}/api/admin/doctors/pending`, {
            headers: { Authorization: `Bearer ${docToken}` },
        });
        const body2 = await res2.json();
        console.log("Status:", res2.status, body2.message);
        if (res2.status !== 403) throw new Error("Test 2 Failed: Expected HTTP 403");
        console.log("✓ TEST 2 PASSED: Doctor cannot access admin endpoints.");

        // TEST 3: Invalid file format upload should be rejected (400)
        console.log("\n[TEST 3] Uploading invalid file format (.txt)...");
        const formData3 = new FormData();
        formData3.append("certificateType", "MEDICAL_REGISTRATION");
        formData3.append("certificate", new Blob(["malicious script"], { type: "text/plain" }), "malicious.txt");

        const res3 = await fetch(`${baseUrl}/api/doctors/certificates`, {
            method: "POST",
            headers: { Authorization: `Bearer ${docToken}` },
            body: formData3,
        });
        const body3 = await res3.json();
        console.log("Status:", res3.status, body3.message);
        if (res3.status !== 400) throw new Error("Test 3 Failed: Expected HTTP 400 for invalid file type");
        console.log("✓ TEST 3 PASSED: Invalid file format rejected.");

        // TEST 4: Oversized file upload (> 5MB) should be rejected (400)
        console.log("\n[TEST 4] Uploading oversized file (> 5MB)...");
        const oversizedBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
        const formData4 = new FormData();
        formData4.append("certificateType", "MEDICAL_REGISTRATION");
        formData4.append("certificate", new Blob([oversizedBuffer], { type: "application/pdf" }), "large.pdf");

        const res4 = await fetch(`${baseUrl}/api/doctors/certificates`, {
            method: "POST",
            headers: { Authorization: `Bearer ${docToken}` },
            body: formData4,
        });
        const body4 = await res4.json();
        console.log("Status:", res4.status, body4.message);
        if (res4.status !== 400) throw new Error("Test 4 Failed: Expected HTTP 400 for oversized file");
        console.log("✓ TEST 4 PASSED: Oversized file rejected.");

        // TEST 5: Authenticated Doctor uploads valid PDF certificate
        console.log("\n[TEST 5] Authenticated Doctor uploads valid PDF certificate...");
        const formData5 = new FormData();
        formData5.append("certificateType", "MEDICAL_REGISTRATION");
        formData5.append("certificate", new Blob(["%PDF-1.4 Mock Doctor Qualification Certificate Content"], { type: "application/pdf" }), "medical_reg_cert.pdf");

        const res5 = await fetch(`${baseUrl}/api/doctors/certificates`, {
            method: "POST",
            headers: { Authorization: `Bearer ${docToken}` },
            body: formData5,
        });
        const body5 = await res5.json();
        console.log("Status:", res5.status, "Message:", body5.message);
        if (res5.status !== 201 || !body5.data?.cloudinaryPublicId) {
            throw new Error(`Test 5 Failed: ${body5.message}`);
        }
        const createdCert = body5.data;
        console.log("✓ Certificate ID:", createdCert.id);
        console.log("✓ Cloudinary Public ID:", createdCert.cloudinaryPublicId);
        console.log("✓ Secure URL:", createdCert.secureUrl);
        console.log("✓ Status:", createdCert.verificationStatus);
        console.log("✓ TEST 5 PASSED: Certificate uploaded to Cloudinary and saved in DB.");

        // TEST 6: Admin views pending doctors list
        console.log("\n[TEST 6] Admin fetches list of pending doctors...");
        const res6 = await fetch(`${baseUrl}/api/admin/doctors/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const body6 = await res6.json();
        console.log("Status:", res6.status, "Total Pending:", body6.total);
        if (res6.status !== 200 || !Array.isArray(body6.data)) {
            throw new Error("Test 6 Failed: Unable to fetch pending doctors");
        }
        const foundDoc = body6.data.find((d) => d.doctorId.toString() === doctorProfile._id.toString());
        if (!foundDoc) throw new Error("Test 6 Failed: Submitted doctor not found in pending list");
        console.log("✓ Found Pending Doctor:", foundDoc.name, foundDoc.specialization);
        console.log("✓ TEST 6 PASSED: Admin sees pending doctor in verification list.");

        // TEST 7: Admin views certificate preview details & signed URL
        console.log("\n[TEST 7] Admin accesses certificate preview...");
        const res7 = await fetch(`${baseUrl}/api/admin/doctors/${doctorProfile._id}/certificates/${createdCert.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const body7 = await res7.json();
        console.log("Status:", res7.status, "Signed URL:", body7.data?.signedUrl);
        if (res7.status !== 200 || !body7.data?.signedUrl) {
            throw new Error("Test 7 Failed: Signed URL generation failed");
        }
        console.log("✓ TEST 7 PASSED: Secure certificate preview link generated for Admin.");

        // TEST 8: Admin rejects doctor without providing reason (should fail with 400)
        console.log("\n[TEST 8] Admin attempts rejection without reason...");
        const res8 = await fetch(`${baseUrl}/api/admin/doctors/${doctorProfile._id}/reject`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rejectionReason: "" }),
        });
        const body8 = await res8.json();
        console.log("Status:", res8.status, body8.message);
        if (res8.status !== 400) throw new Error("Test 8 Failed: Expected 400 when rejection reason is missing");
        console.log("✓ TEST 8 PASSED: Mandatory rejection reason enforced.");

        // TEST 9: Admin rejects doctor with rejection reason
        console.log("\n[TEST 9] Admin rejects doctor with reason...");
        const rejectionMsg = "Medical registration number could not be validated with Medical Council.";
        const res9 = await fetch(`${baseUrl}/api/admin/doctors/${doctorProfile._id}/reject`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rejectionReason: rejectionMsg }),
        });
        const body9 = await res9.json();
        console.log("Status:", res9.status, "Message:", body9.message);
        if (res9.status !== 200 || body9.data?.verificationStatus !== "REJECTED") {
            throw new Error("Test 9 Failed: Rejection update failed");
        }
        console.log("✓ DB Verification Status:", body9.data.verificationStatus);
        console.log("✓ Saved Rejection Reason:", body9.data.rejectionReason);
        console.log("✓ Saved VerifiedBy Admin ID:", body9.data.verifiedBy._id || body9.data.verifiedBy);
        console.log("✓ TEST 9 PASSED: Doctor rejected with reason and metadata saved.");

        // TEST 10: Doctor checks status and sees REJECTED with rejection reason
        console.log("\n[TEST 10] Doctor fetches updated verification status...");
        const res10 = await fetch(`${baseUrl}/api/doctor/verification-status`, {
            headers: { Authorization: `Bearer ${docToken}` },
        });
        const body10 = await res10.json();
        console.log("Status:", res10.status, "Status:", body10.status, "Reason:", body10.rejectionReason);
        if (res10.status !== 200 || body10.status !== "REJECTED" || body10.rejectionReason !== rejectionMsg) {
            throw new Error("Test 10 Failed: Doctor status does not reflect rejection");
        }
        console.log("✓ TEST 10 PASSED: Doctor sees REJECTED status and rejection reason.");

        // TEST 11: Doctor resubmits a new certificate after rejection -> status resets to PENDING
        console.log("\n[TEST 11] Doctor resubmits certificate after rejection...");
        const formData11 = new FormData();
        formData11.append("certificateType", "DEGREE");
        formData11.append("certificate", new Blob(["%PDF-1.4 Revised MBBS Degree Document"], { type: "application/pdf" }), "revised_degree.pdf");

        const res11 = await fetch(`${baseUrl}/api/doctors/certificates`, {
            method: "POST",
            headers: { Authorization: `Bearer ${docToken}` },
            body: formData11,
        });
        const body11 = await res11.json();
        console.log("Status:", res11.status, body11.message);
        if (res11.status !== 201) throw new Error("Test 11 Failed: Resubmission upload failed");

        const updatedDocAfterResubmit = await Doctor.findById(doctorProfile._id);
        console.log("✓ Doctor status after resubmission:", updatedDocAfterResubmit.verificationStatus);
        console.log("✓ Doctor rejection reason after resubmission:", updatedDocAfterResubmit.rejectionReason);
        if (updatedDocAfterResubmit.verificationStatus !== "PENDING" || updatedDocAfterResubmit.rejectionReason !== "") {
            throw new Error("Test 11 Failed: Status was not reset to PENDING upon resubmission");
        }
        console.log("✓ TEST 11 PASSED: Resubmitting certificate resets status to PENDING.");

        // TEST 12: Admin approves doctor profile
        console.log("\n[TEST 12] Admin approves doctor profile...");
        const res12 = await fetch(`${baseUrl}/api/admin/doctors/${doctorProfile._id}/verify`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const body12 = await res12.json();
        console.log("Status:", res12.status, "Message:", body12.message);
        if (res12.status !== 200 || (body12.data?.verificationStatus !== "APPROVED" && body12.data?.verificationStatus !== "VERIFIED")) {
            throw new Error(`Test 12 Failed: Approval failed - ${body12.message}`);
        }
        console.log("✓ Approved Doctor Status:", body12.data.verificationStatus);
        console.log("✓ VerifiedBy Admin ID:", body12.data.verifiedBy._id || body12.data.verifiedBy);
        console.log("✓ VerifiedAt Date:", body12.data.verifiedAt);
        console.log("✓ TEST 12 PASSED: Admin successfully approved doctor profile.");

        // TEST 13: Doctor checks final status and sees APPROVED
        console.log("\n[TEST 13] Doctor checks final status after approval...");
        const res13 = await fetch(`${baseUrl}/api/doctor/verification-status`, {
            headers: { Authorization: `Bearer ${docToken}` },
        });
        const body13 = await res13.json();
        console.log("Status:", res13.status, "Final Doctor Status:", body13.status);
        if (res13.status !== 200 || (body13.status !== "APPROVED" && body13.status !== "VERIFIED")) {
            throw new Error("Test 13 Failed: Doctor status does not reflect approval");
        }
        console.log("✓ TEST 13 PASSED: Doctor status successfully confirmed as APPROVED / VERIFIED.");

        console.log("\n==================================================");
        console.log("   ALL PHASE 5 TESTS PASSED SUCCESSFULLY! (13/13)");
        console.log("==================================================");
    } catch (err) {
        console.error("\n❌ PHASE 5 TEST SUITE FAILED:", err.message);
        process.exitCode = 1;
    } finally {
        server.close();
        if (docUser) {
            await DoctorCertificate.deleteMany({ doctorId: doctorProfile._id });
            await Doctor.deleteOne({ _id: doctorProfile._id });
            await User.deleteOne({ _id: docUser._id });
        }
        if (adminUser) {
            await User.deleteOne({ _id: adminUser._id });
        }
        await mongoose.disconnect();
        console.log("✓ Database cleanup and disconnect complete.");
    }
}

runPhase5TestSuite();
