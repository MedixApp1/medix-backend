// ws.gateway.ts
import { Injectable } from '@nestjs/common';
import { Server } from 'ws';
import Socket = require('ws');

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { GoogleSpeechService } from 'src/common/utils/google-speech.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'speech-to-text',
})
@Injectable()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  server: Server;

  constructor(private readonly googleSpeechService: GoogleSpeechService) {
    this.server = new Server({ noServer: true });
  }

  handleConnection(client: Socket) {
    console.log('Client connected', client);
  }

  async handleDisconnect(client: Socket) {
    console.log('Client disconnected', client);
  }

  async handleMessage(client: Socket, message: any) {
    if (message instanceof ArrayBuffer) {
      const audioData = new Uint8Array(message);
      try {
        const text = await this.googleSpeechService.transcribeAudio(audioData);
        client.send(text);
      } catch (error) {
        console.error('Error during speech recognition:', error);
        client.send('Error processing audio');
      }
    } else {
      console.warn('Received non-audio data on WebSocket');
    }
  }
}
