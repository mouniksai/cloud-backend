# 📦 Package.json Updates for Blockchain

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "blockchain:compile": "hardhat compile",
    "blockchain:test": "hardhat test",
    "blockchain:node": "hardhat node",
    "blockchain:deploy:local": "hardhat run scripts/deploy.js --network localhost",
    "blockchain:deploy:sepolia": "hardhat run scripts/deploy.js --network sepolia",
    "blockchain:interact:local": "hardhat run scripts/interact.js --network localhost",
    "blockchain:interact:sepolia": "hardhat run scripts/interact.js --network sepolia",
    "blockchain:check-balance": "hardhat run scripts/check-balance.js --network sepolia",
    "blockchain:clean": "hardhat clean"
  }
}
```

## Usage

```bash
# Development workflow
npm run blockchain:compile        # Compile contracts
npm run blockchain:test          # Run tests
npm run blockchain:node          # Start local blockchain (keep running)
npm run blockchain:deploy:local  # Deploy to localhost

# Testnet deployment
npm run blockchain:check-balance      # Check your Sepolia balance
npm run blockchain:deploy:sepolia    # Deploy to Sepolia
npm run blockchain:interact:sepolia  # Test on Sepolia

# Maintenance
npm run blockchain:clean         # Clean cache and artifacts
```

## Dependencies Required

Run this command to install all necessary packages:

```bash
npm install --save-dev hardhat@^2.19.0 \
  @nomicfoundation/hardhat-toolbox@^4.0.0 \
  @nomicfoundation/hardhat-network-helpers@^1.0.0 \
  @nomicfoundation/hardhat-chai-matchers@^2.0.0 \
  @nomicfoundation/hardhat-ethers@^3.0.0 \
  @nomicfoundation/hardhat-verify@^2.0.0 \
  @typechain/hardhat@^9.0.0 \
  chai@^4.2.0

npm install ethers@^6.9.0 dotenv@^16.3.1
```

Or simply run:

```bash
npm install
```

After adding these to `package.json`.
