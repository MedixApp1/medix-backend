// google-speech.service.ts
import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import * as apiKey from '../../medix-424107-59f23af2a167.json';

interface TranscriptItem {
  id: string;
  text: string;
  start_offset_ms: number;
  end_offset_ms: number;
  is_final: boolean;
  object: string;
}

@Injectable()
export class GoogleSpeechService {
  private client: SpeechClient; // Speech recognition client
  private currentOffset = 0; // Tracks accumulated audio offset

  constructor() {
    this.client = new SpeechClient({ apiKey });
  }

  async convertSpeechToText(
    audioContent: Uint8Array,
    isFinal = false,
    languageCode = 'en-US',
  ): Promise<TranscriptItem[]> {
    const transcripts: TranscriptItem[] = [];

    const [response] = await this.client.recognize({
      audio: {
        content: audioContent,
      },
      config: {
        encoding: 'LINEAR16',
        languageCode,
      },
    });

    // Assuming a single transcript per buffer, extract directly
    const result = response.results[0]; // Access the first result (assuming one per buffer)
    const transcript = {
      id: `generated_id_${Math.random().toString(36).substring(2, 15)}`,
      text: response.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n'),
      start_offset_ms: this.currentOffset,
      end_offset_ms: this.currentOffset + result.resultEndTime.nanos * 1000,
      is_final: isFinal,
      object: 'transcript_item',
    };

    transcripts.push(transcript);
    this.currentOffset = transcript.end_offset_ms;

    return transcripts;
  }

  async convertSpeechToTextStream(
    audioChunks: AsyncIterableIterator<Uint8Array>,
  ): Promise<TranscriptItem[]> {
    const transcripts: TranscriptItem[] = [];
    let isFinal = false;

    for await (const audioChunk of audioChunks) {
      const chunkTranscripts = await this.convertSpeechToText(
        audioChunk,
        isFinal,
      );
      transcripts.push(...chunkTranscripts);
      isFinal = true; // Set isFinal to true for subsequent chunks
    }

    return transcripts;
  }
}
