import { Module } from '@nestjs/common';
import { GoogleSpeechService } from 'src/common/utils/google-speech.service';
import { EventGateway } from './event.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [GoogleSpeechService, EventGateway],
})
export class EventModule {}
