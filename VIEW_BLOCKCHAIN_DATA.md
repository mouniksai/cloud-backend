# 📊 Where to View Your Blockchain Data

## 🎯 Quick Summary

Your app currently uses **JSON-based blockchain** (local file storage with blockchain structure).

---

## 📂 View JSON Blockchain Data

### File Location:

```
/Users/mouniksai/Desktop/cloud/vote-guard-server/blockchain_data.json
```

### View All Data:

```bash
cd vote-guard-server
cat blockchain_data.json | jq '.'
```

### View Elections Only:

```bash
cat blockchain_data.json | jq '.chain[].transactions[] | select(.type=="ELECTION")'
```

### View Candidates Only:

```bash
cat blockchain_data.json | jq '.chain[].transactions[] | select(.type=="CANDIDATE")'
```

### View Votes Only:

```bash
cat blockchain_data.json | jq '.chain[].transactions[] | select(.type=="VOTE")'
```

### View Blockchain Stats:

```bash
cat blockchain_data.json | jq '{
  chainLength: (.chain | length),
  totalBlocks: (.chain | length),
  genesisBlock: .chain[0],
  latestBlock: .chain[-1]
}'
```

---

## 🔍 View via Backend API

### 1. Get All Elections:

```bash
curl http://localhost:5001/api/elections | jq '.'
```

### 2. Get Specific Election:

```bash
curl http://localhost:5001/api/elections/ELECTION_ID | jq '.'
```

### 3. Get Ballot (Elections + Candidates):

```bash
curl http://localhost:5001/api/vote/ballot | jq '.'
```

### 4. Get Blockchain Stats:

```bash
curl http://localhost:5001/api/blockchain/stats | jq '.'
```

### 5. Verify Blockchain Integrity:

```bash
curl http://localhost:5001/api/blockchain/verify | jq '.'
```

---

## 🌐 View via Frontend

### Dashboard:

```
http://localhost:3000/dashboard
```

Shows:

- Active elections
- Your voting status
- Election countdown

### Vote Page:

```
http://localhost:3000/vote
```

Shows:

- Available elections
- Candidates list
- Voting interface

### Results Page:

```
http://localhost:3000/results
```

Shows:

- Election results
- Vote counts per candidate

### Vote History:

```
http://localhost:3000/vote-history
```

Shows:

- Your past votes
- Receipt hashes
- Vote timestamps

---

## 🔗 Sepolia Blockchain (Currently Empty)

Your smart contract is deployed but has no data yet:

**Contract Address:**

```
0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2
```

**View on Etherscan:**

```
https://sepolia.etherscan.io/address/0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2
```

**Add Data to Sepolia:**

```bash
cd vote-guard-server
node scripts/add-test-data.js
```

---

## 📱 Quick Commands Cheatsheet

```bash
# View entire blockchain
cat blockchain_data.json | jq '.' | less

# Count total blocks
cat blockchain_data.json | jq '.chain | length'

# Count elections
cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="ELECTION")] | length'

# Count candidates
cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="CANDIDATE")] | length'

# Count votes
cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="VOTE")] | length'

# View latest block
cat blockchain_data.json | jq '.chain[-1]'

# View genesis block
cat blockchain_data.json | jq '.chain[0]'

# Search for specific election
cat blockchain_data.json | jq '.chain[].transactions[] | select(.type=="ELECTION" and .data.title | contains("2025"))'

# View all votes for a specific election
cat blockchain_data.json | jq '.chain[].transactions[] | select(.type=="VOTE" and .data.electionId=="ELECTION_ID")'
```

---

## 🛠️ Useful Scripts

### Create a script to view blockchain summary:

```bash
cat > view-blockchain.sh << 'EOF'
#!/bin/bash
echo "📊 Blockchain Summary"
echo "===================="
echo ""
echo "📦 Total Blocks: $(cat blockchain_data.json | jq '.chain | length')"
echo "🗳️  Elections: $(cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="ELECTION")] | length')"
echo "👥 Candidates: $(cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="CANDIDATE")] | length')"
echo "✅ Votes: $(cat blockchain_data.json | jq '[.chain[].transactions[] | select(.type=="VOTE")] | length')"
echo ""
echo "📝 Recent Elections:"
cat blockchain_data.json | jq -r '.chain[].transactions[] | select(.type=="ELECTION") | "  - \(.data.title) (\(.data.status))"' | head -5
EOF

chmod +x view-blockchain.sh
./view-blockchain.sh
```

---

## 🔄 Switch Between JSON and Sepolia

### Currently Using: JSON Blockchain

### To Switch to Sepolia:

1. Add data to Sepolia first:

```bash
node scripts/add-test-data.js
```

2. Update voteController.js:

```javascript
const blockchainService = require("../blockchain/blockchainServiceV2");
```

3. Restart server:

```bash
npm start
```

### Data Source Comparison:

| Feature          | JSON Blockchain | Sepolia Blockchain    |
| ---------------- | --------------- | --------------------- |
| **Location**     | Local file      | Ethereum testnet      |
| **Public**       | No              | Yes (Etherscan)       |
| **Persistent**   | File on disk    | Forever on blockchain |
| **Cost**         | Free            | Gas fees (test ETH)   |
| **Speed**        | Instant         | ~15 seconds           |
| **Verification** | File hash       | Etherscan             |

---

## 🎓 Understanding the Data Structure

### Block Structure:

```json
{
  "index": 1,
  "timestamp": "2026-02-22T10:00:00.000Z",
  "transactions": [
    {
      "type": "ELECTION",
      "data": {
        "id": "uuid-here",
        "title": "Election Title",
        "status": "LIVE"
      }
    }
  ],
  "previousHash": "0x...",
  "hash": "0x...",
  "nonce": 12345,
  "merkleRoot": "0x..."
}
```

### Transaction Types:

- `ELECTION` - Election creation/updates
- `CANDIDATE` - Candidate registration
- `VOTE` - Vote casting
- `AUDIT` - Audit log entries

---

## 📈 Monitoring Tips

### 1. Watch blockchain file for changes:

```bash
watch -n 1 'cat blockchain_data.json | jq ".chain | length"'
```

### 2. Tail server logs:

```bash
npm start 2>&1 | tee server.log
```

### 3. Monitor API calls:

```bash
# Terminal 1
npm start

# Terminal 2
watch -n 2 'curl -s http://localhost:5001/api/blockchain/stats | jq "."'
```

---

## 🐛 Troubleshooting

### Can't see election data?

```bash
# Check if file exists
ls -lh blockchain_data.json

# Verify JSON is valid
cat blockchain_data.json | jq '.' > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"

# Check permissions
ls -l blockchain_data.json
```

### Frontend showing "No elections"?

```bash
# 1. Check backend is running
curl http://localhost:5001/api/vote/ballot

# 2. Check CORS
curl -H "Origin: http://localhost:3000" http://localhost:5001/api/vote/ballot

# 3. Check authentication (if required)
curl -b cookies.txt http://localhost:5001/api/vote/ballot
```

---

## 📚 Related Files

- **Blockchain Logic:** `src/blockchain/blockchain.js`
- **Service Layer:** `src/blockchain/blockchainService.js`
- **Controllers:** `src/controllers/voteController.js`
- **Data File:** `blockchain_data.json`

---

**Last Updated:** February 22, 2026  
**Blockchain Length:** Check with: `cat blockchain_data.json | jq '.chain | length'`
