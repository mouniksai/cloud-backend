// scripts/interact.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Interactive script to test contract functions
 * 
 * USAGE: npx hardhat run scripts/interact.js --network localhost
 */
async function main() {
    console.log("\n🔧 VoteGuard Blockchain - Interactive Testing\n");

    // Load deployment info
    const network = hre.network.name;
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ No deployment found for network:", network);
        console.log("💡 Run: npx hardhat run scripts/deploy.js --network", network);
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const contractAddress = deployment.contractAddress;

    console.log("📊 Network:", network);
    console.log("📝 Contract:", contractAddress);

    // Get contract instance
    const VoteGuardBlockchain = await hre.ethers.getContractFactory("VoteGuardBlockchain");
    const contract = VoteGuardBlockchain.attach(contractAddress);

    // Get current stats
    console.log("\n📈 Current Blockchain Stats:");
    const [chainLength, totalTx, difficulty] = await contract.getChainStats();
    console.log("├─ Chain Length:", chainLength.toString());
    console.log("├─ Total Transactions:", totalTx.toString());
    console.log("└─ Difficulty:", difficulty);

    // Example: Add an election
    console.log("\n🗳️  Adding Test Election...");

    const electionId = hre.ethers.id("test-election-" + Date.now());
    const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const endTime = startTime + 86400; // 24 hours later

    try {
        const tx = await contract.addElection(
            electionId,
            "Test Presidential Election 2026",
            "A test election for demonstration",
            "National",
            startTime,
            endTime
        );

        console.log("⏳ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed! Block:", receipt.blockNumber);

        // Get the election back
        const election = await contract.getElection(electionId);
        console.log("\n📋 Election Created:");
        console.log("├─ ID:", electionId);
        console.log("├─ Title:", election.title);
        console.log("├─ Status:", ["UPCOMING", "LIVE", "ENDED", "CANCELLED"][election.status]);
        console.log("└─ Constituency:", election.constituency);

        // Add a candidate
        console.log("\n👤 Adding Test Candidate...");
        const candidateId = hre.ethers.id("test-candidate-" + Date.now());

        const candidateTx = await contract.addCandidate(
            candidateId,
            "John Doe",
            "Democratic Party",
            "🦅",
            45,
            "PhD in Political Science",
            "15 years in public service",
            electionId
        );

        await candidateTx.wait();
        console.log("✅ Candidate added!");

        const candidate = await contract.getCandidate(candidateId);
        console.log("├─ Name:", candidate.name);
        console.log("├─ Party:", candidate.party);
        console.log("└─ Age:", candidate.age);

        // Get updated stats
        console.log("\n📈 Updated Stats:");
        const [newChainLength, newTotalTx] = await contract.getChainStats();
        console.log("├─ Chain Length:", newChainLength.toString());
        console.log("└─ Total Transactions:", newTotalTx.toString());

        console.log("\n✅ Test completed successfully!");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
