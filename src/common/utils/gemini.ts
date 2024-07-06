import { GoogleAIFileManager } from '@google/generative-ai/files';
import { Injectable } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GenerationConfig,
  Content,
  Part,
} from '@google/generative-ai';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { ENVIRONMENT } from '../configs/environment';
import { transcribeAudioBuffer } from './openai';

@Injectable()
export class Gemini {
  private genAI: GoogleGenerativeAI;
  private generationConfig: GenerationConfig;

  constructor() {
    this.genAI = new GoogleGenerativeAI(ENVIRONMENT.GOOGLE.GEMINI.API_KEY);
    this.generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    };
  }

  async generateTranscriptFromAudio(file, mimeType: string) {
    const transcript = await transcribeAudioBuffer(file);
    const systemInstruction: Content = {
      role: 'system',
      parts: [
        {
          text: `You are an assistant for doctors. You receive an audio transcript of conversation between patient and doctor and generate an array of text separated by commas, based on this schema:
          ["Hi doctor", "I am feeling unwell", "When did it start?"]
          Extract relevant information from the transcript.
          If a section has no relevant information, leave it as an empty string.
          Use appropriate medical terminology.`,
        },
      ],
    };
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: this.generationConfig,
      systemInstruction,
    });
    const prompt = `Transcribe and analyze the following audio:`;

    const result = await model.generateContent([
      prompt,
      {
        text: transcript,
      },
    ]);
    console.log(result);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  async generateNotesFromTranscript(transcript: string) {
    const systemInstruction: Content = {
      role: 'system',
      parts: [
        {
          text: `You are a medical notes AI that converts doctor-patient conversation transcript into structured medical notes using a specific JSON format.
          For each section:
          - Extract relevant information from the transcript.
          - Populate the "text" field with a bulleted list of key points, using "\\n" for line breaks.
          - Populate the "content" array with individual items from the bulleted list.
          - If a section has no relevant information, leave "text" as an empty string and "content" as an empty array.
          - Use appropriate medical terminology.
          - Aim for clear, concise notes useful for healthcare providers.`,
        },
      ],
    };

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      generationConfig: this.generationConfig,
    });

    const userContent = `Convert the following transcript into structured medical notes: ${transcript}`;

    const result = await model.generateContent([userContent]);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  async generatePatientInstructionsFromTranscript(transcript: string) {
    const systemInstruction: Content = {
      role: 'system',
      parts: [
        {
          text: `You are a Patient Instructions AI. Convert the doctor-patient conversation transcript into structured patient instructions in JSON format. Focus on actionable items, medications, lifestyle changes, and follow-up recommendations.
          For the "messageFromDoctor" field, include a brief, kind message summarizing the visit and offering encouragement to the patient.
          Ensure each instruction is clear, concise, and directly related to the patient's care. If a category has no relevant instructions, leave it as an empty array.`,
        },
      ],
    };

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      generationConfig: this.generationConfig,
    });
    const userContent = `Generate patient instructions from the following transcript: ${transcript}`;

    const result = await model.generateContent([userContent]);
    const response = await result.response;
    return JSON.parse(response.text());
  }
}
