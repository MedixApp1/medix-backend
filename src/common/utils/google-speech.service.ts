// google-speech.service.ts
import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
// import { SpeechClient } from '@google-cloud/speech';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { google } from '@google-cloud/speech/build/protos/protos';
import { Readable, Writable } from 'stream';
import { createReadStream } from 'fs';
import { v1p1beta1 as speech } from '@google-cloud/speech';

@Injectable()
export class SpeechService {
  private speechClient: speech.SpeechClient;
  private recognizeStream: any = null;
  private transcript: any;
  private currentOffset: number;
  private audioOutputStream: WritableStream;
  restartCounter = 0;
  audioInput = [];
  lastAudioInput = [];
  resultEndTime = 0;
  isFinalEndTime = 0;
  finalRequestEndTime = 0;
  newStream = true;
  bridgingOffset = 0;
  lastTranscriptWasFinal = false;
  streamingLimit: number;

  constructor() {
    this.speechClient = new speech.SpeechClient({ apiKey });
    this.transcript = null;
    this.currentOffset = 0;
    this.audioOutputStream = null;
    this.recognizeStream = null;
    this.restartCounter = 0;
    this.audioInput = [];
    this.lastAudioInput = [];
    this.resultEndTime = 0;
    this.isFinalEndTime = 0;
    this.finalRequestEndTime = 0;
    this.newStream = true;
    this.bridgingOffset = 0;
    this.lastTranscriptWasFinal = false;
    this.streamingLimit = 10000; // ms
  }

  startRecognitionStream(client: Socket, data: any) {
    console.log('* StartRecognitionStream\n');
    try {
      this.recognizeStream = this.speechClient
        .streamingRecognize(this.getRequest())
        .on('error', (error) => console.error(`API Error: ${error}`))
        .on('data', (data) => this.speechCallback(client, data));
      const audioStream = new Readable({
        read() {
          data ? this.push(data) : this.push(null);
          // this.push(null); // Signal end of stream
        },
      });
      audioStream.pipe(this.recognizeStream);
      console.log('recognition stream started');

      return this.transcript;
    } catch (err) {
      console.error('Error streaming google api ' + err);
    }
  }
  speechCallback(client, data) {
    this.resultEndTime =
      data.results[0].resultEndTime.seconds * 1000 +
      Math.round(data.results[0].resultEndTime.nanos / 1000000);

    // Calculate correct time based on offset from audio sent twice
    const correctedTime =
      this.resultEndTime -
      this.bridgingOffset +
      this.streamingLimit * this.restartCounter;

    const result = data.results[0];
    const isFinal = result.isFinal;
    console.log('isFinal: ', isFinal);

    const transcription = data.results
      .map((result) => result.alternatives[0].transcript)
      .join('\n');

    if (data.results[0] && data.results[0].alternatives[0]) {
      console.log(`${correctedTime}: `, transcription);
    }

    if (data.results[0].isFinal) {
      this.isFinalEndTime = this.resultEndTime;
      this.lastTranscriptWasFinal = true;
    } else {
      this.lastTranscriptWasFinal = false;
    }

    this.transcript = {
      id: `generated_id_${Math.random().toString(36).substring(2, 15)}`,
      text: transcription,
      start_offset_ms: this.currentOffset,
      end_offset_ms: this.currentOffset + result.resultEndTime.nanos * 1000,
      is_final: isFinal,
      object: 'transcript_item',
    };
    client.emit('recieved-text', this.transcript);

    if (data.results[0] && data.results[0].isFinal) {
      this.stopRecognitionStream();
      this.startRecognitionStream(client, data);
      console.log('restarted stream serverside');
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

// interface TranscriptItem {
//   id: string;
//   text: string;
//   start_offset_ms: number;
//   end_offset_ms: number;
//   is_final: boolean;
//   object: string;
// }
