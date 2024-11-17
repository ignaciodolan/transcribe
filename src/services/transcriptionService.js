import fetch from 'node-fetch';
import fs from 'fs/promises';

class AudioTranscriptionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    this.headers = {
      'authorization': apiKey,
      'content-type': 'application/json'
    };
  }

  /**
   * Upload an audio file to AssemblyAI
   * @param {string} audioFilePath - Path to the audio file
   * @returns {Promise<string|null>} - Upload URL if successful, null otherwise
   */
  async uploadFile(audioFilePath) {
    try {
      const audioData = await fs.readFile(audioFilePath);
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: this.headers,
        body: audioData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const { upload_url } = await response.json();
      return upload_url;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  /**
   * Wait for transcription to complete
   * @param {string} transcriptId - ID of the transcript
   * @returns {Promise<object|null>} - Transcript result if successful, null otherwise
   */
  async waitForTranscript(transcriptId) {
    try {
      while (true) {
        const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: this.headers
        });

        if (!response.ok) {
          throw new Error(`Polling failed with status: ${response.status}`);
        }

        const transcript = await response.json();

        if (transcript.status === 'completed') {
          return transcript;
        } else if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }

        // Wait 3 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error('Error polling transcript:', error);
      return null;
    }
  }

  /**
   * Transcribe audio with specified language and speaker diarization
   * @param {string} audioUrl - URL of the uploaded audio file
   * @param {object} options - Transcription options
   * @returns {Promise<object|null>} - Transcript result if successful, null otherwise
   */
  async transcribeAudio(audioUrl, {
    languageCode = 'en',
    speakerLabels = true,
    punctuate = true,
    formatText = true
  } = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: languageCode,
          speaker_labels: speakerLabels,
          punctuate,
          format_text: formatText
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription request failed with status: ${response.status}`);
      }

      const { id: transcriptId } = await response.json();
      return await this.waitForTranscript(transcriptId);
    } catch (error) {
      console.error('Error requesting transcription:', error);
      return null;
    }
  }

  /**
   * Format transcript with speaker labels
   * @param {object} transcriptResult - Raw transcript result
   * @returns {string} - Formatted transcript
   */
  formatTranscript(transcriptResult) {
    if (!transcriptResult.utterances) {
      return transcriptResult.text || '';
    }

    return transcriptResult.utterances
      .map(utterance => `${utterance.speaker || 'Unknown Speaker'}: ${utterance.text}`)
      .join('\n');
  }
}

export default AudioTranscriptionService;