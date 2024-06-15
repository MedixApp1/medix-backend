import { readFileSync } from 'fs';
import { Speechmatics } from 'speechmatics';

const API_KEY = 'fzC6U1xOZRb1N5E30QsRMDDqnXnXDwxQ';
const PATH_TO_FILE = '../medix-backend/src/common/utils/example.wav';

const session = new Speechmatics({ apiKey: API_KEY });

const inputFile = new Blob([readFileSync(PATH_TO_FILE)]);



export const audioToText = async (file: Blob) => {
  const transcript = await session.batch.transcribe({
    input: file,
    transcription_config: { language: 'en' },
    format: 'text',
  });
  return transcript;
};
