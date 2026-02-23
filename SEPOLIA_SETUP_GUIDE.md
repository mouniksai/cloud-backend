# 🚀 Phase 2: Sepolia Testnet Deployment Guide (2026 Edition)

## Complete Environment Setup for Production-Ready Blockchain Integration

---

## 📋 Required Environment Variables

### Backend (.env in vote-guard-server/)

```bash
# ============================================================================
# REQUIRED - Blockchain Network Configuration
# ============================================================================
BLOCKCHAIN_NETWORK=sepolia
CONTRACT_ADDRESS=          # Auto-filled after deployment

# ============================================================================
# REQUIRED - Alchemy RPC Provider (FREE)
# ============================================================================
ALCHEMY_API_KEY=          # See Step 1 below

# ============================================================================
# REQUIRED - Wallet Private Key (CRITICAL SECURITY)
# ============================================================================
SEPOLIA_PRIVATE_KEY=      # See Step 2 below

# ============================================================================
# OPTIONAL - Contract Verification
# ============================================================================
ETHERSCAN_API_KEY=        # See Step 3 below (recommended)
```

### Frontend (.env.local in app/)

```bash
# ============================================================================
# REQUIRED - Contract Address
# ============================================================================
NEXT_PUBLIC_CONTRACT_ADDRESS=    # Copy from deploy output

# ============================================================================
# OPTIONAL - Public Alchemy Key (for reads without MetaMask)
# ============================================================================
NEXT_PUBLIC_ALCHEMY_API_KEY=     # Can be same as backend key
```

---

## 🔑 Step-by-Step: Getting All Required Keys

### Step 1: Get Alchemy API Key (FREE - 5 minutes)

**Alchemy is your connection to Ethereum. Think of it as WiFi for blockchain.**

1. **Sign Up**
   - Go to: https://dashboard.alchemy.com/signup
   - Use Google/GitHub or email
   - Confirm email if needed

2. **Create App**
   - Click "+ Create new app"
   - Name: `VoteGuard`
   - Description: `Voting system on Sepolia`
   - Chain: **Ethereum**
   - Network: **Sepolia** ⚠️ (NOT Mainnet!)
   - Click "Create app"

3. **Get API Key**
   - Click on your app name
   - Click "API Key" button
   - Copy the key (looks like: `abc123def456...`)
   - Paste into `.env` → `ALCHEMY_API_KEY=abc123def456...`

4. **Verify Free Tier**
   - Free tier includes: 300M compute units/month
   - More than enough for testing and small deployments
   - No credit card required

**✅ You should have:** `ALCHEMY_API_KEY=abc123def456...`

---

### Step 2: Get Wallet Private Key (CRITICAL - 10 minutes)

**⚠️ SECURITY WARNING: Use a TEST wallet only! Never use your main wallet!**

#### Option A: Create New MetaMask Wallet (Recommended)

1. **Install MetaMask**
   - Browser: https://metamask.io/download/
   - Install Chrome/Firefox/Brave extension
   - Click "Create a new wallet"

2. **Setup Wallet**
   - Create strong password
   - **CRITICAL**: Write down seed phrase on paper
   - Store seed phrase in safe place (NOT on computer!)
   - Confirm seed phrase
   - Wallet created ✅

3. **Switch to Sepolia Network**
   - Click network dropdown (top left)
   - ⚠️ If you don't see "Sepolia":
     - Click "Show/hide test networks"
     - Toggle ON "Show test networks"
     - Return to network dropdown
   - Select **"Sepolia test network"**

4. **Export Private Key**
   - Click account icon (top right)
   - Account Details
   - Click "Show private key"
   - Enter your password
   - Copy private key (starts with `0x`)
   - Paste into `.env` → `SEPOLIA_PRIVATE_KEY=0x...`

#### Option B: Use Existing MetaMask (Advanced)

If you already have MetaMask:

1. Create a NEW account (don't use existing!)
   - Account menu → "+ Add account"
   - Name: "VoteGuard Test"
2. Export its private key (same as above)
3. Only fund this account with Sepolia test ETH

**✅ You should have:** `SEPOLIA_PRIVATE_KEY=0xabc123...`

**🔒 Security Checklist:**

- [ ] Using a TEST wallet, not your main wallet
- [ ] Seed phrase written on paper (not digital)
- [ ] Private key only in `.env` file (not committed to git)
- [ ] `.env` is in `.gitignore`

---

### Step 3: Get Sepolia Test ETH (FREE - 2 minutes)

**You need test ETH to pay for transactions on Sepolia. It's FREE!**

#### Best Faucets for 2026:

1. **Alchemy Faucet** (Most Reliable - Recommended)
   - URL: https://www.alchemy.com/faucets/ethereum-sepolia
   - Login with your Alchemy account
   - Paste your MetaMask address
   - Amount: 0.5 SepoliaETH
   - Frequency: Once per day
   - ✅ Usually instant (1-2 minutes max)

2. **Sepolia PoW Faucet** (Backup Option)
   - URL: https://sepolia-faucet.pk910.de/
   - Proof-of-Work mining (runs in browser)
   - Amount: Variable (mine for ~5 minutes)
   - No account needed
   - Works when other faucets are rate-limited

3. **Infura Faucet** (Alternative)
   - URL: https://www.infura.io/faucet/sepolia
   - Create free Infura account
   - Amount: 0.5 SepoliaETH
   - Once per day

4. **QuickNode Faucet** (Community Option)
   - URL: https://faucet.quicknode.com/ethereum/sepolia
   - Connect Twitter/Discord
   - Amount: 0.1 SepoliaETH
   - Social verification required

#### How to Get Your Address:

1. Open MetaMask
2. Ensure you're on **Sepolia** network
3. Click your account name (top center)
4. Address is copied to clipboard
5. Paste into faucet website

#### Verify You Received ETH:

1. Check MetaMask balance (should show ~0.5 SepoliaETH)
2. Or check: https://sepolia.etherscan.io/address/YOUR_ADDRESS

**✅ You should have:** 0.5 SepoliaETH in your test wallet

**💡 How Much Do You Need?**

- Deploying contract: ~0.02 ETH ($0 in test ETH)
- Per vote transaction: ~0.0001 ETH ($0 in test ETH)
- 0.5 ETH = ~5,000 votes (more than enough!)

---

### Step 4: Get Etherscan API Key (OPTIONAL - 3 minutes)

**This lets you verify your contract source code on Etherscan (makes it readable)**

1. **Sign Up**
   - Go to: https://etherscan.io/register
   - Create free account
   - Confirm email

2. **Create API Key**
   - Login
   - Hover over username → "API Keys"
   - Click "+ Add" button
   - App Name: `VoteGuard`
   - Click "Create New API Key"
   - Copy the key

3. **Add to .env**
   - `ETHERSCAN_API_KEY=your_key_here`

**Benefits:**

- ✅ Contract source code visible on Etherscan
- ✅ Users can read your contract directly
- ✅ Increases trust and transparency
- ⚠️ Not required, but highly recommended

**✅ Optional but recommended:** `ETHERSCAN_API_KEY=...`

---

## 🔍 Verify Your Setup

### Check 1: Backend .env File

```bash
cd vote-guard-server
cat .env
```

Should show:

```
BLOCKCHAIN_NETWORK=sepolia
ALCHEMY_API_KEY=abc123...
SEPOLIA_PRIVATE_KEY=0xabc123...
ETHERSCAN_API_KEY=xyz789... (optional)
CONTRACT_ADDRESS= (empty before deploy)
```

### Check 2: Test Wallet Balance

```bash
cd vote-guard-server
npx hardhat run scripts/check-balance.js --network sepolia
```

Expected output:

```
💰 Wallet Balance Check
├─ Network: sepolia
├─ Address: 0xYourAddress...
└─ Balance: 0.5 ETH

✅ Balance is sufficient for deployment!
```

### Check 3: Test Alchemy Connection

```bash
curl "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Should return JSON with latest block number.

---

## 🚀 Deploy to Sepolia (The Big Moment!)

### Pre-Deployment Checklist

- [ ] `ALCHEMY_API_KEY` is set
- [ ] `SEPOLIA_PRIVATE_KEY` is set
- [ ] Wallet has ≥0.1 SepoliaETH
- [ ] On Sepolia network (not mainnet!)
- [ ] Contract compiles: `npx hardhat compile`

### Deploy Command

```bash
cd vote-guard-server
npx hardhat run scripts/deploy.js --network sepolia
```

### Expected Output (Success)

```
🚀 Starting VoteGuard Blockchain Deployment...

📊 Deployment Info:
├─ Network: sepolia
├─ Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
└─ Balance: 0.5 ETH

📝 Deploying VoteGuardBlockchain contract...

✅ Contract Deployed Successfully!
├─ Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
├─ Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
└─ Chain Length: 1

💾 Deployment info saved to: deployments/sepolia.json
✅ .env file updated with CONTRACT_ADDRESS

🔍 Waiting 1 minute before verification...
📝 Verifying contract on Etherscan...
✅ Contract verified on Etherscan!

============================================================
🎉 DEPLOYMENT COMPLETE!
============================================================

📋 Next Steps:
1. Copy this contract address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
2. Update your .env file: CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
3. Test the contract: npx hardhat test
4. Start using in your app with the integration service

🔗 View on Etherscan:
   https://sepolia.etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Troubleshooting Deployment Issues

| Error                     | Solution                                          |
| ------------------------- | ------------------------------------------------- |
| "Insufficient funds"      | Get more test ETH from faucet                     |
| "ALCHEMY_API_KEY not set" | Check `.env` file, no spaces around `=`           |
| "Network not found"       | Use `--network sepolia` (not `--network testnet`) |
| "Transaction failed"      | Check wallet has enough ETH, retry                |
| "Timeout waiting for tx"  | Network congestion, wait and retry                |

---

## 🎯 Post-Deployment: Configure Frontend

### Update Frontend Environment

```bash
cd app/
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS" > .env.local
echo "NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key" >> .env.local
```

### Verify Frontend Can Connect

Create test file: `app/test-connection.js`

```javascript
import { getBlockchainStats } from "./utils/blockchain";

async function test() {
  const stats = await getBlockchainStats();
  console.log("✅ Connected!", stats);
}

test();
```

Run: `node app/test-connection.js`

---

## 🔗 View Your Contract on Etherscan

After deployment, visit:

```
https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
```

**What You'll See:**

- ✅ Contract creation transaction
- ✅ All contract interactions (votes, elections, etc.)
- ✅ Source code (if verified)
- ✅ Read/write functions you can call directly

**Bookmark this page** - Users can verify votes here!

---

## 📱 User Setup Guide (For Your Voters)

Share this with users who will be voting:

### For Voters: How to Prepare (5 minutes)

1. **Install MetaMask**
   - https://metamask.io/download/
   - Create wallet (save seed phrase!)

2. **Switch to Sepolia**
   - Network dropdown → "Show test networks"
   - Select "Sepolia test network"

3. **Get Test ETH**
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - Request 0.1 ETH (enough for 1,000 votes)

4. **Ready to Vote!**
   - Visit your voting app
   - Click "Connect Wallet"
   - Approve connection in MetaMask
   - Cast vote (MetaMask prompts for approval)
   - View transaction on Etherscan

---

## 💡 Tips for 2026

### Recommended Workflow

1. **Development**: Use `localhost` (instant, free)

   ```bash
   npx hardhat node  # Terminal 1
   npx hardhat run scripts/deploy.js --network localhost  # Terminal 2
   ```

2. **Testing**: Deploy to Sepolia (free testnet)

   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. **Production**: When ready for real money
   - Consider Layer 2 (Polygon, Arbitrum) - 100x cheaper
   - Or Mainnet (expensive but most secure)

### Gas Optimization

Your contract is already optimized, but to save even more:

- Batch multiple operations when possible
- Vote during low-network-usage times (weekends)
- Consider using Layer 2 solutions

### Security Best Practices

- [ ] Use hardware wallet for mainnet (Ledger/Trezor)
- [ ] Never share private keys
- [ ] Test everything on Sepolia first
- [ ] Keep seed phrase offline (paper backup)
- [ ] Use multi-sig for production ownership

---

## 🆘 Support Resources

### Documentation

- **Hardhat**: https://hardhat.org/docs
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **MetaMask**: https://docs.metamask.io/
- **Alchemy**: https://docs.alchemy.com/

### Learning Resources

- **Alchemy University**: https://university.alchemy.com/ (FREE!)
- **CryptoZombies**: https://cryptozombies.io/ (Interactive Solidity)
- **Ethernaut**: https://ethernaut.openzeppelin.com/ (Security)

### Community Help

- **Hardhat Discord**: https://hardhat.org/discord
- **Stack Exchange**: https://ethereum.stackexchange.com/
- **Alchemy Discord**: Community support channel

---

## ✅ Final Verification Checklist

Before going live with real users:

- [ ] Contract deployed to Sepolia
- [ ] Contract verified on Etherscan
- [ ] Frontend `.env.local` configured
- [ ] Wallet connection working in frontend
- [ ] Can read elections from blockchain
- [ ] Can cast test vote successfully
- [ ] Transaction visible on Etherscan
- [ ] Users have test ETH
- [ ] Documentation shared with users

---

**🎉 Congratulations! You're now running on real blockchain infrastructure!**

**Next Steps:**

1. Test thoroughly with multiple users
2. Gather feedback on gas costs
3. Consider Layer 2 for lower fees
4. Plan mainnet migration strategy

**Your app is now:**

- ✅ Transparent (all votes on public blockchain)
- ✅ Immutable (votes can't be changed)
- ✅ Verifiable (anyone can audit on Etherscan)
- ✅ Decentralized (no single point of failure)

---

_Last Updated: February 2026_
_For the latest faucet links and tools, check: https://faucetlink.to/sepolia_
