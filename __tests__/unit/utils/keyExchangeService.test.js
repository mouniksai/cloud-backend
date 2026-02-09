// Unit tests for keyExchangeService.js
const keyService = require('../../../src/utils/keyExchangeService');
const crypto = require('crypto');

describe('KeyExchangeService', () => {

    beforeEach(() => {
        // Reset the singleton instance state before each test
        keyService.publicKey = null;
        keyService.privateKey = null;
    });

    describe('generateKeyPair', () => {
        it('should generate RSA key pair successfully', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            keyService.generateKeyPair();

            expect(keyService.publicKey).toBeDefined();
            expect(keyService.privateKey).toBeDefined();
            expect(keyService.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
            expect(keyService.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Generating RSA key pair')
            );

            consoleSpy.mockRestore();
        });

        it('should generate 2048-bit keys', () => {
            keyService.generateKeyPair();

            expect(keyService.keySize).toBe(2048);
            expect(keyService.publicKey.length).toBeGreaterThan(300);
            expect(keyService.privateKey.length).toBeGreaterThan(1000);
        });

        it('should generate different keys on each call', () => {
            keyService.generateKeyPair();
            const firstPublicKey = keyService.publicKey;
            const firstPrivateKey = keyService.privateKey;

            keyService.generateKeyPair();
            const secondPublicKey = keyService.publicKey;
            const secondPrivateKey = keyService.privateKey;

            expect(firstPublicKey).not.toBe(secondPublicKey);
            expect(firstPrivateKey).not.toBe(secondPrivateKey);
        });
    });

    describe('getPublicKey', () => {
        it('should return public key after generation', () => {
            keyService.generateKeyPair();

            const publicKey = keyService.getPublicKey();

            expect(publicKey).toBe(keyService.publicKey);
            expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
        });

        it('should throw error if keys not generated', () => {
            expect(() => {
                keyService.getPublicKey();
            }).toThrow('RSA key pair not generated');
        });
    });

    describe('encryptWithPrivateKey', () => {
        beforeEach(() => {
            keyService.generateKeyPair();
        });

        it('should encrypt data with private key', () => {
            const data = 'Test message';

            const encrypted = keyService.encryptWithPrivateKey(data);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);
            expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
        });

        it('should throw error if private key not available', () => {
            // Reset keys to null
            keyService.publicKey = null;
            keyService.privateKey = null;

            expect(() => {
                keyService.encryptWithPrivateKey('data');
            }).toThrow('Private key not available');
        });

        it('should produce different outputs for different inputs', () => {
            const data1 = 'Message 1';
            const data2 = 'Message 2';

            const encrypted1 = keyService.encryptWithPrivateKey(data1);
            const encrypted2 = keyService.encryptWithPrivateKey(data2);

            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('decryptWithPrivateKey', () => {
        beforeEach(() => {
            keyService.generateKeyPair();
        });

        it('should decrypt data encrypted with public key', () => {
            const originalData = 'Secret message';

            // Encrypt with public key (this is what client would do)
            const encrypted = crypto.publicEncrypt(
                {
                    key: keyService.publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                },
                Buffer.from(originalData)
            ).toString('base64');

            // Decrypt with private key
            const decrypted = keyService.decryptWithPrivateKey(encrypted);

            expect(decrypted).toBe(originalData);
        });

        it('should throw error if private key not available', () => {
            // Reset keys to null
            keyService.publicKey = null;
            keyService.privateKey = null;

            expect(() => {
                keyService.decryptWithPrivateKey('encrypted-data');
            }).toThrow('Private key not available');
        });

        it('should handle various message lengths', () => {
            const testMessages = [
                'Short',
                'A bit longer message',
                'This is a much longer message with more content to test encryption'
            ];

            testMessages.forEach(message => {
                const encrypted = crypto.publicEncrypt(
                    {
                        key: keyService.publicKey,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                    },
                    Buffer.from(message)
                ).toString('base64');

                const decrypted = keyService.decryptWithPrivateKey(encrypted);
                expect(decrypted).toBe(message);
            });
        });

        it('should throw error with invalid encrypted data', () => {
            expect(() => {
                keyService.decryptWithPrivateKey('invalid-base64-data!!!');
            }).toThrow();
        });
    });

    describe('verifySignature', () => {
        beforeEach(() => {
            keyService.generateKeyPair();
        });

        it('should throw error if public key not available', () => {
            // Reset keys to null
            keyService.publicKey = null;
            keyService.privateKey = null;

            expect(() => {
                keyService.verifySignature('data', 'signature');
            }).toThrow('Public key not available');
        });
    });

    describe('Key format and properties', () => {
        it('should generate keys in PEM format', () => {
            keyService.generateKeyPair();

            expect(keyService.publicKey).toMatch(/-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/);
            expect(keyService.privateKey).toMatch(/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/);
        });

        it('should have SPKI format for public key', () => {
            keyService.generateKeyPair();

            // Public key should be importable
            expect(() => {
                crypto.createPublicKey(keyService.publicKey);
            }).not.toThrow();
        });

        it('should have PKCS8 format for private key', () => {
            keyService.generateKeyPair();

            // Private key should be importable
            expect(() => {
                crypto.createPrivateKey(keyService.privateKey);
            }).not.toThrow();
        });
    });

    describe('Integration scenarios', () => {
        it('should support full encryption/decryption workflow', () => {
            keyService.generateKeyPair();

            const originalMessage = 'VoteGuard secure communication';

            // Client encrypts with public key
            const encrypted = crypto.publicEncrypt(
                {
                    key: keyService.publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
                },
                Buffer.from(originalMessage)
            ).toString('base64');

            // Server decrypts with private key
            const decrypted = keyService.decryptWithPrivateKey(encrypted);

            expect(decrypted).toBe(originalMessage);
        });
    });
});
