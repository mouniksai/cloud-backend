# 📝 COMMAND CHEATSHEET

## 🚀 MOST COMMON: Just Run the Backend

```bash
npm run dev
```

**That's it!** Server runs on http://localhost:5001

Uses JSON-based blockchain by default (no extra setup needed).

---

## 🔧 Want to Enable Real Blockchain?

### One-Time Setup:

```bash
# 1. Install blockchain dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers@^6.9.0

# 2. Compile contract
npx hardhat compile

# 3. Edit .env file
nano .env
```

Set these in `.env`:

```env
USE_JSON_BLOCKCHAIN=false
BLOCKCHAIN_NETWORK=localhost
```

---

## 🏃 Running with Local Blockchain (3 Terminals)

### Terminal 1: Blockchain Node

```bash
npx hardhat node
# Keep running! Don't close this terminal.
```

### Terminal 2: Deploy Contract (run once)

```bash
npx hardhat run scripts/deploy.js --network localhost

# Copy the contract address shown, then add to .env:
# CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Terminal 3: Backend Server

```bash
npm run dev
```

---

## 📦 All Available Commands

### Backend Server:

```bash
npm run dev          # Development mode (auto-restart)
npm start            # Production mode
npm test             # Run tests
```

### Blockchain - Compilation & Testing:

```bash
npx hardhat compile                    # Compile smart contract
npx hardhat test                       # Run blockchain tests
npx hardhat clean                      # Clean cache
```

### Blockchain - Local Development:

```bash
npx hardhat node                       # Start local blockchain
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/interact.js --network localhost
npx hardhat run scripts/check-balance.js --network localhost
```

### Blockchain - Sepolia Testnet:

```bash
npx hardhat run scripts/check-balance.js --network sepolia
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/interact.js --network sepolia
```

---

## 🎯 Quick Start Scenarios

### Scenario 1: "I just want to run the backend!"

```bash
# That's it. Just:
npm run dev
```

### Scenario 2: "I want to test blockchain locally"

```bash
# Terminal 1:
npx hardhat node

# Terminal 2:
npx hardhat run scripts/deploy.js --network localhost
# Update .env with CONTRACT_ADDRESS

# Terminal 3:
npm run dev
```

### Scenario 3: "I want to use Sepolia testnet"

```bash
# Setup .env first with:
# - BLOCKCHAIN_NETWORK=sepolia
# - ALCHEMY_API_KEY
# - SEPOLIA_PRIVATE_KEY

# Deploy once:
npx hardhat run scripts/deploy.js --network sepolia
# Update .env with CONTRACT_ADDRESS

# Then just:
npm run dev
```

### Scenario 4: "First time setup"

```bash
# Run the interactive script:
./run.sh

# Or manually:
npm install
cp .env.example .env
# Edit .env
npm run dev
```

---

## 🔄 Switching Between JSON and Blockchain

**Use JSON (traditional):**

```env
# In .env file:
USE_JSON_BLOCKCHAIN=true
```

**Use Blockchain:**

```env
# In .env file:
USE_JSON_BLOCKCHAIN=false
BLOCKCHAIN_NETWORK=localhost  # or 'sepolia'
CONTRACT_ADDRESS=0x...        # from deployment
```

**No code changes needed!** Just restart server: `npm run dev`

---

## 🐛 Common Issues

### "Port 5001 already in use"

```bash
lsof -ti:5001 | xargs kill -9
```

### "Cannot find module 'hardhat'"

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### "Blockchain connection failed"

Check:

1. Is `npx hardhat node` running? (for localhost)
2. Is `.env` configured correctly?
3. Is `CONTRACT_ADDRESS` set?

### "Contract not compiled"

```bash
npx hardhat compile
```

---

## 📊 Quick Reference Table

| Task                 | Command                         | Terminals | Setup Time |
| -------------------- | ------------------------------- | --------- | ---------- |
| **Run backend**      | `npm run dev`                   | 1         | 0 min      |
| **Local blockchain** | See Terminal 1-3 above          | 3         | 2 min      |
| **Sepolia testnet**  | Deploy once, then `npm run dev` | 1         | 10 min     |

---

## 💡 Pro Tips

1. **Development**: Use `npm run dev` with JSON blockchain (fastest)
2. **Testing**: Use local blockchain (free, instant feedback)
3. **Demo**: Use Sepolia testnet (impressive, public blockchain!)
4. **Production**: Consider Polygon or Arbitrum (cheaper than Ethereum)

---

## 🆘 Need Help?

See the full guides:

- [SETUP_AND_RUN.md](SETUP_AND_RUN.md) - Complete setup guide
- [BLOCKCHAIN_MIGRATION_GUIDE.md](BLOCKCHAIN_MIGRATION_GUIDE.md) - Full documentation
- [BLOCKCHAIN_QUICK_REFERENCE.md](BLOCKCHAIN_QUICK_REFERENCE.md) - Commands reference

---

**Most people just need:**

```bash
npm run dev
```

**That's the simplest way to get started!** 🚀
