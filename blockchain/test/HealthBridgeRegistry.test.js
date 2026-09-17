const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthBridgeRegistry Comprehensive Smart Contract Test Suite", function () {
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

    describe("2. Doctor Verification Proof", function () {
        it("Should register doctor status and emit DoctorStatusUpdated event", async function () {
            await expect(
                registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1) // 1 = VERIFIED
            )
                .to.emit(registry, "DoctorStatusUpdated")
                .withArgs(sampleDoctorHash, sampleRegistrationHash, 1, (val) => val > 0);

            const doctor = await registry.getDoctor(sampleDoctorHash);
            expect(doctor.registrationHash).to.equal(sampleRegistrationHash);
            expect(doctor.status).to.equal(1);
            expect(doctor.exists).to.be.true;
        });

        it("Should verify registered doctor credentials correctly", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1);
            const [isVerified, status] = await registry.verifyDoctor(sampleDoctorHash, sampleRegistrationHash);
            expect(isVerified).to.be.true;
            expect(status).to.equal(1);
        });

        it("Should fail verification if doctor registration hash mismatches", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1);
            const wrongHash = hashBytes32("WRONG_REGISTRATION_HASH");
            const [isVerified] = await registry.verifyDoctor(sampleDoctorHash, wrongHash);
            expect(isVerified).to.be.false;
        });

        it("Should revert when registering duplicate doctor identifier", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 0); // PENDING
            await expect(
                registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: doctor identifier already registered");
        });

        it("Should revert when non-owner attempts to register doctor", async function () {
            await expect(
                registry.connect(addr1).registerDoctor(sampleDoctorHash, sampleRegistrationHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });

        it("Should update status of registered doctor", async function () {
            await registry.registerDoctor(sampleDoctorHash, sampleRegistrationHash, 0); // PENDING
            await expect(registry.updateDoctorStatus(sampleDoctorHash, 1)) // VERIFIED
                .to.emit(registry, "DoctorStatusUpdated")
                .withArgs(sampleDoctorHash, sampleRegistrationHash, 1, (val) => val > 0);

            const doc = await registry.getDoctor(sampleDoctorHash);
            expect(doc.status).to.equal(1);
        });
    });

    describe("3. Medical Record Integrity Hashes", function () {
        it("Should register medical record hash on-chain", async function () {
            await expect(registry.registerMedicalRecord(sampleRecordId, sampleRecordHash))
                .to.emit(registry, "MedicalRecordRegistered")
                .withArgs(sampleRecordId, sampleRecordHash, (val) => val > 0);

            const record = await registry.getMedicalRecord(sampleRecordId);
            expect(record.recordHash).to.equal(sampleRecordHash);
            expect(record.exists).to.be.true;
        });

        it("Should verify valid medical record hash", async function () {
            await registry.registerMedicalRecord(sampleRecordId, sampleRecordHash);
            const [isValid] = await registry.verifyMedicalRecord(sampleRecordId, sampleRecordHash);
            expect(isValid).to.be.true;
        });

        it("Should return false for tampered record hash verification", async function () {
            await registry.registerMedicalRecord(sampleRecordId, sampleRecordHash);
            const tamperedHash = hashBytes32("TAMPERED_RECORD_HASH");
            const [isValid] = await registry.verifyMedicalRecord(sampleRecordId, tamperedHash);
            expect(isValid).to.be.false;
        });

        it("Should revert duplicate medical record registration", async function () {
            await registry.registerMedicalRecord(sampleRecordId, sampleRecordHash);
            await expect(
                registry.registerMedicalRecord(sampleRecordId, sampleRecordHash)
            ).to.be.revertedWith("HealthBridgeRegistry: medical record identifier already registered");
        });
    });

    describe("4. Digital Prescription Integrity Hashes", function () {
        it("Should register prescription hash on-chain", async function () {
            await expect(
                registry.registerPrescription(
                    samplePrescriptionId,
                    samplePrescriptionHash,
                    sampleDoctorHash,
                    samplePatientHash
                )
            )
                .to.emit(registry, "PrescriptionRegistered")
                .withArgs(samplePrescriptionId, samplePrescriptionHash, sampleDoctorHash, samplePatientHash, (val) => val > 0);

            const p = await registry.getPrescription(samplePrescriptionId);
            expect(p.prescriptionHash).to.equal(samplePrescriptionHash);
            expect(p.doctorHash).to.equal(sampleDoctorHash);
            expect(p.patientHash).to.equal(samplePatientHash);
            expect(p.exists).to.be.true;
        });

        it("Should verify valid prescription hash", async function () {
            await registry.registerPrescription(
                samplePrescriptionId,
                samplePrescriptionHash,
                sampleDoctorHash,
                samplePatientHash
            );
            const [isValid, doctorHash, patientHash] = await registry.verifyPrescription(
                samplePrescriptionId,
                samplePrescriptionHash
            );
            expect(isValid).to.be.true;
            expect(doctorHash).to.equal(sampleDoctorHash);
            expect(patientHash).to.equal(samplePatientHash);
        });

        it("Should revert duplicate prescription registration", async function () {
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
    });

    describe("5. Patient Consent Audit Logging", function () {
        it("Should record consent status (GRANTED) and verify access", async function () {
            await expect(
                registry.updateConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1) // 1 = GRANTED
            )
                .to.emit(registry, "ConsentUpdated")
                .withArgs(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1, (val) => val > 0);

            const [isGranted] = await registry.verifyConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash);
            expect(isGranted).to.be.true;
        });

        it("Should update consent status from GRANTED to REVOKED", async function () {
            await registry.updateConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1); // GRANTED
            let [isGranted] = await registry.verifyConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash);
            expect(isGranted).to.be.true;

            await registry.updateConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash, 0); // REVOKED
            [isGranted] = await registry.verifyConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash);
            expect(isGranted).to.be.false;
        });

        it("Should revert when non-owner tries to update consent", async function () {
            await expect(
                registry.connect(addr1).updateConsent(samplePatientHash, sampleDoctorHash, sampleRecordHash, 1)
            ).to.be.revertedWith("HealthBridgeRegistry: caller is not the owner");
        });
    });
});
