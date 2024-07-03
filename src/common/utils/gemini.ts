import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { ENVIRONMENT } from '../configs/environment';

@Injectable()
export class Gemini {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(ENVIRONMENT.GOOGLE.GEMINI.API_KEY);
  }

  async generateTranscriptFromAudio(audioBuffer: Buffer, mimeType: string) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const prompt = `You are an assistant for doctors. You receive an audio recording of conversation between patient and doctor. Generate an array of text separated by commas, based on this schema: ["Hi doctor", "I am feeling unwell", "When did it start?"]`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: audioBuffer.toString('base64'),
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  }

  async generateNotesFromTranscript(transcript: string) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const prompt = `Convert the following doctor-patient conversation transcript into structured medical notes using this JSON format:
    {
      "note": {
        "title": "(suggest a title name that's simple)",
        "sections": [
          {
            "key": "CHIEF_COMPLAINT",
            "title": "Chief complaint",
            "text": "",
            "content": []
          },
          // ... (include all other sections as in the original code)
        ]
      },
      "suggested_dot_phrases": null
    }
    
    For each section:
    - Extract relevant information from the transcript.
    - Populate the "text" field with a bulleted list of key points, using "\\n" for line breaks.
    - Populate the "content" array with individual items from the bulleted list.
    - If a section has no relevant information, leave "text" as an empty string and "content" as an empty array.
    - Use appropriate medical terminology.
    - Aim for clear, concise notes useful for healthcare providers.
    
    Transcript: ${transcript}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }

  async generatePatientInstructionsFromTranscript(transcript: string) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const prompt = `Generate instructions and next steps for patients from the following transcript. Use this JSON format:
    {
      "messageFromDoctor": "",
      "medication": [
        {
          "action": "",
          "details": ""
        }
      ],
      "lifestyleChanges": [
        {
          "action": "",
          "details": ""
        }
      ],
      "followUp": [
        {
          "action": "",
          "details": ""
        }
      ],
      "otherInstructions": [
        {
          "action": "",
          "details": ""
        }
      ]
    }
    
    For the "messageFromDoctor" field, include a brief, kind message summarizing the visit and offering encouragement to the patient.
    Ensure each instruction is clear, concise, and directly related to the patient's care. If a category has no relevant instructions, leave it as an empty array.
    
    Transcript: ${transcript}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  }
}
