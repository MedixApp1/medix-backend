import { ENVIRONMENT } from '../configs/environment';
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import { Uploadable } from 'openai/uploads';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENVIRONMENT.OPENAI.API_KEY,
});
function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  // stream.push(null); // Signals the end of the stream
  return stream;
}
export async function transcribeAudioBuffer(file): Promise<string> {
  try {
    // Create a readable stream from the file buffer
    const transcription = await openai.audio.transcriptions.create({
      file: new File([file.buffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      // prompt: `You are an assistant for doctors. You receive an audio transcript of conversation between patient and doctor and generate an array of text separated by commas, based on this schema:
      //     ["Hi doctor", "I am feeling unwell", "When did it start?"]
      //     Extract relevant information from the transcript.
      //     If a section has no relevant information, leave it as an empty string.`,
    });
    console.log(transcription);
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

export async function processTranscript(file): Promise<string[]> {
  const transcript = await transcribeAudioBuffer(file);
  const prompt = `
    You are an assistant for doctors. You receive an audio transcript of conversation between patient and doctor and generate an array of text separated by commas, based on this schema:
    ["Hi doctor", "I am feeling unwell", "When did it start?"].

    Transcript: ${transcript}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const result = response.choices[0].message.content;
    console.log(result);

    return JSON.parse(result as string);
  } catch (error) {
    console.error('Error processing transcript:', error);
    throw error;
  }
}

// // This function would be called from your API endpoint
// export async function handleAudioBuffer(
//   audioBuffer: Buffer,
// ): Promise<string[]> {
//   try {
//     console.log('Transcribing audio...');
//     const transcript = await transcribeAudioBuffer(audioBuffer);
//     console.log('Transcript:', transcript);

//     console.log('Processing transcript...');
//     const processedResult = await processTranscript(transcript);
//     console.log('Processed result:', processedResult);

//     return processedResult;
//   } catch (error) {
//     console.error('An error occurred:', error);
//     throw error;
//   }
// }
