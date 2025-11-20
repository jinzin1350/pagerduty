const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

class TTSService {
  constructor() {
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.polly = new AWS.Polly();
    this.voiceId = process.env.AWS_POLLY_VOICE_ID || 'Joanna';

    // Create temp directory for audio files if it doesn't exist
    this.tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Convert text to speech using Amazon Polly
   * @param {string} text - Text to convert to speech
   * @param {string} outputFormat - Audio format (mp3, ogg_vorbis, pcm)
   * @returns {Promise<string>} - Path to the generated audio file
   */
  async textToSpeech(text, outputFormat = 'mp3') {
    try {
      const params = {
        Text: text,
        OutputFormat: outputFormat,
        VoiceId: this.voiceId,
        Engine: 'neural', // Use neural engine for more natural voice
        TextType: 'text'
      };

      console.log(`Generating speech with Amazon Polly (Voice: ${this.voiceId})...`);

      const data = await this.polly.synthesizeSpeech(params).promise();

      if (!data.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }

      // Save audio to temporary file
      const fileName = `tts-${Date.now()}.${outputFormat}`;
      const filePath = path.join(this.tempDir, fileName);

      fs.writeFileSync(filePath, data.AudioStream);
      console.log(`Audio file saved: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error('Error generating speech with Polly:', error);
      throw error;
    }
  }

  /**
   * Get TTS audio URL for Twilio (using TwiML <Say>)
   * Twilio can also use Polly directly via TwiML
   */
  async getTwilioTtsParams(text) {
    // For Twilio, we can use their built-in TTS or provide URL to Polly audio
    // This returns params for Twilio's say() method
    return {
      voice: 'Polly.Joanna-Neural', // Twilio supports Polly voices directly
      language: 'en-US'
    };
  }

  /**
   * Clean up temporary audio files
   */
  async cleanupTempFiles(olderThanMinutes = 60) {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const ageMinutes = (now - stats.mtimeMs) / 1000 / 60;

        if (ageMinutes > olderThanMinutes) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Get available voices from Polly
   */
  async getAvailableVoices() {
    try {
      const data = await this.polly.describeVoices({
        Engine: 'neural',
        LanguageCode: 'en-US'
      }).promise();

      return data.Voices.map(voice => ({
        id: voice.Id,
        name: voice.Name,
        gender: voice.Gender,
        languageCode: voice.LanguageCode
      }));
    } catch (error) {
      console.error('Error fetching Polly voices:', error);
      throw error;
    }
  }
}

module.exports = new TTSService();
