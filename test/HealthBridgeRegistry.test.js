const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthBridgeRegistry Smart Contract Suite", function () {
    let HealthBridgeRegistry;
    let registry;
    let owner;
    let addr1;
    let addr2;

    // Helper utilities for generating bytes32 test hashes
    const hashBytes32 = (str) => ethers.keccak256(ethers.toUtf8Bytes(str));

    const sampleDoctorHash = hashBytes32("DOCTOR_USER_12345");
    const sampleRegistrationHash = hashBytes32("MEDICAL_REG_NO_998877");

    const sampleRecordId = hashBytes32("RECORD_ID_554433");
    const sampleRecordHash = hashBytes32("FILE_SHA256_HASH_abcdef1234567890");

    const samplePrescriptionId = hashBytes32("PRESCRIPTION_ID_778899");
    const samplePrescriptionHash = hashBytes32("PRESCRIPTION_CANONICAL_HASH_112233");
    const samplePatientHash = hashBytes32("PATIENT_USER_667788");

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        HealthBridgeRegistry = await ethers.getContractFactory("HealthBridgeRegistry");
        registry = await HealthBridgeRegistry.deploy();
        await registry.waitForDeployment();
    });

    describe("1. Deployment & Access Control", function () {
        it("Should set the deployer as initial owner", async function () {
            expect(await registry.owner()).to.equal(owner.address);
        });

        it("Should allow owner to transfer ownership", async function () {
            await expect(registry.transferOwnership(addr1.address))
                .to.emit(registry, "OwnershipTransferred")
                .withArgs(owner.address, addr1.address);

            expect(await registry.owner()).to.equal(addr1.address);
        });

        it("Should revert when non-owner tries to transfer ownership", async function () {
            await expect(
                registry.connect(addr1).transferOwnership(addr2.address)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });

        it("Should revert when transferring ownership to zero address", async function () {
            await expect(
                registry.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("HealthBridgeRegistry: invalid new owner address");
        });
    });

    describe("2. Doctor Verification", function () {
        it("Should register doctor status and emit DoctorStatusUpdated event", async function () {
            // Status 1 = VERIFIED
            await expect(
                registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1)
            )
                .to.emit(registry, "DoctorStatusUpdated")
                .withArgs(sampleDoctorHash, sampleRegistrationHash, 1, (val) => val > 0);

            const doctor = await registry.getDoctor(sampleDoctorHash);
            expect(doctor.registrationHash).to.equal(sampleRegistrationHash);
            expect(doctor.status).to.equal(1);
            expect(doctor.exists).to.be.true;
        });

        it("Should revert when registering duplicate doctor identifier", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 0); // PENDING

            await expect(
                registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: doctor identifier already registered");
        });

        it("Should revert when non-owner tries to register doctor", async function () {
            await expect(
                registry.connect(addr1).registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });

        it("Should update existing doctor status", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 0); // PENDING

            await expect(registry.updateDoctorStatus(sampleDoctorHash, 1)) // Update to VERIFIED
                .to.emit(registry, "DoctorStatusUpdated")
                .withArgs(sampleDoctorHash, sampleRegistrationHash, 1, (val) => val > 0);

            const doc = await registry.getDoctor(sampleDoctorHash);
            expect(doc.status).to.equal(1);
        });

        it("Should revert updating status of unregistered doctor", async function () {
            await expect(
                registry.updateDoctorStatus(sampleDoctorHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: doctor not registered");
        });

        it("Should correctly verify doctor status and registration hash", async function () {
            // Unregistered doctor test
            let verification = await registry.verifyDoctor(sampleDoctorHash, sampleRegistrationHash);
            expect(verification.isVerified).to.be.false;
            expect(verification.status).to.equal(0); // PENDING

            // Register as VERIFIED
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1);

            // Valid verification
            verification = await registry.verifyDoctor(sampleDoctorHash, sampleRegistrationHash);
            expect(verification.isVerified).to.be.true;
            expect(verification.status).to.equal(1); // VERIFIED

            // Wrong registration hash test
            const wrongRegistrationHash = hashBytes32("WRONG_REGISTRATION_HASH");
            verification = await registry.verifyDoctor(sampleDoctorHash, wrongRegistrationHash);
            expect(verification.isVerified).to.be.false;
        });
    });

    describe("3. Medical Record Integrity", function () {
        it("Should register medical record hash and emit MedicalRecordRegistered event", async function () {
            await expect(registry.registerMedicalRecord(sampleRecordId, sampleRecordHash))
                .to.emit(registry, "MedicalRecordRegistered")
                .withArgs(sampleRecordId, sampleRecordHash, (val) => val > 0);

            const rec = await registry.getMedicalRecord(sampleRecordId);
            expect(rec.recordHash).to.equal(sampleRecordHash);
            expect(rec.exists).to.be.true;
        });

        it("Should revert registering duplicate medical record identifier", async function () {
            await registry.registerMedicalRecord(sampleRecordId, sampleRecordHash);

            await expect(
                registry.registerMedicalRecord(sampleRecordId, sampleRecordHash)
            ).to.be.revertedWith("HealthBridgeRegistry: medical record identifier already registered");
        });

        it("Should revert non-owner from registering medical record", async function () {
            await expect(
                registry.connect(addr1).registerMedicalRecord(sampleRecordId, sampleRecordHash)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });

        it("Should verify medical record hash matches stored hash", async function () {
            // Unregistered test
            let res = await registry.verifyMedicalRecord(sampleRecordId, sampleRecordHash);
            expect(res.isValid).to.be.false;

            await registry.registerMedicalRecord(sampleRecordId, sampleRecordHash);

            // Matching test
            res = await registry.verifyMedicalRecord(sampleRecordId, sampleRecordHash);
            expect(res.isValid).to.be.true;
            expect(res.timestamp).to.be.gt(0);

            // Mismatch test
            const fakeRecordHash = hashBytes32("FAKE_RECORD_HASH");
            res = await registry.verifyMedicalRecord(sampleRecordId, fakeRecordHash);
            expect(res.isValid).to.be.false;
        });
    });

    describe("4. Prescription Integrity", function () {
        it("Should register digital prescription and emit PrescriptionRegistered event", async function () {
            await expect(
                registry.registerPrescription(
                    samplePrescriptionId,
                    samplePrescriptionHash,
                    sampleDoctorHash,
                    samplePatientHash
                )
            )
                .to.emit(registry, "PrescriptionRegistered")
                .withArgs(
                    samplePrescriptionId,
                    samplePrescriptionHash,
                    sampleDoctorHash,
                    samplePatientHash,
                    (val) => val > 0
                );

            const p = await registry.getPrescription(samplePrescriptionId);
            expect(p.prescriptionHash).to.equal(samplePrescriptionHash);
            expect(p.doctorHash).to.equal(sampleDoctorHash);
            expect(p.patientHash).to.equal(samplePatientHash);
            expect(p.exists).to.be.true;
        });

        it("Should revert on duplicate prescription registration", async function () {
            await registry.registerPrescription(
                samplePrescriptionId,
                samplePrescriptionHash,
                sampleDoctorHash,
                samplePatientHash
            );

            await expect(
                registry.registerPrescription(
                    samplePrescriptionId,
                    samplePrescriptionHash,
                    sampleDoctorHash,
                    samplePatientHash
                )
            ).to.be.revertedWith("HealthBridgeRegistry: prescription identifier already registered");
        });

        it("Should verify valid prescription hash and return associated hashes", async function () {
            await registry.registerPrescription(
                samplePrescriptionId,
                samplePrescriptionHash,
                sampleDoctorHash,
                samplePatientHash
            );

            const verification = await registry.verifyPrescription(
                samplePrescriptionId,
                samplePrescriptionHash
            );

            expect(verification.isValid).to.be.true;
            expect(verification.doctorHash).to.equal(sampleDoctorHash);
            expect(verification.patientHash).to.equal(samplePatientHash);
            expect(verification.timestamp).to.be.gt(0);

            const wrongHash = hashBytes32("WRONG_PRESCRIPTION_HASH");
            const failedVer = await registry.verifyPrescription(samplePrescriptionId, wrongHash);
            expect(failedVer.isValid).to.be.false;
        });
    });

    describe("5. Consent Management", function () {
        it("Should record consent action (GRANTED/REVOKED) and emit ConsentUpdated event", async function () {
            // Action 1 = GRANTED
            await expect(
                registry.updateConsent(
                    samplePatientHash,
                    sampleDoctorHash,
                    sampleRecordHash,
                    1
                )
            )
                .to.emit(registry, "ConsentUpdated")
                .withArgs(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1, (val) => val > 0);

            let consent = await registry.getConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash
            );
            expect(consent.action).to.equal(1); // GRANTED
            expect(consent.exists).to.be.true;

            let ver = await registry.verifyConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash
            );
            expect(ver.isGranted).to.be.true;

            // Revoke Consent (Action 0 = REVOKED)
            await registry.updateConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash,
                0
            );

            consent = await registry.getConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash
            );
            expect(consent.action).to.equal(0); // REVOKED

            ver = await registry.verifyConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash
            );
            expect(ver.isGranted).to.be.false;
        });

        it("Should return isGranted = false for unrecorded consent", async function () {
            const ver = await registry.verifyConsent(
                samplePatientHash,
                sampleDoctorHash,
                sampleRecordHash
            );
            expect(ver.isGranted).to.be.false;
            expect(ver.timestamp).to.equal(0);
        });

        it("Should revert non-owner from updating consent", async function () {
            await expect(
                registry
                    .connect(addr1)
                    .updateConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });
    });
});
