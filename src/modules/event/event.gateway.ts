/* eslint-disable @typescript-eslint/no-unused-vars */
// ws.gateway.ts
// import { Injectable } from '@nestjs/common';
import { Server } from 'ws';
import Socket = require('ws');

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketServer,
} from '@nestjs/websockets';
import { GoogleSpeechService } from 'src/common/utils/google-speech.service';
import { OnModuleInit } from '@nestjs/common';
import { IsBase64, isBase64 } from 'class-validator';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
// @Injectable()
export class EventGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly googleSpeechService: GoogleSpeechService) {
    this.server = new Server({ noServer: true });
  }
  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log(`Connected with socket id: ${socket.url}`);
    });
  }

  @SubscribeMessage('speech-to-text')
  async handleMessage(client: Socket, data: string) {
    const stuff = JSON.parse(data);
    const audio = stuff.payload;
    if (audio) {
      const audioData = Uint8Array.from(Buffer.from(audio, 'base64'));
      // const audioData = new Uint8Array(audio);
      const audioStream = this.createAsyncIterable(audioData);
      try {
        const text =
          await this.googleSpeechService.convertSpeechToTextStream(audioStream);
        console.log(text);
        client.send(text);
      } catch (error) {
        console.error('Error during speech recognition:', error);
        client.send('Error processing audio');
      }
    } else {
      console.warn('Received non-audio data on WebSocket');
    }
  }

  private async *createAsyncIterable(
    data: Uint8Array,
  ): AsyncIterableIterator<Uint8Array> {
    yield data;
  }
}
