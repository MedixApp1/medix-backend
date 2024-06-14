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
} from '@nestjs/websockets';
import { GoogleSpeechService } from 'src/common/utils/google-speech.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
// @Injectable()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  server: Server;

  constructor(private readonly googleSpeechService: GoogleSpeechService) {
    this.server = new Server({ noServer: true });
  }
  handleConnection(client: Socket) {
    console.log('Client connected');
  }

  async handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }

  @SubscribeMessage('speech-to-text')
  async handleMessage(client: Socket, data: any) {
    console.log(data)
    if (data instanceof ArrayBuffer) {
      const audioData = new Uint8Array(data);
      const audioStream = this.createAsyncIterable(audioData);
      try {
        const text =
          await this.googleSpeechService.convertSpeechToTextStream(audioStream);
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
