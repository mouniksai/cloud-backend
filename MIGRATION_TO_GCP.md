# Migration Guide: Alchemy to GCP Blockchain RPC

## Overview

This guide explains the migration from Alchemy to Google Cloud Platform's Blockchain Node Engine for VoteGuard backend.

## What Changed

### 1. **New Provider Abstraction**

Created `/src/config/blockchainProvider.js` - a unified interface supporting multiple blockchain RPC providers (Alchemy, GCP).

### 2. **Updated Files**

- `src/blockchain/blockchainServiceV2.js` - Now uses provider abstraction
- `hardhat.config.js` - Supports both Alchemy and GCP configurations
- `.env.example` - Added GCP configuration options
- `server.js` - Updated error messages for new provider options
- `quick-start.sh` - Updated setup instructions

### 3. **New Environment Variables**

#### For GCP (Recommended):

```env
BLOCKCHAIN_PROVIDER=gcp
GCP_BLOCKCHAIN_ENDPOINT=https://blockchain.googleapis.com/v1/projects/cloudavv/locations/asia-east1/endpoints/ethereum-sepolia/rpc?key=AIzaSyDxOaD1c-7tcFFHGP1vhK7lrIUQ4SgwyIk
```

#### For Alchemy (Legacy):

```env
BLOCKCHAIN_PROVIDER=alchemy
ALCHEMY_API_KEY=your_alchemy_api_key
```

## How to Switch to GCP

### Option 1: Update Existing .env File

1. Open your `.env` file
2. Add or update these lines:
   ```env
   BLOCKCHAIN_PROVIDER=gcp
   GCP_BLOCKCHAIN_ENDPOINT=https://blockchain.googleapis.com/v1/projects/cloudavv/locations/asia-east1/endpoints/ethereum-sepolia/rpc?key=AIzaSyDxOaD1c-7tcFFHGP1vhK7lrIUQ4SgwyIk
   ```
3. Keep your existing `SEPOLIA_PRIVATE_KEY` and `CONTRACT_ADDRESS`
4. Restart your server: `npm run dev`

### Option 2: Fresh Setup

1. Copy the new template:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and fill in:
   - `BLOCKCHAIN_PROVIDER=gcp`
   - `GCP_BLOCKCHAIN_ENDPOINT=<your-gcp-endpoint>`
   - `SEPOLIA_PRIVATE_KEY=<your-private-key>`
   - `CONTRACT_ADDRESS=<your-contract-address>`
3. Start the server: `npm run dev`

## Verification

When the server starts successfully with GCP, you should see:

```
✅ Provider Configuration Valid
├─ Provider: GCP Blockchain Node Engine
├─ Network: Sepolia Testnet (Chain ID: 11155111)
└─ RPC URL: https://blockchain.googleapis.com/...***MASKED***

✅ Connected to blockchain
├─ Provider: GCP Blockchain Node Engine
├─ Network: Sepolia Testnet (Chain ID: 11155111)
├─ Contract: 0xE08b2c...
├─ Signer: 0x...
├─ Chain Length: X
└─ Explorer: https://sepolia.etherscan.io/address/0x...
```

## Switching Back to Alchemy (If Needed)

Simply update your `.env`:

```env
BLOCKCHAIN_PROVIDER=alchemy
ALCHEMY_API_KEY=your_alchemy_api_key
```

## Benefits of GCP Provider

1. **Production-Ready**: Enterprise-grade infrastructure from Google Cloud
2. **Better Reliability**: Higher uptime and redundancy
3. **No Rate Limits**: More generous API quotas
4. **Direct Integration**: Seamless integration with other GCP services
5. **Security**: Enhanced security with Google Cloud IAM

## Backward Compatibility

The system maintains full backward compatibility with Alchemy. Existing installations can continue using Alchemy without any changes. Simply don't set `BLOCKCHAIN_PROVIDER` or set it to `alchemy`.

## Troubleshooting

### Error: "GCP_BLOCKCHAIN_ENDPOINT not set"

- Make sure you've added the GCP endpoint to your `.env` file
- Check that it includes the API key parameter: `?key=...`

### Error: "BLOCKCHAIN_PROVIDER must be 'sepolia'"

- Make sure `BLOCKCHAIN_NETWORK=sepolia` in your `.env`

### Connection fails with GCP

1. Verify your GCP API key is valid
2. Check that the endpoint URL is correct
3. Ensure your GCP project has Blockchain Node Engine enabled
4. Try switching to Alchemy temporarily to isolate the issue

### Still using Alchemy successfully?

- No action needed! The migration is optional
- Set `BLOCKCHAIN_PROVIDER=alchemy` to explicitly use Alchemy

## Testing

Run the existing test suite to verify everything works:

```bash
npm test
```

All blockchain operations should work identically with both providers.

## Support

For issues with:

- **GCP Configuration**: Check Google Cloud Console → Blockchain Node Engine
- **Alchemy Configuration**: Check Alchemy Dashboard
- **General blockchain issues**: Check Sepolia testnet status at https://sepolia.etherscan.io/
