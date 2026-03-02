// Force UTC timezone regardless of deployment region (fixes Azure Southeast Asia UTC+8 offset)
process.env.TZ = 'UTC';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const electionController = require('./src/controllers/electionController');
const keyExchangeService = require('./src/utils/keyExchangeService');
const blockchainServiceV2 = require('./src/blockchain/blockchainServiceV2');
const app = express();
require('dotenv').config();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/vote', require('./src/routes/voteRoutes'));
app.use('/api/elections', require('./src/routes/electionRoutes'));
app.use('/api/verification', require('./src/routes/verificationRoutes'));
app.use('/api/keys', require('./src/routes/keyRoutes'));
app.use('/api/blockchain', require('./src/routes/blockchainRoutes'));

const PORT = process.env.PORT || 5001;

// ============================================================
// SERVER STARTUP WITH SEPOLIA BLOCKCHAIN INITIALIZATION
// ============================================================
async function startServer() {
    try {
        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║         🛡️  VOTEGUARD SERVER STARTING...            ║');
        console.log('╚═══════════════════════════════════════════════════════╝\n');

        // CRITICAL: Initialize Sepolia blockchain connection
        console.log('🔗 Initializing Sepolia blockchain connection...\n');

        try {
            await blockchainServiceV2.initialize();
            console.log('✅ Blockchain service ready!\n');
        } catch (blockchainError) {
            console.error('\n╔═══════════════════════════════════════════════════════╗');
            console.error('║  ⚠️  BLOCKCHAIN INITIALIZATION FAILED                 ║');
            console.error('╚═══════════════════════════════════════════════════════╝\n');
            console.error('Error:', blockchainError.message);
            console.error('\n💡 TROUBLESHOOTING CHECKLIST:');
            console.error('   1. ✓ Copy .env.example to .env');
            console.error('   2. ✓ Set BLOCKCHAIN_NETWORK=sepolia');
            console.error('   3. ✓ Set BLOCKCHAIN_PROVIDER=gcp (or alchemy)');
            console.error('   4. ✓ Set CONTRACT_ADDRESS=0xE08b2c325F4e64DDb7837b6a4b1443935473ECB2');
            console.error('   5. ✓ Set GCP_BLOCKCHAIN_ENDPOINT (or ALCHEMY_API_KEY if using Alchemy)');
            console.error('   6. ✓ Set SEPOLIA_PRIVATE_KEY (export from MetaMask)\n');
            console.error('⚠️  Server will start WITHOUT blockchain features. Fix the blockchain config to enable voting.\n');
            // Don't exit - allow server to start without blockchain
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log('╔═══════════════════════════════════════════════════════╗');
            console.log('║         ✅ VOTEGUARD SERVER RUNNING!                 ║');
            console.log('╚═══════════════════════════════════════════════════════╝');
            console.log(`📍 Server URL:    http://localhost:${PORT}`);
            console.log(`🔗 Blockchain:    Sepolia Testnet (Live)`);
            console.log(`📜 Contract:      ${process.env.CONTRACT_ADDRESS || 'Not set'}`);
            console.log(`🌐 CORS Origin:   ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
            console.log('╚═══════════════════════════════════════════════════════╝\n');
            console.log('💡 TEAM SYNC: All team members connected to this server');
            console.log('   will see the SAME data from Sepolia blockchain!\n');

            // Initialize RSA key exchange mechanism
            keyExchangeService.generateKeyPair();

            // Start the automatic election status updater
            electionController.startElectionStatusUpdater();
        });
    } catch (error) {
        console.error('\n╔═══════════════════════════════════════════════════════╗');
        console.error('║  ❌ FATAL: SERVER FAILED TO START                    ║');
        console.error('╚═══════════════════════════════════════════════════════╝\n');
        console.error('Error:', error.message);
        console.error(error.stack);
        console.error('\n💡 Common issues:');
        console.error('   - Database connection (DATABASE_URL)');
        console.error('   - Port already in use (PORT=5001)');
        console.error('   - Missing npm packages (run: npm install)\n');
        process.exit(1);
    }
}

// Start the server
startServer();