# 🚀 QUICK START GUIDE - Environment Setup & Running

## 📋 STEP 1: Install Blockchain Dependencies

```bash
# Install Hardhat and blockchain tools
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Install Ethers.js for blockchain integration
npm install ethers@^6.9.0
```

---

## 📋 STEP 2: Setup Environment File

```bash
# Copy the example file
cp .env.example .env
```

**Edit `.env` file** with your settings:

```env
# ============================================================
# EXISTING ENV VARIABLES (keep your current ones)
# ============================================================
PORT=5001
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
# ... (all your existing variables)

# ============================================================
# NEW: BLOCKCHAIN CONFIGURATION (Add these)
# ============================================================

# Choose: 'localhost' or 'sepolia' or 'disabled'
BLOCKCHAIN_NETWORK=localhost

# For Sepolia testnet (optional - only if using Sepolia)
ALCHEMY_API_KEY=your_alchemy_api_key_here
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Contract address (will be set after deployment)
CONTRACT_ADDRESS=

# ============================================================
# USE JSON-BASED BLOCKCHAIN? (if you want old behavior)
# ============================================================
USE_JSON_BLOCKCHAIN=false    # Set to 'true' to use old JSON files
```

---

## 📋 STEP 3: Compile Smart Contract

```bash
# Compile the Solidity contract
npx hardhat compile
```

**Expected output:**

```
Compiled 1 Solidity file successfully
```

---

## 🎯 RUNNING YOUR APP - TWO OPTIONS

### **OPTION A: Backend Only (Simple - Uses Old JSON Storage)** ⭐ EASIEST

If you want to run your backend **exactly as before** (using JSON files):

```bash
# Just run your backend normally
npm run dev
```

**That's it!** Your app runs on http://localhost:5001

**Note**: This uses the old JSON-based blockchain (no smart contract needed)

---

### **OPTION B: Backend + Real Blockchain (Professional Setup)** 🚀

If you want to use the **real smart contract blockchain**:

#### **Terminal 1: Start Local Blockchain**

```bash
# Start Hardhat local blockchain (keep this running!)
npx hardhat node
```

**Expected output:**

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts:
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**⚠️ KEEP THIS TERMINAL RUNNING!** Don't close it.

#### **Terminal 2: Deploy Smart Contract**

```bash
# Deploy the contract to local blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**Expected output:**

```
✅ Contract Deployed Successfully!
├─ Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**📝 COPY THE CONTRACT ADDRESS!** You'll need it.

#### **Update .env file:**

```bash
# Edit .env and add the contract address
nano .env
```

Add this line:

```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
USE_JSON_BLOCKCHAIN=false
```

#### **Terminal 3: Start Your Backend**

```bash
# Run your backend with blockchain enabled
npm run dev
```

**Expected output:**

```
🔗 Connecting to localhost blockchain...
✅ Connected to blockchain
├─ Network: localhost
├─ Contract: 0x5FbDB...
└─ Chain Length: 1

VoteGuard Server running on port 5001
```

---

## 🌐 OPTION C: Using Sepolia Testnet (Public Blockchain)

**Prerequisites:**

1. Get Alchemy API key: https://www.alchemy.com/
2. Get MetaMask wallet: https://metamask.io/
3. Get free test ETH: https://sepoliafaucet.com/

**Setup `.env`:**

```env
BLOCKCHAIN_NETWORK=sepolia
ALCHEMY_API_KEY=your_actual_alchemy_api_key
SEPOLIA_PRIVATE_KEY=0xYour_MetaMask_Private_Key
USE_JSON_BLOCKCHAIN=false
```

**Deploy to Sepolia:**

```bash
# Check balance first
npx hardhat run scripts/check-balance.js --network sepolia

# Deploy (takes 2-3 minutes)
npx hardhat run scripts/deploy.js --network sepolia
```

**Copy the contract address to `.env`, then:**

```bash
# Run your backend
npm run dev
```

**No need for local blockchain node!** Connects directly to Sepolia.

---

## 📊 Quick Comparison

| Method                  | Terminals Needed | Setup Time | Cost   | Best For      |
| ----------------------- | ---------------- | ---------- | ------ | ------------- |
| **Option A** (JSON)     | 1                | 0 min      | FREE   | Quick testing |
| **Option B** (Local BC) | 3                | 5 min      | FREE   | Development   |
| **Option C** (Sepolia)  | 1                | 15 min     | FREE\* | Testing/Demo  |

\*Uses free test ETH

---

## 🎓 RECOMMENDED WORKFLOW

### **For Development (First Time):**

```bash
# 1. Use Option A (JSON-based) first
npm run dev

# 2. Test your app, make sure everything works
# 3. When ready, switch to Option B (Local blockchain)
```

### **For Professional Demo:**

```bash
# Use Option C (Sepolia testnet)
# Shows real blockchain on public network!
```

---

## ✅ FINAL COMMANDS SUMMARY

### **Simplest (No blockchain setup):**

```bash
npm run dev
```

### **Local Blockchain (3 terminals):**

```bash
# Terminal 1
npx hardhat node

# Terminal 2 (run once)
npx hardhat run scripts/deploy.js --network localhost
# Copy contract address to .env

# Terminal 3
npm run dev
```

### **Sepolia Testnet (1 terminal):**

```bash
# Setup (run once)
npx hardhat run scripts/deploy.js --network sepolia
# Copy contract address to .env

# Then just
npm run dev
```

---

## 🐛 Troubleshooting

### "Cannot find module 'hardhat'"

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### "Contract not compiled"

```bash
npx hardhat compile
```

### "Connection to blockchain failed"

Check:

1. Is `.env` file configured?
2. Is `CONTRACT_ADDRESS` set?
3. For localhost: Is `npx hardhat node` running?
4. For Sepolia: Is `ALCHEMY_API_KEY` correct?

### "Port 5001 already in use"

```bash
# Kill the process
lsof -ti:5001 | xargs kill -9

# Or change port in .env
PORT=5002
```

---

## 🎉 That's It!

**Most Common Usage:**

```bash
# Just run your backend as always
npm run dev
```

Your app will work with JSON-based blockchain by default.

**Want to enable real blockchain?** Follow Option B or C above!

---

**Need more help?** See:

- Full guide: [BLOCKCHAIN_MIGRATION_GUIDE.md](BLOCKCHAIN_MIGRATION_GUIDE.md)
- Quick reference: [BLOCKCHAIN_QUICK_REFERENCE.md](BLOCKCHAIN_QUICK_REFERENCE.md)
