const crypto = require('crypto');

class KeyExchangeService {
    constructor() {
        this.publicKey = null;
        this.privateKey = null;
        this.keySize = 2048; // RSA key size in bits
    }

    /**
     * Generate RSA key pair on server startup
     * This should be called once when the server initializes
     */
    generateKeyPair() {
        console.log('🔑 Generating RSA key pair for secure key exchange...');

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: this.keySize,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;

        console.log('✅ RSA key pair generated successfully');
        console.log('📢 Public key is now available at /api/keys/public-key');
    }

    /**
     * Get the public key for distribution to clients
     * @returns {string} Public key in PEM format
     */
    getPublicKey() {
        if (!this.publicKey) {
            throw new Error('RSA key pair not generated. Call generateKeyPair() first.');
        }
        return this.publicKey;
    }

    /**
     * Encrypt data using the private key (for demonstration purposes)
     * In practice, private keys are used for decryption and signing
     * @param {string} data - Data to encrypt
     * @returns {string} Encrypted data in base64 format
     */
    encryptWithPrivateKey(data) {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }

        const encrypted = crypto.privateEncrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            Buffer.from(data)
        );

        return encrypted.toString('base64');
    }

    /**
     * Decrypt data that was encrypted with the public key
     * This is the typical use case for RSA key exchange
     * @param {string} encryptedData - Base64 encoded encrypted data
     * @returns {string} Decrypted data
     */
    decryptWithPrivateKey(encryptedData) {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }

        const buffer = Buffer.from(encryptedData, 'base64');
        const decrypted = crypto.privateDecrypt(
            {
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            buffer
        );

        return decrypted.toString('utf8');
    }

    /**
     * Verify data signature using public key
     * @param {string} data - Original data
     * @param {string} signature - Base64 encoded signature
     * @returns {boolean} True if signature is valid
     */
    verifySignature(data, signature) {
        if (!this.publicKey) {
            throw new Error('Public key not available');
        }

        const verify = crypto.createVerify('SHA256');
        verify.update(data);
        verify.end();

        return verify.verify(this.publicKey, signature, 'base64');
    }

    /**
     * Sign data using private key
     * @param {string} data - Data to sign
     * @returns {string} Signature in base64 format
     */
    signData(data) {
        if (!this.privateKey) {
            throw new Error('Private key not available');
        }

        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();

        return sign.sign(this.privateKey, 'base64');
    }

    /**
     * Get key exchange information for monitoring/debugging
     * @returns {object} Key exchange status
     */
    getKeyExchangeInfo() {
        return {
            keySize: this.keySize,
            publicKeyAvailable: !!this.publicKey,
            privateKeyAvailable: !!this.privateKey,
            algorithm: 'RSA',
            publicKeyPreview: this.publicKey ? this.publicKey.substring(0, 100) + '...' : null
        };
    }
}

module.exports = new KeyExchangeService();
