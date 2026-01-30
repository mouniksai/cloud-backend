const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const electionController = require('./src/controllers/electionController');
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
app.use('/api/elections', require('./src/routes/electionRoutes')); // <--- NEW

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`VoteGuard Server running on port ${PORT}`);
    // Start the automatic election status updater
    electionController.startElectionStatusUpdater();
});