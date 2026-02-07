const crypto = require('crypto');

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-cbc';
        // Ensure we have a 32-byte key for AES-256
        const key = process.env.AES_SECRET_KEY || 'VoteGuard2026SecretKey32BytesLong!';
        this.secretKey = crypto.createHash('sha256').update(key).digest();
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            encryptedData: encrypted,
            iv: iv.toString('hex')
        };
    }

    decrypt(encryptedData, iv) {
        const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, Buffer.from(iv, 'hex'));

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    encryptVote(voteData) {
        const encrypted = this.encrypt(JSON.stringify(voteData));
        return `${encrypted.iv}:${encrypted.encryptedData}`;
    }

    decryptVote(encryptedString) {
        if (!encryptedString) return null;
        const [iv, encryptedData] = encryptedString.split(':');
        const decrypted = this.decrypt(encryptedData, iv);
        return JSON.parse(decrypted);
    }
}

module.exports = new EncryptionService();