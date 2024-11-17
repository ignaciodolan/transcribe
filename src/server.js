// server.js
import express from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import cors from "cors";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET } from "./config/aws.js";
import AudioTranscriptionService from "./services/transcriptionService.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Configure multer-s3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const timestamp = Date.now().toString();
      const fileName = file.originalname.replace(/\s+/g, '-').toLowerCase();
      cb(null, `uploads/${timestamp}-${fileName}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Function to generate presigned URL
async function generatePresignedUrl(bucket, key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  
  // URL expires in 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

app.use(cors());
app.use(express.json());

const transcriptionService = new AudioTranscriptionService(process.env.ASSEMBLY_AI_KEY);

// Status endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Transcription endpoint
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const { language = "en" } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No audio file provided",
        requiredFormat: "multipart/form-data with audio file",
      });
    }

    // Generate a presigned URL for the uploaded file
    const presignedUrl = await generatePresignedUrl(
      req.file.bucket,
      req.file.key
    );

    console.log("File uploaded successfully:", {
      presignedUrl,
      key: req.file.key,
      bucket: req.file.bucket,
    });

    // Start transcription
    const transcriptionResult = await transcriptionService.transcribeAudio(
      presignedUrl,
      {
        languageCode: language,
        speakerLabels: true,
      }
    );

    if (!transcriptionResult) {
      return res.status(500).json({
        success: false,
        error: "Transcription failed",
      });
    }

    res.json({
      success: true,
      data: {
        raw: transcriptionResult,
        formatted: transcriptionService.formatTranscript(transcriptionResult),
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
