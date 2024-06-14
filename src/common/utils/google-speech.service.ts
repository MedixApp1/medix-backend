// google-speech.service.ts
import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import recoder from 'node-record-lpcm16';
import { google } from '@google-cloud/speech/build/protos/protos';
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
    // isFinal = false,
    // languageCode = 'en-US',
  ) {
    // Creates a client
    const client = this.client;

    /**
     * TODO(developer): Uncomment the following lines before running the sample.
     */
    const encoding = 'LINEAR16';
    const sampleRateHertz = 16000;
    const languageCode = 'en-US';

    const request = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: 'en-US',
        //alternativeLanguageCodes: alternativeLanguageCodes,
        enableWordTimeOffsets: true,
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
        enableSpeakerDiarization: true,
        //diarizationSpeakerCount: 2,
        //model: "video",
        model: 'command_and_search',
        //model: "default",
        useEnhanced: true,
      },
      interimResults: true,
    };

    // Create a recognize stream
    const recognizeStream = client
      .streamingRecognize(
        request as google.cloud.speech.v1.IStreamingRecognitionConfig,
      )
      .on('error', console.error)
      .on('data', (data) =>
        process.stdout.write(
          data.results[0] && data.results[0].alternatives[0]
            ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
            : '\n\nReached transcription time limit, press Ctrl+C\n',
        ),
      );

    // Start recording and send the microphone input to the Speech API.
    // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies

    // const transcript = {
    //   id: `generated_id_${Math.random().toString(36).substring(2, 15)}`,
    //   text: response.results
    //     .map((result) => result.alternatives[0].transcript)
    //     .join('\n'),
    //   start_offset_ms: this.currentOffset,
    //   end_offset_ms:
    //     this.currentOffset + result.resultEndTime.nanos || 0 * 1000,
    //   is_final: isFinal,
    //   object: 'transcript_item',
    // };

    // transcripts.push(transcript);
    // this.currentOffset = transcript.end_offset_ms;
    // transcripts.push(result)

    return result;
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
