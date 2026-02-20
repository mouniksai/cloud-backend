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
        // Allow requests with no origin (server-to-server, same container)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Dynamically allow Hugging Face Spaces domains
        if (origin.endsWith('.hf.space') || origin.endsWith('.huggingface.co')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
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