const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load compiled contract artifact from Hardhat build folder
const artifactPath1 = path.join(__dirname, "../artifacts/blockchain/contracts/HealthBridgeRegistry.sol/HealthBridgeRegistry.json");
const artifactPath2 = path.join(__dirname, "../artifacts/contracts/HealthBridgeRegistry.sol/HealthBridgeRegistry.json");
const artifactPath = fs.existsSync(artifactPath1) ? artifactPath1 : artifactPath2;

async function testBlockchainServiceIndependently() {
    console.log("--------------------------------------------------");
    console.log("Testing Express Blockchain Service Independently...");
    console.log("--------------------------------------------------");

    if (!fs.existsSync(artifactPath)) {
        console.error("Artifact file not found at:", artifactPath);
        console.error("Please run `npx hardhat compile` first.");
        process.exit(1);
    }

    const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // 1. Setup local Hardhat / ethers provider & deployer wallet
    // We create a local Hardhat network provider inside the node process using Hardhat's default mnemonic / private key
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    // Use Hardhat Account #0 default private key
    const deployerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(deployerPrivateKey, provider);

    console.log("1. Deployer wallet address:", wallet.address);

    // 2. Deploy HealthBridgeRegistry contract to local network
    const factory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, wallet);
    console.log("2. Deploying HealthBridgeRegistry contract...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log("✓ Contract deployed at address:", contractAddress);

    // 3. Inject temporary environment variables for test
    process.env.BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545";
    process.env.BLOCKCHAIN_PRIVATE_KEY = deployerPrivateKey;
    process.env.HEALTHBRIDGE_CONTRACT_ADDRESS = contractAddress;

    // Dynamically require blockchainService now that env vars are injected
    const blockchainService = require("./blockchain/blockchainService");

    console.log("\n--- Testing Function 1: verifyDoctorOnChain ---");
    const docHash = "DOCTOR_12345";
    const regHash = "REG_NUMBER_9999";
    const docRes = await blockchainService.verifyDoctorOnChain(docHash, regHash, "VERIFIED");
    console.log("verifyDoctorOnChain result:", docRes);
    if (!docRes.success || !docRes.transactionHash) throw new Error("verifyDoctorOnChain failed");

    console.log("\n--- Testing Function 2: storeMedicalRecordHashOnChain ---");
    const recId = "REC_998877";
    const recHash = "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678";
    const recRes = await blockchainService.storeMedicalRecordHashOnChain(recId, recHash);
    console.log("storeMedicalRecordHashOnChain result:", recRes);
    if (!recRes.success || !recRes.transactionHash) throw new Error("storeMedicalRecordHashOnChain failed");

    console.log("\n--- Testing Function 3: storePrescriptionHashOnChain ---");
    const rxId = "RX_554433";
    const rxHash = "f9e8d7c6b5a40192837465564738291001928374655647382910019283746556";
    const rxRes = await blockchainService.storePrescriptionHashOnChain(rxId, rxHash, docHash, "PATIENT_77");
    console.log("storePrescriptionHashOnChain result:", rxRes);
    if (!rxRes.success || !rxRes.transactionHash) throw new Error("storePrescriptionHashOnChain failed");

    console.log("\n--- Testing Function 4: grantRecordAccessOnChain ---");
    const grantRes = await blockchainService.grantRecordAccessOnChain("PATIENT_77", docHash, recId);
    console.log("grantRecordAccessOnChain result:", grantRes);
    if (!grantRes.success || !grantRes.transactionHash) throw new Error("grantRecordAccessOnChain failed");

    console.log("\n--- Testing Function 5: revokeRecordAccessOnChain ---");
    const revokeRes = await blockchainService.revokeRecordAccessOnChain("PATIENT_77", docHash, recId);
    console.log("revokeRecordAccessOnChain result:", revokeRes);
    if (!revokeRes.success || !revokeRes.transactionHash) throw new Error("revokeRecordAccessOnChain failed");

    console.log("\n--- Testing Function 6: verifyHashOnChain ---");
    const docVer = await blockchainService.verifyHashOnChain("DOCTOR", docHash, regHash);
    console.log("verifyHashOnChain (DOCTOR):", docVer);
    if (!docVer.isVerified) throw new Error("verifyHashOnChain (DOCTOR) failed");

    const recVer = await blockchainService.verifyHashOnChain("MEDICAL_RECORD", recId, recHash);
    console.log("verifyHashOnChain (MEDICAL_RECORD):", recVer);
    if (!recVer.isVerified) throw new Error("verifyHashOnChain (MEDICAL_RECORD) failed");

    const rxVer = await blockchainService.verifyHashOnChain("PRESCRIPTION", rxId, rxHash);
    console.log("verifyHashOnChain (PRESCRIPTION):", rxVer);
    if (!rxVer.isVerified) throw new Error("verifyHashOnChain (PRESCRIPTION) failed");

    console.log("\n--------------------------------------------------");
    console.log("✓ ALL 6 BLOCKCHAIN SERVICE FUNCTIONS TESTED SUCCESSFULLY!");
    console.log("--------------------------------------------------");
}

// Execute standalone test if Hardhat node is running, or demonstrate unit test execution
if (require.main === module) {
    testBlockchainServiceIndependently().catch((err) => {
        console.error("Standalone test error:", err.message);
    });
}

module.exports = testBlockchainServiceIndependently;
