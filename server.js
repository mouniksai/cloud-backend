const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const electionController = require('./src/controllers/electionController');
const keyExchangeService = require('./src/utils/keyExchangeService');
const app = express();
require('dotenv').config();

// Middleware  
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:7860',
    process.env.CORS_ORIGIN,       // e.g. https://your-space.hf.space
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins. 
        // In HF Spaces, only port 7860 (Next.js) is exposed to the internet.
        // Port 5001 is strictly internal and accessed via Next.js proxy rewrites,
        // so strict CORS checking here is unnecessary and causes false rejections.
        return callback(null, true);
    },
    credentials: true
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

app.listen(PORT, () => {
    console.log(`VoteGuard Server running on port ${PORT}`);
    // Initialize RSA key exchange mechanism
    keyExchangeService.generateKeyPair();
    // Start the automatic election status updater
    electionController.startElectionStatusUpdater();
});