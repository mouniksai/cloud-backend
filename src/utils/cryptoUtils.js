// src/utils/cryptoUtils.js
const crypto = require('crypto');

// Generates a unique, tamper-evident receipt hash
exports.generateReceiptHash = (userId, electionId, candidateId) => {
    const data = `${userId}-${electionId}-${candidateId}-${Date.now()}-${Math.random()}`;
    return '0x' + crypto.createHash('sha256').update(data).digest('hex');
};