const { ethers } = require("ethers");
const envConfig = require("../config/env");

/**
 * Human-readable ABI definition for HealthBridgeRegistry smart contract
 */
const HEALTHBRIDGE_REGISTRY_ABI = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
    "function registerDoctor(bytes32 doctorHash, bytes32 registrationHash, uint8 status)",
    "function updateDoctorStatus(bytes32 doctorHash, uint8 status)",
    "function getDoctor(bytes32 doctorHash) view returns (bytes32 registrationHash, uint256 timestamp, uint8 status, bool exists)",
    "function verifyDoctor(bytes32 doctorHash, bytes32 expectedRegistrationHash) view returns (bool isVerified, uint8 status)",
    "function registerMedicalRecord(bytes32 recordId, bytes32 recordHash)",
    "function getMedicalRecord(bytes32 recordId) view returns (bytes32 recordHash, uint256 timestamp, bool exists)",
    "function verifyMedicalRecord(bytes32 recordId, bytes32 expectedRecordHash) view returns (bool isValid, uint256 timestamp)",
    "function registerPrescription(bytes32 prescriptionId, bytes32 prescriptionHash, bytes32 doctorHash, bytes32 patientHash)",
    "function getPrescription(bytes32 prescriptionId) view returns (bytes32 prescriptionHash, bytes32 doctorHash, bytes32 patientHash, uint256 timestamp, bool exists)",
    "function verifyPrescription(bytes32 prescriptionId, bytes32 expectedPrescriptionHash) view returns (bool isValid, bytes32 doctorHash, bytes32 patientHash, uint256 timestamp)",
    "function updateConsent(bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash, uint8 action)",
    "function getConsent(bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash) view returns (uint8 action, uint256 timestamp, bool exists)",
    "function verifyConsent(bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash) view returns (bool isGranted, uint256 timestamp)",
    "event DoctorStatusUpdated(bytes32 indexed doctorHash, bytes32 registrationHash, uint8 status, uint256 timestamp)",
    "event MedicalRecordRegistered(bytes32 indexed recordId, bytes32 recordHash, uint256 timestamp)",
    "event PrescriptionRegistered(bytes32 indexed prescriptionId, bytes32 prescriptionHash, bytes32 indexed doctorHash, bytes32 indexed patientHash, uint256 timestamp)",
    "event ConsentUpdated(bytes32 indexed patientHash, bytes32 indexed doctorHash, bytes32 indexed recordHash, uint8 action, uint256 timestamp)",
];

/**
 * Utility helper to convert string, hex, or ObjectId into a standard bytes32 format
 */
const toBytes32 = (input) => {
    if (!input) return ethers.ZeroHash;
    if (typeof input === "string" && input.startsWith("0x") && input.length === 66) {
        return input.toLowerCase();
    }
    if (typeof input === "string" && /^[0-9a-fA-F]{64}$/.test(input)) {
        return `0x${input.toLowerCase()}`;
    }
    return ethers.keccak256(ethers.toUtf8Bytes(String(input)));
};

/**
 * Instantiates JsonRpcProvider for connecting to Ethereum RPC endpoint
 */
const getProvider = () => {
    const rpcUrl = envConfig.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    return new ethers.JsonRpcProvider(rpcUrl);
};

/**
 * Instantiates Wallet signer using backend private key (NEVER sent to client)
 */
const getWallet = () => {
    const privateKey = envConfig.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("BLOCKCHAIN_PRIVATE_KEY is not defined in environment variables.");
    }
    const provider = getProvider();
    return new ethers.Wallet(privateKey, provider);
};

/**
 * Instantiates HealthBridgeRegistry contract instance
 * @param {boolean} readOnly - If true, connects via provider; if false, connects via wallet signer for transactions
 */
const getContract = (readOnly = false) => {
    const contractAddress = envConfig.HEALTHBRIDGE_CONTRACT_ADDRESS;
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
        throw new Error("HEALTHBRIDGE_CONTRACT_ADDRESS is missing or invalid in environment configuration.");
    }

    if (readOnly) {
        const provider = getProvider();
        return new ethers.Contract(contractAddress, HEALTHBRIDGE_REGISTRY_ABI, provider);
    } else {
        const wallet = getWallet();
        return new ethers.Contract(contractAddress, HEALTHBRIDGE_REGISTRY_ABI, wallet);
    }
};

module.exports = {
    HEALTHBRIDGE_REGISTRY_ABI,
    toBytes32,
    getProvider,
    getWallet,
    getContract,
};
