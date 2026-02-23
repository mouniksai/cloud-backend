#!/bin/bash

# Quick Start Script for VoteGuard Blockchain Migration
# This script helps you get started quickly

set -e  # Exit on error

echo ""
echo "🚀 VoteGuard Blockchain - Quick Start"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 IMPORTANT: Edit .env and add your:"
    echo "   - ALCHEMY_API_KEY (from https://www.alchemy.com/)"
    echo "   - SEPOLIA_PRIVATE_KEY (from MetaMask)"
    echo ""
    echo "Press ENTER when you've updated .env..."
    read
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if Hardhat is installed
if ! npm list hardhat &> /dev/null; then
    echo ""
    echo "📦 Installing Hardhat and blockchain tools..."
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
    npm install ethers@^6.9.0 dotenv
fi

echo "✅ Hardhat installed"

# Compile contracts
echo ""
echo "🔨 Compiling smart contracts..."
npx hardhat compile

echo ""
echo "✅ Compilation successful!"

# Run tests
echo ""
echo "🧪 Running tests..."
npx hardhat test

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  For LOCAL development (instant & free):"
echo "    Terminal 1: npx hardhat node"
echo "    Terminal 2: BLOCKCHAIN_NETWORK=localhost npx hardhat run scripts/deploy.js --network localhost"
echo "    Terminal 3: npm start"
echo ""
echo "2️⃣  For SEPOLIA testnet (public blockchain):"
echo "    - Get test ETH: https://sepoliafaucet.com/"
echo "    - Deploy: BLOCKCHAIN_NETWORK=sepolia npx hardhat run scripts/deploy.js --network sepolia"
echo "    - Run app: npm start"
echo ""
echo "📖 Read BLOCKCHAIN_MIGRATION_GUIDE.md for detailed instructions!"
echo ""
