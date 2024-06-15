import { LiveTranscriptionEvents, createClient } from '@deepgram/sdk';
import * as bcrypt from 'bcrypt';
import { ENVIRONMENT } from '../configs/environment';

export class BaseHelper {
  static async hashData(data: string) {
    return await bcrypt.hash(data, 12);
  }

  static async compareHashedData(data: string, hashed: string) {
    return await bcrypt.compare(data, hashed);
  }
}
let keepAlive;
const deepgramClient = createClient(ENVIRONMENT.DEEPGRAM.API_KEY);
export const setupDeepgram = (ws) => {
  const deepgram = deepgramClient.listen.live({
    smart_format: true,
    model: 'nova-2',
  });

  if (keepAlive) clearInterval(keepAlive);
  keepAlive = setInterval(() => {
    console.log('deepgram: keepalive');
    deepgram.keepAlive();
  }, 10 * 1000);

  deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
    console.log('deepgram: connected');

    deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      console.log('deepgram: transcript received');
      console.log('ws: transcript sent to client');
      ws.send(JSON.stringify(data));
    });

    deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
      console.log('deepgram: disconnected');
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
      console.log('deepgram: error received');
      console.error(error);
    });

    deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
      console.log('deepgram: warning received');
      console.warn(warning);
    });

    deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
      console.log('deepgram: metadata received');
      console.log('ws: metadata sent to client');
      ws.send(JSON.stringify({ metadata: data }));
    });
  });

  return deepgram;
};
