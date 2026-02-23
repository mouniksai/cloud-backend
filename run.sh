#!/bin/bash

# VoteGuard Server - Quick Setup & Run Script
# Run this to get started quickly!

set -e

echo ""
echo "🚀 VoteGuard Server - Quick Setup"
echo "===================================="
echo ""

# Step 1: Check .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and configure:"
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET"
    echo "   - Other settings specific to your app"
    echo ""
    echo "For blockchain (optional):"
    echo "   - Set USE_JSON_BLOCKCHAIN=false to enable"
    echo "   - Set BLOCKCHAIN_NETWORK=localhost"
    echo "   - Set CONTRACT_ADDRESS after deployment"
    echo ""
else
    echo "✅ .env file exists"
fi

# Step 2: Check dependencies
echo ""
echo "📦 Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "✅ Dependencies installed"
fi

# Step 3: Ask what to do
echo ""
echo "🎯 What do you want to do?"
echo ""
echo "1) Run backend only (JSON-based blockchain - simplest)"
echo "2) Setup & run with local blockchain (requires 3 terminals)"
echo "3) Install blockchain dependencies only"
echo "4) Compile smart contract"
echo "5) Run tests"
echo ""
read -p "Choose option (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting backend with JSON-based blockchain..."
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "📋 Local Blockchain Setup Instructions:"
        echo ""
        echo "You'll need 3 terminal windows:"
        echo ""
        echo "Terminal 1 (Blockchain Node):"
        echo "   npx hardhat node"
        echo ""
        echo "Terminal 2 (Deploy Contract - run once):"
        echo "   npx hardhat run scripts/deploy.js --network localhost"
        echo "   Then copy CONTRACT_ADDRESS to .env"
        echo ""
        echo "Terminal 3 (Backend Server):"
        echo "   npm run dev"
        echo ""
        read -p "Press ENTER to open Terminal 1 command, or Ctrl+C to exit..."
        echo ""
        echo "Run this command in a NEW terminal:"
        echo "npx hardhat node"
        echo ""
        read -p "After starting hardhat node, press ENTER to continue..."
        echo ""
        echo "Now run this command in ANOTHER terminal:"
        echo "npx hardhat run scripts/deploy.js --network localhost"
        echo ""
        echo "Copy the CONTRACT_ADDRESS from output and add to .env"
        echo ""
        read -p "After deployment, press ENTER to start backend..."
        npm run dev
        ;;
    3)
        echo ""
        echo "📦 Installing blockchain dependencies..."
        npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
        npm install ethers@^6.9.0
        echo ""
        echo "✅ Blockchain dependencies installed!"
        echo ""
        echo "Next steps:"
        echo "1. npx hardhat compile"
        echo "2. npx hardhat test"
        echo "3. npx hardhat node (in separate terminal)"
        echo "4. npx hardhat run scripts/deploy.js --network localhost"
        ;;
    4)
        echo ""
        echo "🔨 Compiling smart contract..."
        npx hardhat compile
        echo ""
        echo "✅ Contract compiled!"
        ;;
    5)
        echo ""
        echo "🧪 Running tests..."
        npx hardhat test
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
echo ""
