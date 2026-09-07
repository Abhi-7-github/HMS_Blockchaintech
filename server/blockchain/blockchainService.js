const { getContract, toBytes32 } = require("./contractService");

/**
 * Maps verification status string/number to Solidity enum uint8
 * PENDING = 0, VERIFIED = 1, REJECTED = 2
 */
const mapVerificationStatusToEnum = (status) => {
    if (typeof status === "number") return status;
    const s = String(status || "").toUpperCase();
    if (s === "VERIFIED") return 1;
    if (s === "REJECTED") return 2;
    return 0; // PENDING
};

/**
 * 1. Register or update doctor verification status on-chain
 * @param {string} doctorHash - Doctor identifier or hash
 * @param {string} registrationHash - Registration credential hash
 * @param {string|number} verificationStatus - PENDING (0), VERIFIED (1), REJECTED (2)
 * @returns {Promise<Object>} { success, transactionHash, blockNumber, doctorHash, status }
 */
const verifyDoctorOnChain = async (doctorHash, registrationHash, verificationStatus) => {
    try {
        const contract = getContract(false);
        const formattedDoctorHash = toBytes32(doctorHash);
        const formattedRegHash = toBytes32(registrationHash);
        const statusEnum = mapVerificationStatusToEnum(verificationStatus);

        // Check if doctor is already registered on-chain
        const [, , , exists] = await contract.getDoctor(formattedDoctorHash);

        let tx;
        if (exists) {
            tx = await contract.updateDoctorStatus(formattedDoctorHash, statusEnum);
        } else {
            tx = await contract.registerDoctor(formattedDoctorHash, formattedRegHash, statusEnum);
        }

        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            doctorHash: formattedDoctorHash,
            status: statusEnum,
        };
    } catch (error) {
        console.error("Blockchain error in verifyDoctorOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to record doctor verification status on-chain",
        };
    }
};

/**
 * 2. Store off-chain medical record SHA-256 hash on-chain
 * @param {string} recordId - Unique record ID or hash
 * @param {string} recordHash - SHA-256 hash of the medical record file
 * @returns {Promise<Object>} { success, transactionHash, blockNumber, recordId, recordHash }
 */
const storeMedicalRecordHashOnChain = async (recordId, recordHash) => {
    try {
        const contract = getContract(false);
        const formattedRecordId = toBytes32(recordId);
        const formattedRecordHash = toBytes32(recordHash);

        const tx = await contract.registerMedicalRecord(formattedRecordId, formattedRecordHash);
        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            recordId: formattedRecordId,
            recordHash: formattedRecordHash,
        };
    } catch (error) {
        console.error("Blockchain error in storeMedicalRecordHashOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to store medical record hash on-chain",
        };
    }
};

/**
 * 3. Store digital prescription deterministic SHA-256 hash on-chain
 * @param {string} prescriptionId - Unique prescription ID or hash
 * @param {string} prescriptionHash - Deterministic SHA-256 hash
 * @param {string} doctorHash - Doctor identifier or hash
 * @param {string} patientHash - Patient identifier or hash
 * @returns {Promise<Object>} { success, transactionHash, blockNumber, prescriptionId, prescriptionHash }
 */
const storePrescriptionHashOnChain = async (prescriptionId, prescriptionHash, doctorHash, patientHash) => {
    try {
        const contract = getContract(false);
        const formattedPrescriptionId = toBytes32(prescriptionId);
        const formattedPrescriptionHash = toBytes32(prescriptionHash);
        const formattedDoctorHash = toBytes32(doctorHash);
        const formattedPatientHash = toBytes32(patientHash);

        const tx = await contract.registerPrescription(
            formattedPrescriptionId,
            formattedPrescriptionHash,
            formattedDoctorHash,
            formattedPatientHash
        );
        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            prescriptionId: formattedPrescriptionId,
            prescriptionHash: formattedPrescriptionHash,
        };
    } catch (error) {
        console.error("Blockchain error in storePrescriptionHashOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to store prescription hash on-chain",
        };
    }
};

/**
 * 4. Record consent access GRANTED on-chain
 * @param {string} patientHash - Patient reference/hash
 * @param {string} doctorHash - Doctor reference/hash
 * @param {string} recordHash - Medical record identifier/hash
 * @returns {Promise<Object>} { success, transactionHash, blockNumber, action }
 */
const grantRecordAccessOnChain = async (patientHash, doctorHash, recordHash) => {
    try {
        const contract = getContract(false);
        const formattedPatientHash = toBytes32(patientHash);
        const formattedDoctorHash = toBytes32(doctorHash);
        const formattedRecordHash = toBytes32(recordHash);

        const tx = await contract.updateConsent(
            formattedPatientHash,
            formattedDoctorHash,
            formattedRecordHash,
            1 // 1 = GRANTED
        );
        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            action: "GRANTED",
        };
    } catch (error) {
        console.error("Blockchain error in grantRecordAccessOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to record consent grant on-chain",
        };
    }
};

/**
 * 5. Record consent access REVOKED on-chain
 * @param {string} patientHash - Patient reference/hash
 * @param {string} doctorHash - Doctor reference/hash
 * @param {string} recordHash - Medical record identifier/hash
 * @returns {Promise<Object>} { success, transactionHash, blockNumber, action }
 */
const revokeRecordAccessOnChain = async (patientHash, doctorHash, recordHash) => {
    try {
        const contract = getContract(false);
        const formattedPatientHash = toBytes32(patientHash);
        const formattedDoctorHash = toBytes32(doctorHash);
        const formattedRecordHash = toBytes32(recordHash);

        const tx = await contract.updateConsent(
            formattedPatientHash,
            formattedDoctorHash,
            formattedRecordHash,
            0 // 0 = REVOKED
        );
        const receipt = await tx.wait();

        return {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            action: "REVOKED",
        };
    } catch (error) {
        console.error("Blockchain error in revokeRecordAccessOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to record consent revocation on-chain",
        };
    }
};

/**
 * 6. Read and verify stored information on-chain
 * @param {string} type - "DOCTOR", "MEDICAL_RECORD", "PRESCRIPTION", or "CONSENT"
 * @param {string} identifier - Main identifier or hash
 * @param {string|Object} expectedHashOrParams - Expected hash or parameter object
 * @returns {Promise<Object>} { success, isVerified, data }
 */
const verifyHashOnChain = async (type, identifier, expectedHashOrParams) => {
    try {
        const contract = getContract(true);
        const formattedId = toBytes32(identifier);

        const targetType = String(type || "").toUpperCase();

        if (targetType === "DOCTOR") {
            const expectedRegHash = toBytes32(expectedHashOrParams);
            const [isVerified, status] = await contract.verifyDoctor(formattedId, expectedRegHash);
            return {
                success: true,
                isVerified: Boolean(isVerified),
                status: Number(status),
            };
        } else if (targetType === "MEDICAL_RECORD") {
            const expectedHash = toBytes32(expectedHashOrParams);
            const [isValid, timestamp] = await contract.verifyMedicalRecord(formattedId, expectedHash);
            return {
                success: true,
                isVerified: Boolean(isValid),
                timestamp: Number(timestamp),
            };
        } else if (targetType === "PRESCRIPTION") {
            const expectedHash = toBytes32(expectedHashOrParams);
            const [isValid, doctorHash, patientHash, timestamp] = await contract.verifyPrescription(
                formattedId,
                expectedHash
            );
            return {
                success: true,
                isVerified: Boolean(isValid),
                doctorHash,
                patientHash,
                timestamp: Number(timestamp),
            };
        } else if (targetType === "CONSENT") {
            const doctorHash = toBytes32(expectedHashOrParams.doctorHash);
            const recordHash = toBytes32(expectedHashOrParams.recordHash);
            const [isGranted, timestamp] = await contract.verifyConsent(formattedId, doctorHash, recordHash);
            return {
                success: true,
                isVerified: Boolean(isGranted),
                timestamp: Number(timestamp),
            };
        } else {
            return {
                success: false,
                error: `Unknown verification type '${type}'. Valid options: DOCTOR, MEDICAL_RECORD, PRESCRIPTION, CONSENT`,
            };
        }
    } catch (error) {
        console.error("Blockchain error in verifyHashOnChain:", error.message);
        return {
            success: false,
            error: error.message || "Failed to verify information on-chain",
        };
    }
};

module.exports = {
    verifyDoctorOnChain,
    storeMedicalRecordHashOnChain,
    storePrescriptionHashOnChain,
    grantRecordAccessOnChain,
    revokeRecordAccessOnChain,
    verifyHashOnChain,
};
