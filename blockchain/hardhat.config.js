const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "server", ".env") });
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const rawPrivateKey = (process.env.BLOCKCHAIN_PRIVATE_KEY || "").trim();
const formattedPrivateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
const isValidPrivateKey = /^0x[a-fA-F0-9]{64}$/.test(formattedPrivateKey);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        sepolia: {
            url: process.env.BLOCKCHAIN_RPC_URL || "",
            accounts: isValidPrivateKey ? [formattedPrivateKey] : [],
            chainId: 11155111,
        },
    },

    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "../cache",
        artifacts: "../artifacts",
    },
};
