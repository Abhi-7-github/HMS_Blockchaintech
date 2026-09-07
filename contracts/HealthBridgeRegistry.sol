// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HealthBridgeRegistry
 * @author HMS BlockchainTech Team
 * @notice Immutable blockchain registry for doctor verification, medical record integrity hashes,
 * digital prescription tracking, and patient consent audit logging.
 * @dev SECURITY & PRIVACY SPECIFICATION:
 * 1. ZERO RAW DATA STORAGE: No Personal Identifiable Information (PII) or raw medical records
 *    are stored on-chain. Only cryptographic hashes (bytes32) are stored to preserve privacy.
 * 2. AUTHORIZED WRITE ACCESS: Only the authorized backend admin/relayer wallet (owner)
 *    can write to this contract, preventing unauthorized state mutations.
 * 3. IDENTIFIER UNIQUENESS: Duplicate record, doctor, and prescription IDs are explicitly rejected.
 * 4. MINIMIZED ON-CHAIN STORAGE: Uses fixed-size bytes32, uint256, and packed enums for gas efficiency.
 */
contract HealthBridgeRegistry {
    // =========================================================================
    // ENUMS & STRUCTS
    // =========================================================================

    /// @notice Status of doctor verification on-chain
    enum VerificationStatus {
        PENDING,
        VERIFIED,
        REJECTED
    }

    /// @notice Action state for patient-doctor medical record access consent
    enum ConsentAction {
        REVOKED,
        GRANTED
    }

    /// @notice On-chain doctor verification record
    struct DoctorRecord {
        bytes32 registrationHash; // Cryptographic hash of registration number & credentials
        uint256 timestamp;        // Block timestamp when record was registered or updated
        VerificationStatus status;// Verification status (PENDING, VERIFIED, REJECTED)
        bool exists;              // Flag to prevent duplicate registration
    }

    /// @notice On-chain medical record integrity entry
    struct MedicalRecordEntry {
        bytes32 recordHash; // Cryptographic SHA-256 hash of the off-chain medical record file
        uint256 timestamp;  // Block timestamp of record registration
        bool exists;        // Flag to prevent duplicate record IDs
    }

    /// @notice On-chain prescription integrity entry
    struct PrescriptionEntry {
        bytes32 prescriptionHash; // Deterministic SHA-256 hash of prescription content
        bytes32 doctorHash;       // Hash identifier of prescribing doctor
        bytes32 patientHash;      // Hash identifier of patient
        uint256 timestamp;        // Block timestamp of prescription registration
        bool exists;              // Flag to prevent duplicate prescription IDs
    }

    /// @notice On-chain consent audit record
    struct ConsentRecord {
        ConsentAction action; // GRANTED or REVOKED
        uint256 timestamp;    // Block timestamp of last consent action
        bool exists;          // Flag indicating consent record existence
    }

    // =========================================================================
    // STATE VARIABLES & MAPPINGS
    // =========================================================================

    /// @notice Authorized admin/backend wallet address
    address public owner;

    /// @dev Mapping from doctor identifier hash => DoctorRecord
    mapping(bytes32 => DoctorRecord) private doctors;

    /// @dev Mapping from medical record identifier => MedicalRecordEntry
    mapping(bytes32 => MedicalRecordEntry) private medicalRecords;

    /// @dev Mapping from prescription identifier => PrescriptionEntry
    mapping(bytes32 => PrescriptionEntry) private prescriptions;

    /// @dev Mapping from consent key (keccak256(patientHash, doctorHash, recordHash)) => ConsentRecord
    mapping(bytes32 => ConsentRecord) private consentRegistry;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event DoctorStatusUpdated(
        bytes32 indexed doctorHash,
        bytes32 registrationHash,
        VerificationStatus status,
        uint256 timestamp
    );

    event MedicalRecordRegistered(
        bytes32 indexed recordId,
        bytes32 recordHash,
        uint256 timestamp
    );

    event PrescriptionRegistered(
        bytes32 indexed prescriptionId,
        bytes32 prescriptionHash,
        bytes32 indexed doctorHash,
        bytes32 indexed patientHash,
        uint256 timestamp
    );

    event ConsentUpdated(
        bytes32 indexed patientHash,
        bytes32 indexed doctorHash,
        bytes32 indexed recordHash,
        ConsentAction action,
        uint256 timestamp
    );

    // =========================================================================
    // MODIFIERS & CONSTRUCTOR
    // =========================================================================

    /// @dev Restricts state-modifying functions to the authorized owner/backend wallet
    modifier onlyOwner() {
        require(msg.sender == owner, "HealthBridgeRegistry: caller is not the owner");
        _;
    }

    /// @notice Initializes the registry contract with the deployer as initial owner
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Transfers ownership of the registry to a new address
    /// @param newOwner Address of the new authorized owner wallet
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "HealthBridgeRegistry: invalid new owner address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // =========================================================================
    // 1. DOCTOR VERIFICATION FUNCTIONS
    // =========================================================================

    /**
     * @notice Registers a new doctor verification entry on-chain
     * @dev Prevents duplicate doctor hashes. Callable only by authorized backend owner wallet.
     * @param doctorHash Hash identifier of the doctor
     * @param registrationHash Hash identifier of the medical registration certificate
     * @param status Verification status (PENDING, VERIFIED, REJECTED)
     */
    function registerDoctor(
        bytes32 doctorHash,
        bytes32 registrationHash,
        VerificationStatus status
    ) external onlyOwner {
        require(doctorHash != bytes32(0), "HealthBridgeRegistry: invalid doctorHash");
        require(!doctors[doctorHash].exists, "HealthBridgeRegistry: doctor identifier already registered");

        doctors[doctorHash] = DoctorRecord({
            registrationHash: registrationHash,
            timestamp: block.timestamp,
            status: status,
            exists: true
        });

        emit DoctorStatusUpdated(doctorHash, registrationHash, status, block.timestamp);
    }

    /**
     * @notice Updates the verification status of an existing doctor
     * @dev Reverts if the doctor identifier is not registered.
     * @param doctorHash Hash identifier of the doctor
     * @param status Updated verification status
     */
    function updateDoctorStatus(bytes32 doctorHash, VerificationStatus status) external onlyOwner {
        require(doctors[doctorHash].exists, "HealthBridgeRegistry: doctor not registered");

        doctors[doctorHash].status = status;
        doctors[doctorHash].timestamp = block.timestamp;

        emit DoctorStatusUpdated(
            doctorHash,
            doctors[doctorHash].registrationHash,
            status,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves the doctor verification record for a given doctor identifier hash
     * @param doctorHash Hash identifier of the doctor
     * @return registrationHash Hash of medical registration certificate
     * @return timestamp Block timestamp of last update
     * @return status Current verification status
     * @return exists Boolean flag indicating whether the doctor is registered
     */
    function getDoctor(bytes32 doctorHash)
        external
        view
        returns (
            bytes32 registrationHash,
            uint256 timestamp,
            VerificationStatus status,
            bool exists
        )
    {
        DoctorRecord memory doc = doctors[doctorHash];
        return (doc.registrationHash, doc.timestamp, doc.status, doc.exists);
    }

    /**
     * @notice Verifies if a doctor exists, matches registration hash, and holds VERIFIED status
     * @param doctorHash Hash identifier of the doctor
     * @param expectedRegistrationHash Expected hash of medical registration certificate
     * @return isVerified True if doctor is registered, matches registration hash, and is VERIFIED
     * @return status Current verification status
     */
    function verifyDoctor(bytes32 doctorHash, bytes32 expectedRegistrationHash)
        external
        view
        returns (bool isVerified, VerificationStatus status)
    {
        DoctorRecord memory doc = doctors[doctorHash];
        if (!doc.exists) {
            return (false, VerificationStatus.PENDING);
        }
        bool matchesHash = (doc.registrationHash == expectedRegistrationHash);
        bool isStatusVerified = (doc.status == VerificationStatus.VERIFIED);
        return (matchesHash && isStatusVerified, doc.status);
    }

    // =========================================================================
    // 2. MEDICAL RECORD INTEGRITY FUNCTIONS
    // =========================================================================

    /**
     * @notice Registers a medical record hash on-chain for tamper-proof integrity verification
     * @dev Prevents duplicate record IDs. Stores only off-chain file hashes.
     * @param recordId Unique off-chain record identifier hash
     * @param recordHash Cryptographic SHA-256 hash of the medical record
     */
    function registerMedicalRecord(bytes32 recordId, bytes32 recordHash) external onlyOwner {
        require(recordId != bytes32(0), "HealthBridgeRegistry: invalid recordId");
        require(recordHash != bytes32(0), "HealthBridgeRegistry: invalid recordHash");
        require(!medicalRecords[recordId].exists, "HealthBridgeRegistry: medical record identifier already registered");

        medicalRecords[recordId] = MedicalRecordEntry({
            recordHash: recordHash,
            timestamp: block.timestamp,
            exists: true
        });

        emit MedicalRecordRegistered(recordId, recordHash, block.timestamp);
    }

    /**
     * @notice Retrieves stored medical record metadata by record ID
     * @param recordId Unique record identifier hash
     * @return recordHash Cryptographic hash stored on-chain
     * @return timestamp Block timestamp of record creation
     * @return exists Boolean flag indicating if record exists
     */
    function getMedicalRecord(bytes32 recordId)
        external
        view
        returns (
            bytes32 recordHash,
            uint256 timestamp,
            bool exists
        )
    {
        MedicalRecordEntry memory record = medicalRecords[recordId];
        return (record.recordHash, record.timestamp, record.exists);
    }

    /**
     * @notice Verifies if a given medical record ID matches the expected off-chain file hash
     * @param recordId Unique record identifier hash
     * @param expectedRecordHash Expected SHA-256 hash of the file
     * @return isValid True if record exists and stored hash matches expected hash
     * @return timestamp Registration block timestamp
     */
    function verifyMedicalRecord(bytes32 recordId, bytes32 expectedRecordHash)
        external
        view
        returns (bool isValid, uint256 timestamp)
    {
        MedicalRecordEntry memory record = medicalRecords[recordId];
        if (!record.exists) {
            return (false, 0);
        }
        return (record.recordHash == expectedRecordHash, record.timestamp);
    }

    // =========================================================================
    // 3. PRESCRIPTION INTEGRITY FUNCTIONS
    // =========================================================================

    /**
     * @notice Registers a digital prescription hash on-chain
     * @dev Stores deterministic prescription hash, doctor hash, and patient hash. Prevents duplicate IDs.
     * @param prescriptionId Unique prescription identifier hash
     * @param prescriptionHash Deterministic SHA-256 hash of canonical prescription
     * @param doctorHash Hash identifier of prescribing doctor
     * @param patientHash Hash identifier of patient
     */
    function registerPrescription(
        bytes32 prescriptionId,
        bytes32 prescriptionHash,
        bytes32 doctorHash,
        bytes32 patientHash
    ) external onlyOwner {
        require(prescriptionId != bytes32(0), "HealthBridgeRegistry: invalid prescriptionId");
        require(prescriptionHash != bytes32(0), "HealthBridgeRegistry: invalid prescriptionHash");
        require(doctorHash != bytes32(0), "HealthBridgeRegistry: invalid doctorHash");
        require(patientHash != bytes32(0), "HealthBridgeRegistry: invalid patientHash");
        require(!prescriptions[prescriptionId].exists, "HealthBridgeRegistry: prescription identifier already registered");

        prescriptions[prescriptionId] = PrescriptionEntry({
            prescriptionHash: prescriptionHash,
            doctorHash: doctorHash,
            patientHash: patientHash,
            timestamp: block.timestamp,
            exists: true
        });

        emit PrescriptionRegistered(
            prescriptionId,
            prescriptionHash,
            doctorHash,
            patientHash,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves stored prescription details by prescription ID
     * @param prescriptionId Unique prescription identifier hash
     * @return prescriptionHash Deterministic hash of prescription
     * @return doctorHash Hash identifier of prescribing doctor
     * @return patientHash Hash identifier of patient
     * @return timestamp Registration block timestamp
     * @return exists Boolean flag indicating existence
     */
    function getPrescription(bytes32 prescriptionId)
        external
        view
        returns (
            bytes32 prescriptionHash,
            bytes32 doctorHash,
            bytes32 patientHash,
            uint256 timestamp,
            bool exists
        )
    {
        PrescriptionEntry memory p = prescriptions[prescriptionId];
        return (p.prescriptionHash, p.doctorHash, p.patientHash, p.timestamp, p.exists);
    }

    /**
     * @notice Verifies if a prescription ID exists and matches the expected prescription hash
     * @param prescriptionId Unique prescription identifier hash
     * @param expectedPrescriptionHash Expected deterministic SHA-256 hash
     * @return isValid True if prescription exists and stored hash matches expected hash
     * @return doctorHash Hash identifier of prescribing doctor
     * @return patientHash Hash identifier of patient
     * @return timestamp Registration block timestamp
     */
    function verifyPrescription(bytes32 prescriptionId, bytes32 expectedPrescriptionHash)
        external
        view
        returns (
            bool isValid,
            bytes32 doctorHash,
            bytes32 patientHash,
            uint256 timestamp
        )
    {
        PrescriptionEntry memory p = prescriptions[prescriptionId];
        if (!p.exists) {
            return (false, bytes32(0), bytes32(0), 0);
        }
        bool matches = (p.prescriptionHash == expectedPrescriptionHash);
        return (matches, p.doctorHash, p.patientHash, p.timestamp);
    }

    // =========================================================================
    // 4. CONSENT MANAGEMENT FUNCTIONS
    // =========================================================================

    /**
     * @notice Records or updates patient consent for a doctor to access a medical record
     * @param patientHash Hash identifier of patient
     * @param doctorHash Hash identifier of doctor
     * @param recordHash Hash identifier of record
     * @param action Consent action: GRANTED or REVOKED
     */
    function updateConsent(
        bytes32 patientHash,
        bytes32 doctorHash,
        bytes32 recordHash,
        ConsentAction action
    ) external onlyOwner {
        require(patientHash != bytes32(0), "HealthBridgeRegistry: invalid patientHash");
        require(doctorHash != bytes32(0), "HealthBridgeRegistry: invalid doctorHash");
        require(recordHash != bytes32(0), "HealthBridgeRegistry: invalid recordHash");

        bytes32 consentKey = keccak256(abi.encodePacked(patientHash, doctorHash, recordHash));

        consentRegistry[consentKey] = ConsentRecord({
            action: action,
            timestamp: block.timestamp,
            exists: true
        });

        emit ConsentUpdated(patientHash, doctorHash, recordHash, action, block.timestamp);
    }

    /**
     * @notice Retrieves consent status for a patient-doctor-record triplet
     * @param patientHash Hash identifier of patient
     * @param doctorHash Hash identifier of doctor
     * @param recordHash Hash identifier of record
     * @return action ConsentAction enum (GRANTED or REVOKED)
     * @return timestamp Block timestamp of last consent state change
     * @return exists Boolean flag indicating whether consent has been recorded
     */
    function getConsent(
        bytes32 patientHash,
        bytes32 doctorHash,
        bytes32 recordHash
    )
        external
        view
        returns (
            ConsentAction action,
            uint256 timestamp,
            bool exists
        )
    {
        bytes32 consentKey = keccak256(abi.encodePacked(patientHash, doctorHash, recordHash));
        ConsentRecord memory c = consentRegistry[consentKey];
        return (c.action, c.timestamp, c.exists);
    }

    /**
     * @notice Verifies if active access consent is GRANTED for a patient-doctor-record triplet
     * @param patientHash Hash identifier of patient
     * @param doctorHash Hash identifier of doctor
     * @param recordHash Hash identifier of record
     * @return isGranted True if consent record exists and action is GRANTED
     * @return timestamp Timestamp of last consent update
     */
    function verifyConsent(
        bytes32 patientHash,
        bytes32 doctorHash,
        bytes32 recordHash
    ) external view returns (bool isGranted, uint256 timestamp) {
        bytes32 consentKey = keccak256(abi.encodePacked(patientHash, doctorHash, recordHash));
        ConsentRecord memory c = consentRegistry[consentKey];
        if (!c.exists) {
            return (false, 0);
        }
        return (c.action == ConsentAction.GRANTED, c.timestamp);
    }
}
