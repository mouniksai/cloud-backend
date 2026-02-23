const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const electionController = require('./src/controllers/electionController');
const keyExchangeService = require('./src/utils/keyExchangeService');
const app = express();
require('dotenv').config();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Your Next.js frontend URL
    credentials: true // Enable credentials (cookies)
}));
app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware

// Routes
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
// Blockchain Initialization (Optional - Graceful Fallback)
// ============================================================
async function startServer() {
    let blockchainMode = 'JSON-based';

    try {
        // Check if blockchain smart contract should be initialized
        const useJsonBlockchain = process.env.USE_JSON_BLOCKCHAIN !== 'false';
        const blockchainNetwork = process.env.BLOCKCHAIN_NETWORK;

        // Only try to initialize smart contract if explicitly configured
        if (!useJsonBlockchain && blockchainNetwork && blockchainNetwork !== 'disabled') {
            try {
                console.log('\n🔗 Initializing blockchain smart contract connection...');
                const blockchainServiceV2 = require('./src/blockchain/blockchainServiceV2');
                await blockchainServiceV2.initialize();
                blockchainMode = `Smart Contract (${blockchainNetwork})`;
                console.log('✅ Blockchain smart contract connected!\n');
            } catch (blockchainError) {
                console.warn('\n⚠️  Blockchain initialization failed:', blockchainError.message);
                console.warn('⚠️  Falling back to JSON-based blockchain\n');
                blockchainMode = 'JSON-based (fallback)';
            }
        } else {
            console.log('\n📝 Using JSON-based blockchain (traditional mode)\n');
        }

        // Start Express server (always succeeds even if blockchain fails)
        app.listen(PORT, () => {
            console.log('====================================');
            console.log(`✅ VoteGuard Server Started!`);
            console.log('====================================');
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`🔗 Blockchain: ${blockchainMode}`);
            console.log('====================================\n');

            // Initialize RSA key exchange mechanism
            keyExchangeService.generateKeyPair();

            // Start the automatic election status updater
            electionController.startElectionStatusUpdater();
        });
    } catch (error) {
        console.error('\n❌ FATAL: Server failed to start:', error.message);
        console.error(error.stack);
        console.error('\n💡 This is a critical error. Check:');
        console.error('   1. Database connection (DATABASE_URL)');
        console.error('   2. Port availability (PORT=5001)');
        console.error('   3. Required dependencies installed\n');
        process.exit(1);
    }
}

// Start the server
startServer();