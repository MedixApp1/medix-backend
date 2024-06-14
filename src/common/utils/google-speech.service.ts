// google-speech.service.ts
import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
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
}

@Injectable()
export class SpeechService {
  private speechClient: SpeechClient;
  private recognizeStream: any = null;
  private transcript: any;
  private currentOffset: number;

  constructor() {
    this.speechClient = new SpeechClient({ apiKey });
    this.transcript = null;
    this.currentOffset = 0;
  }

  startRecognitionStream(client: Socket, data: any) {
    console.log('* StartRecognitionStream\n');
    try {
      this.recognizeStream = this.speechClient
        .streamingRecognize(this.getRequest())
        .on('error', console.error)
        .on('data', (data) => {
          console.log(data)
          const result = data.results[0];
          const isFinal = result.isFinal;

          const transcription = data.results
            .map((result) => result.alternatives[0].transcript)
            .join('\n');

          console.log(`Transcription: `, transcription);

          this.transcript = {
            id: `generated_id_${Math.random().toString(36).substring(2, 15)}`,
            text: transcription,
            start_offset_ms: this.currentOffset,
            end_offset_ms:
              this.currentOffset + result.resultEndTime.nanos * 1000,
            is_final: isFinal,
            object: 'transcript_item',
          };

          if (data.results[0] && data.results[0].isFinal) {
            this.stopRecognitionStream();
            this.startRecognitionStream(client, data);
            console.log('restarted stream serverside');
          }
        })
        .write(data.audio);
      return this.transcript;
    } catch (err) {
      console.error('Error streaming google api ' + err);
    }
  }

  stopRecognitionStream() {
    if (this.recognizeStream) {
      console.log('* StopRecognitionStream \n');
      this.recognizeStream.end();
    }
    this.recognizeStream = null;
  }

  handleAudioData(audioData: { audio: Buffer }) {
    if (this.recognizeStream !== null) {
      try {
        this.recognizeStream.write(audioData.audio);
      } catch (err) {
        console.log('Error calling google api ' + err);
      }
    } else {
      console.log('RecognizeStream is null');
    }
  }

  private getRequest() {
    return {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
        enableSpeakerDiarization: true,
        model: 'command_and_search',
        useEnhanced: true,
      },
      interimResults: true,
    } as google.cloud.speech.v1.IStreamingRecognitionConfig;
  }
}

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

// // transcripts.push(transcript);
// // this.currentOffset = transcript.end_offset_ms;
// // transcripts.push(result)

// return result;
