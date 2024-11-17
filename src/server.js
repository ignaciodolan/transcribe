// server.js
import express from "express";
import multer from "multer";
import multerS3 from 'multer-s3';
import cors from "cors";
import { s3Client, S3_BUCKET } from './config/aws.js';
import AudioTranscriptionService from "./services/transcriptionService.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}-${file.originalname}`);
    },
  }),
});

const transcriptionService = new AudioTranscriptionService(
  process.env.ASSEMBLY_AI_KEY
);

app.use(cors());
app.use(express.json());

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

    // Upload to AssemblyAI
    const audioUrl = req.file.location;

    if (!audioUrl) {
      return res.status(500).json({
        success: false,
        error: "Failed to upload audio file",
      });
    }

    // Start transcription
    const transcriptionResult = await transcriptionService.transcribeAudio(
      audioUrl,
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
