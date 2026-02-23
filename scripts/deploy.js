// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy VoteGuardBlockchain Smart Contract
 * 
 * USAGE:
 * - Local: npx hardhat run scripts/deploy.js --network localhost
 * - Sepolia: npx hardhat run scripts/deploy.js --network sepolia
 */
async function main() {
    console.log("\n🚀 Starting VoteGuard Blockchain Deployment...\n");

    // Get network info
    const network = hre.network.name;
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);

    console.log("📊 Deployment Info:");
    console.log("├─ Network:", network);
    console.log("├─ Deployer:", deployer.address);
    console.log("└─ Balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        console.error("❌ Error: Deployer has 0 ETH balance!");
        if (network === "sepolia") {
            console.log("\n💡 Get test ETH from: https://sepoliafaucet.com/");
        }
        process.exit(1);
    }

    // Deploy contract
    console.log("📝 Deploying VoteGuardBlockchain contract...");
    const VoteGuardBlockchain = await hre.ethers.getContractFactory("VoteGuardBlockchain");
    const contract = await VoteGuardBlockchain.deploy();

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ Contract Deployed Successfully!");
    console.log("├─ Address:", contractAddress);
    console.log("├─ Owner:", await contract.owner());
    console.log("└─ Chain Length:", await contract.chainLength());

    // Save deployment info
    const deploymentInfo = {
        network: network,
        contractAddress: contractAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(deploymentsDir, `${network}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n💾 Deployment info saved to:", deploymentFile);

    // Update .env file with contract address
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("CONTRACT_ADDRESS=")) {
            envContent = envContent.replace(
                /CONTRACT_ADDRESS=.*/,
                `CONTRACT_ADDRESS=${contractAddress}`
            );
        } else {
            envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        console.log("✅ .env file updated with CONTRACT_ADDRESS");
    }

    // Verify on Etherscan (Sepolia only)
    if (network === "sepolia" && process.env.ETHERSCAN_API_KEY) {
        console.log("\n🔍 Waiting 1 minute before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000));

        try {
            console.log("📝 Verifying contract on Etherscan...");
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [],
            });
            console.log("✅ Contract verified on Etherscan!");
        } catch (error) {
            console.log("⚠️  Verification failed:", error.message);
        }
    }

    // Display next steps
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 Next Steps:");
    console.log("1. Copy this contract address:", contractAddress);
    console.log("2. Update your .env file: CONTRACT_ADDRESS=" + contractAddress);
    console.log("3. Test the contract: npx hardhat test");
    console.log("4. Start using in your app with the integration service\n");

    if (network === "sepolia") {
        console.log("🔗 View on Etherscan:");
        console.log(`   https://sepolia.etherscan.io/address/${contractAddress}\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
