import { GoogleAIFileManager } from '@google/generative-ai/files';
import { ENVIRONMENT } from '../configs/environment';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { Storage } from '@google-cloud/storage';
import {
  // FunctionDeclarationSchemaType,
  // GenerateContentRequest,
  // GenerateContentResult,
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  // Tool,
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
      text: `Generate transcription with timestamps from the audio, only extract speech and ignore background audio.`,
    };

    const request = {
      contents: [{ role: 'user', parts: [filePart, textPart] }],
    };
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Transcriber',
        parts: [
          {
            text: `You are an assistant for doctors. You receive an audio recording of conversation between patient and doctors and generate an array of JSON object in this schema:
            {
              "text": text of the speech,
              "speaker": "Patient" or "Doctor",
              "start_offset_ms": start offset of the speech in milliseconds,
              "end_offset_ms": end offset of the speech in milliseconds
            }`,
          },
        ],
      },
    });
    const resp = await generativeModel.generateContent(request);
    const contentResponse = resp.response.candidates[0].content.parts[0].text;
    const stringe = this.extractJson(contentResponse);
    return stringe;
  }
  extractJson(textResponse) {
    // This pattern matches a string that starts with '{' and ends with '}'
    const pattern = /\{[^{}]*\}/g;

    let match;
    const jsonObjects = [];

    while ((match = pattern.exec(textResponse)) !== null) {
      const jsonStr = match[0];
      try {
        // Validate if the extracted string is valid JSON
        const jsonObj = JSON.parse(jsonStr);
        jsonObjects.push(jsonObj);
      } catch (error) {
        // Extend the search for nested structures
        const extendedJsonStr = this.extendSearch(textResponse, [
          match.index,
          pattern.lastIndex,
        ]);
        try {
          const jsonObj = JSON.parse(extendedJsonStr);
          jsonObjects.push(jsonObj);
        } catch (error) {
          // Handle cases where the extraction is not valid JSON
          continue;
        }
      }
    }

    if (jsonObjects.length > 0) {
      return jsonObjects;
    } else {
      return null; // Or handle this case as you prefer
    }
  }

  extendSearch(text, span) {
    // Extend the search to try to capture nested structures
    const [start, end] = span;
    let nestCount = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') {
        nestCount++;
      } else if (text[i] === '}') {
        nestCount--;
        if (nestCount === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
    return text.slice(start, end);
  }
}

// ```
// async generateTranscriptFromAudio(url: string, mimeType: string) {
//     const functionDeclarations: Tool[] = [
//       {
//         functionDeclarations: [
//           {
//             name: 'generate_transcript',
//             description: 'generate transcript from audio',
//             parameters: {
//               type: FunctionDeclarationSchemaType.OBJECT,
//               properties: {
//                 text: { type: FunctionDeclarationSchemaType.STRING },
//                 speaker: { type: FunctionDeclarationSchemaType.STRING },
//                 start_offset_ms: { type: FunctionDeclarationSchemaType.NUMBER },
//                 end_offset_ms: { type: FunctionDeclarationSchemaType.NUMBER },
//               },
//               required: ['text', 'speaker', 'start_offset_ms', 'end_offset_ms'],
//             },
//           },
//         ],
//       },
//     ];
//     const toolConfig = {
//       function_calling_config: {
//         mode: 'ANY',
//         allowed_function_names: ['generate_transcript'],
//       },
//     };
//     const generationConfig = {
//       temperature: 0.95,
//       topP: 1.0,
//       maxOutputTokens: 8192,
//     };

//     const filePart = {
//       fileData: {
//         fileUri: url,
//         mimeType: mimeType,
//       },
//     };
//     const textPart = {
//       text: `Generate transcription with timestamps from the audio, only extract speech and ignore background audio.`,
//     };

//     const request = {
//       contents: [{ role: 'user', parts: [filePart, textPart] }],
//       tools: functionDeclarations,
//       toolConfig: toolConfig,
//       generationConfig: generationConfig,
//     };

//     const model = this.vertexAI.preview.getGenerativeModel({
//       model: 'gemini-1.5-flash-001',
//     });
//     const resp = await model.generateContent(request);
//     const contentResponse = resp.response.candidates[0].content;
//     return contentResponse;
//   }
// }
// ```
