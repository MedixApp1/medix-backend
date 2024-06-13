// google-speech.service.ts
import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import * as apiKey from '../../medix-424107-59f23af2a167.json';

@Injectable()
export class GoogleSpeechService {
  private client: SpeechClient;

  constructor() {
    this.client = new SpeechClient({ apiKey });
  }

  async transcribeAudio(
    audioContent: Uint8Array,
    languageCode = 'en-US',
  ): Promise<string> {
    const [response] = await this.client.recognize({
      audio: {
        content: audioContent,
      },
      config: {
        encoding: 'LINEAR16',
        languageCode,
      },
    });
    return response.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n');
  }
}
