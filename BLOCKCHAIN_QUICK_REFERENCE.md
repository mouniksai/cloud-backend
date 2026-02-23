# VoteGuard Blockchain - Quick Reference

## 🚀 Quick Start Commands

### First Time Setup

```bash
# 1. Install dependencies
npm install
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers@^6.9.0 dotenv

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Compile contract
npx hardhat compile

# 4. Run tests
npx hardhat test
```

### Local Development (Free & Instant)

```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Test contract
npx hardhat run scripts/interact.js --network localhost
```

### Sepolia Testnet (Public Blockchain)

```bash
# 1. Get test ETH from: https://sepoliafaucet.com/

# 2. Check balance
npx hardhat run scripts/check-balance.js --network sepolia

# 3. Deploy
npx hardhat run scripts/deploy.js --network sepolia

# 4. Interact
npx hardhat run scripts/interact.js --network sepolia
```

## 📁 File Structure

```
vote-guard-server/
├── contracts/                      # Solidity smart contracts
│   └── VoteGuardBlockchain.sol    # Main contract
├── scripts/                        # Deployment & interaction scripts
│   ├── deploy.js                  # Deploy contract
│   ├── interact.js                # Test interactions
│   └── check-balance.js           # Check wallet balance
├── blockchain-tests/               # Contract tests
│   └── VoteGuardBlockchain.test.js
├── src/
│   └── blockchain/
│       ├── blockchainService.js   # OLD: JSON-based (keep as backup)
│       └── blockchainServiceV2.js # NEW: Smart contract-based
├── hardhat.config.js              # Hardhat configuration
├── .env.example                   # Environment template
├── .env                           # Your secrets (DO NOT COMMIT!)
└── BLOCKCHAIN_MIGRATION_GUIDE.md  # Full documentation
```

## 🔄 Migration Steps

### Step 1: Test Locally

```javascript
// In your server.js or app.js
const blockchainService = require("./src/blockchain/blockchainServiceV2");

// Initialize before starting server
await blockchainService.initialize();
```

### Step 2: Update Controllers

```javascript
// OLD
// const blockchainService = require('../blockchain/blockchainService');

// NEW (same API!)
const blockchainService = require("../blockchain/blockchainServiceV2");

// Usage remains identical:
const elections = await blockchainService.getElections();
await blockchainService.addElection(data);
await blockchainService.castVote(voteData);
```

### Step 3: Environment Variables

```env
# .env file
BLOCKCHAIN_NETWORK=localhost        # or 'sepolia'
ALCHEMY_API_KEY=your_key_here
SEPOLIA_PRIVATE_KEY=0xYour_key
CONTRACT_ADDRESS=0x1234...          # Set after deployment
```

## 🧪 Testing Checklist

- [ ] Local tests pass: `npx hardhat test`
- [ ] Deploy locally: `npx hardhat run scripts/deploy.js --network localhost`
- [ ] Test locally: `npx hardhat run scripts/interact.js --network localhost`
- [ ] Deploy to Sepolia: `npx hardhat run scripts/deploy.js --network sepolia`
- [ ] Test on Sepolia: `npx hardhat run scripts/interact.js --network sepolia`
- [ ] Integration with app works
- [ ] All API endpoints tested

## 💰 Cost Estimates

| Network              | Deployment      | Per Transaction | Speed   |
| -------------------- | --------------- | --------------- | ------- |
| **Localhost**        | FREE            | FREE            | Instant |
| **Sepolia**          | FREE (test ETH) | FREE (test ETH) | 12-15s  |
| **Ethereum Mainnet** | $50-200         | $2-10           | 12-15s  |
| **Polygon**          | $0.01-0.10      | $0.001-0.01     | 2-3s    |

## 🔧 Troubleshooting

### Contract not found

```bash
npx hardhat compile
```

### Connection failed

```bash
# Check .env file
cat .env | grep BLOCKCHAIN_NETWORK

# For localhost: Make sure hardhat node is running
npx hardhat node
```

### Insufficient funds

```bash
# Get test ETH from faucet
# https://sepoliafaucet.com/

# Check balance
npx hardhat run scripts/check-balance.js --network sepolia
```

### Transaction failed

- Ensure dates are in future (for elections)
- Check election status is LIVE (for voting)
- Verify no double voting

## 📚 Key Differences: JSON vs Blockchain

| Feature      | JSON (Old)       | Smart Contract (New)       |
| ------------ | ---------------- | -------------------------- |
| Storage      | Local file       | Blockchain                 |
| Access       | `fs.readFile()`  | `contract.getElection()`   |
| Write        | `fs.writeFile()` | `contract.addElection()`   |
| Speed        | Instant          | 1-15 seconds               |
| Cost         | Free             | Gas fees (free on testnet) |
| Immutability | No               | Yes                        |
| Public Audit | No               | Yes                        |

## 🎯 API Compatibility

The new service maintains **100% API compatibility**:

```javascript
// All these work exactly the same:
addElection(data);
getElections(filter);
getElection(id);
updateElectionStatus(id, status);
addCandidate(data);
getCandidatesByElection(electionId);
castVote(data);
verifyVote(receiptHash);
getVotesByUser(userId);
getVotesByElection(electionId);
addAuditLog(data);
getStats();
```

**Only difference**: All operations are now:

- ✅ Immutable
- ✅ Verifiable on blockchain
- ✅ Transparent
- ⏱️ Slightly slower (blockchain confirmation time)

## 📖 Full Documentation

For complete step-by-step guide, see:
**[BLOCKCHAIN_MIGRATION_GUIDE.md](BLOCKCHAIN_MIGRATION_GUIDE.md)**

## 🆘 Get Help

1. Read the full guide: `BLOCKCHAIN_MIGRATION_GUIDE.md`
2. Check Hardhat docs: https://hardhat.org/docs
3. Check Ethers.js docs: https://docs.ethers.org/
4. Free blockchain courses: https://university.alchemy.com/

---

**Need to revert to JSON?** Just change the import back to `blockchainService.js` - the old code is still there!
