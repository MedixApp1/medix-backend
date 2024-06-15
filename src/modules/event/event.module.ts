import { Module } from '@nestjs/common';
import {  SpeechService } from 'src/common/utils/google-speech.service';
import { EventGateway } from './event.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [SpeechService, EventGateway],
})
export class EventModule {}
