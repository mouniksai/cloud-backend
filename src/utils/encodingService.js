const QRCode = require('qrcode');

/**
 * ENCODING TECHNIQUES IMPLEMENTATION
 * Lab Component 5 - Encoding & Decoding (1m)
 * Uses Base64 and QR Code generation
 */

class EncodingService {

    /**
     * 1. BASE64 ENCODING - For receipt data transmission
     */
    static encodeReceiptToBase64(receiptData) {
        const dataString = JSON.stringify({
            receiptHash: receiptData.receiptHash,
            timestamp: receiptData.timestamp,
            electionId: receiptData.electionId
        });
        return Buffer.from(dataString).toString('base64');
    }

    static decodeReceiptFromBase64(base64String) {
        const dataString = Buffer.from(base64String, 'base64').toString('utf-8');
        return JSON.parse(dataString);
    }

    /**
     * 2. QR CODE GENERATION - For easy mobile verification
     */
    static async generateReceiptQRCode(receiptHash) {
        try {
            // Generate QR code as data URL
            const qrCodeDataURL = await QRCode.toDataURL(receiptHash, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                width: 300,
                margin: 2
            });
            return qrCodeDataURL;
        } catch (error) {
            throw new Error('QR Code generation failed');
        }
    }

    /**
     * 3. BARCODE FORMAT - Numeric encoding for receipt
     */
    static encodeToBarcode(receiptHash) {
        // Convert hash to 13-digit numeric barcode (EAN-13 format)
        const numericHash = receiptHash
            .split('')
            .map(char => char.charCodeAt(0))
            .join('')
            .substring(0, 13);

        return numericHash;
    }

    /**
     * 4. URL-SAFE ENCODING - For sharing receipts via links
     */
    static encodeForURL(data) {
        const base64 = Buffer.from(JSON.stringify(data)).toString('base64');
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    static decodeFromURL(urlSafeString) {
        let base64 = urlSafeString.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    }
}

module.exports = EncodingService;
