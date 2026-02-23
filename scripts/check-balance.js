// scripts/check-balance.js
const hre = require("hardhat");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(signer.address);

    console.log("\n💰 Wallet Balance Check");
    console.log("├─ Network:", hre.network.name);
    console.log("├─ Address:", signer.address);
    console.log("└─ Balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance === 0n && hre.network.name !== "localhost") {
        console.log("⚠️  You need test ETH!");
        console.log("Get free test ETH from: https://sepoliafaucet.com/\n");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
