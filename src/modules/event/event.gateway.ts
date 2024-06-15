/* eslint-disable @typescript-eslint/no-unused-vars */
// ws.gateway.ts
// import { Injectable } from '@nestjs/common';
import WebSocket, { Server } from 'ws';
import { Socket } from 'socket.io';

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketServer,
} from '@nestjs/websockets';
import { SpeechService } from 'src/common/utils/google-speech.service';
import { OnModuleInit } from '@nestjs/common';
import { IsBase64, isBase64 } from 'class-validator';
import { createWriteStream } from 'fs';
import { createClient } from '@deepgram/sdk';
import { ENVIRONMENT } from 'src/common/configs/environment';
import { setupDeepgram } from 'src/common/utils/helper';
import { Readable } from 'stream';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private speechService: SpeechService) {}

  handleConnection(client: Socket) {
    console.log(`** a user connected - ${client.id} **\n`);
  }

  handleDisconnect(client: Socket) {
    console.log('** user disconnected **\n');
  }

  @SubscribeMessage('test')
  handleMessage(client: WebSocket, message: string) {
    const deepgram = setupDeepgram(client);
    console.log(deepgram);
    deepgram.send(message);
  }

  @SubscribeMessage('speech-to-text')
  handleStartStream(client: Socket, data: any) {
    const audio = JSON.parse(data);
    const audioBuffer = Buffer.from(audio.payload, 'base64');
    console.log('** starting google cloud stream **\n');
    this.speechService.startRecognitionStream(client, audioBuffer);
  }

  @SubscribeMessage('end-speech-to-text')
  handleEndStream() {
    console.log('** ending google cloud stream **\n');
    this.speechService.stopRecognitionStream();
  }

  @SubscribeMessage('send-audio-data')
  handleAudioData(client: Socket, audioData: { audio: Buffer }) {
    this.server.emit('receive_message', 'Got audio data');
    this.speechService.handleAudioData(audioData);
  }
}
