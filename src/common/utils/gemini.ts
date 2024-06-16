import { GoogleAIFileManager } from '@google/generative-ai/files';
import { ENVIRONMENT } from '../configs/environment';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { Storage } from '@google-cloud/storage';
import {
  GenerateContentRequest,
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class Gemini {
  apiKey: string;
  model: GenerativeModel;
  vertexAI: VertexAI;
  fileManager: GoogleAIFileManager;
  constructor() {
    this.vertexAI = new VertexAI({
      project: apiKey.project_id,
      location: 'us-central1',
    });
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    this.fileManager = new GoogleAIFileManager(this.apiKey);
  }
  async uploadFile(file: Express.Multer.File, mimeType: string) {
    const storage = new Storage({
      projectId: apiKey.project_id,
      keyFilename: ENVIRONMENT.GOOGLE.CLOUD.API_KEY,
    });

    const bucket = storage.bucket('medix-conversation-audio');

    // Create a reference to a file object
    const newFile = bucket.file(file.originalname);

    // Upload the buffer to the file
    try {
      await newFile.save(file.buffer, {
        contentType: mimeType, // Adjust this based on your file type
        metadata: {
          // Optional metadata
          cacheControl: 'public, max-age=31536000',
        },
      });

      console.log(
        `${file.originalname} uploaded to ${'medix-conversation-audio'}.`,
      );
      const [metadata] = await newFile.getMetadata();

      return {
        name: metadata.name,
        size: metadata.size,
        mimeType: metadata.contentType,
        url: `gs://${metadata.bucket}/${metadata.name}`,
      };
    } catch (error) {
      console.error('ERROR:', error);
    }
  }

  async generateTranscriptFromAudio(url: string, mimeType: string) {
    const filePart = {
      fileData: {
        fileUri: url,
        mimeType: mimeType,
      },
    };
    const textPart = {
      text: `Generate transcription with timestamps from the audio in Pidgin language, only extract speech and ignore background audio.`,
    };

    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [filePart, textPart] }],
    };

    const resp = await this.model.generateContent(request);
    const contentResponse = resp.response.candidates[0].content;
    return contentResponse;
  }
}
