const axios = require('axios');
const FormData = require('form-data');
const prisma = require('../config/db');

exports.verifyFace = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { liveImageBase64 } = req.body;

        console.log("--> Starting Face Verification for:", userId);

        // 1. Fetch User's Reference Photo URL from DB
        const user = await prisma.user.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        if (!user || !user.citizen.photoUrl) {
            return res.status(404).json({ message: "Reference photo not found in Government Registry" });
        }

        const referencePhotoUrl = user.citizen.photoUrl;
        console.log("--> Reference Photo:", referencePhotoUrl);

        // 2. Prepare Data for Face++ API
        // Face++ expects 'image_url1' (Reference) and 'image_base64_2' (Live)
        const form = new FormData();
        form.append('api_key', process.env.FACE_API_KEY);
        form.append('api_secret', process.env.FACE_API_SECRET);

        // Image 1: Stored in Supabase
        form.append('image_url1', referencePhotoUrl);

        // Image 2: Live capture (Strip the "data:image/jpeg;base64," prefix)
        const cleanBase64 = liveImageBase64.replace(/^data:image\/\w+;base64,/, "");
        form.append('image_base64_2', cleanBase64);

        // 3. Call Face++ Compare API
        const response = await axios.post(process.env.FACE_API_URL, form, {
            headers: { ...form.getHeaders() }
        });

        const result = response.data;

        // 4. Analyze Result
        // Face++ returns a 'confidence' score (0-100). usually > 80 is a match.
        console.log("--> Confidence Score:", result.confidence);

        if (result.confidence >= 80) {
            return res.json({
                success: true,
                confidence: result.confidence,
                message: "Face Verified Successfully"
            });
        } else {
            return res.status(401).json({
                success: false,
                confidence: result.confidence,
                message: "Face mismatch. Verification Failed."
            });
        }

    } catch (error) {
        console.error("Face API Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Face Verification Service Error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mock Token Validation (Since Fingerprint is skipped)
exports.validateToken = async (req, res) => {
    try {
        // In a real app, verify Blockchain eligibility here
        // Simulate async validation
        await new Promise(resolve => setTimeout(resolve, 1500));

        res.json({
            success: true,
            message: "Token Validated on Chain"
        });
    } catch (error) {
        console.error("Token validation error:", error);
        res.status(500).json({
            success: false,
            message: "Token validation failed"
        });
    }
};