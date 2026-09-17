const hre = require("hardhat");

async function main() {
    console.log("Starting deployment of HealthBridgeRegistry smart contract...");

    const [deployer] = await hre.ethers.getSigners();
    if (!deployer) {
        throw new Error("No deployer account found. Check BLOCKCHAIN_PRIVATE_KEY in your server/.env file.");
    }

    console.log("Deployer Address:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer Balance:", hre.ethers.formatEther(balance), "ETH");

    console.log("\nDeploying HealthBridgeRegistry contract...");
    const HealthBridgeRegistry = await hre.ethers.getContractFactory("HealthBridgeRegistry");
    const contract = await HealthBridgeRegistry.deploy();

    console.log("Waiting for deployment transaction to be mined...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    console.log("\n=======================================================================");
    console.log(" SUCCESS: HealthBridgeRegistry Smart Contract Deployed!");
    console.log("=======================================================================");
    console.log(" Contract Address :", contractAddress);
    console.log(" Transaction Hash :", deploymentTx ? deploymentTx.hash : "N/A");
    console.log(" Network          :", hre.network.name);
    console.log("=======================================================================");
    console.log("\nUpdate the following field in server/.env:");
    console.log(`HEALTHBRIDGE_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("=======================================================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n[DEPLOYMENT FAILED]:", error);
        process.exit(1);
    });
