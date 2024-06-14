/* eslint-disable @typescript-eslint/no-unused-vars */
// ws.gateway.ts
// import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
// @Injectable()
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
  handleMessage(client: Socket, message: string) {
    console.log('message: ' + message);
    setTimeout(() => {
      this.server.emit('receive_message', 'got this message' + message);
    }, 1000);
  }

  @SubscribeMessage('speech-to-text')
  handleStartStream(client: Socket, data: any) {
    this.speechService.startRecognitionStream(client, data);
  }

  @SubscribeMessage('endGoogleCloudStream')
  handleEndStream() {
    console.log('** ending google cloud stream **\n');
    this.speechService.stopRecognitionStream();
  }

  @SubscribeMessage('stuff')
  handleAudioData(client: Socket, audioData: { audio: Buffer }) {
    this.server.emit('receive_message', 'Got audio data');
    this.speechService.handleAudioData(audioData);
  }
}
