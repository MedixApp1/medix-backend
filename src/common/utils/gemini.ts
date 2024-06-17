import { GoogleAIFileManager } from '@google/generative-ai/files';
import { ENVIRONMENT } from '../configs/environment';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { Storage } from '@google-cloud/storage';
import {
  FunctionDeclarationSchemaType,
  GenerateContentRequest,
  GenerateContentResult,
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  Tool,
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
      console.log(metadata);

      return {
        name: metadata.name,
        size: metadata.size,
        mimeType: metadata.contentType,
        publicUrl: `https://storage.cloud.google.com/medix-conversation-audio/${metadata.name}`,
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
      text: `audio`,
    };

    const request = {
      contents: [{ role: 'user', parts: [filePart, textPart] }],
    };
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Medical Transcription AI',
        parts: [
          {
            text: `You are an assistant for doctors. You receive an audio recording of conversation between patient and doctor and generate an array of text seperated by commas, based on this schema:
            ["Hi doctor", I am feeling unwell", "When did it start?"]
            `,
          },
        ],
      },
    });
    const resp = await generativeModel.generateContent(request);
    const contentResponse = resp.response.candidates[0].content.parts[0].text;
    const stringe = JSON.parse(contentResponse);
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
  async generateNotesFromTranscript(transcript: string, country: string) {
    const generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
    };

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Convert the following doctor-patient conversation transcript into structured medical notes`,
            },
            {
              text: ` transcript: 
              ${transcript}`,
            },
          ],
        },
      ],
      generationConfig: generationConfig,
    };

    const model = this.vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Medical Notes AI',
        parts: [
          {
            text: `You are a medical notes AI that converts doctor-patient conversation transcript into structured medical notes using this JSON format`,
          },
          {
            text: `The JSON format:
            {
    "note": {
        "title": "Encounter",
        "sections": [
            {
                "key": "CHIEF_COMPLAINT",
                "title": "Chief complaint",
                "text": "",
                "content": []
            },
            {
                "key": "HISTORY_OF_PRESENT_ILLNESS",
                "title": "History of present illness",
                "text": "",
                "content": []
            },
            {
                "key": "PAST_MEDICAL_HISTORY",
                "title": "Past medical history",
                "text": "",
                "content": []
            },
            {
                "key": "CURRENT_MEDICATIONS",
                "title": "Current medications",
                "text": "",
                "content": []
            },
            {
                "key": "ALLERGIES",
                "title": "Allergies",
                "text": "",
                "content": []
            },
            {
                "key": "REVIEW_OF_SYSTEMS",
                "title": "Review of systems",
                "text": "",
                "content": []
            },
            {
                "key": "PHYSICAL_EXAMINATION",
                "title": "Physical examination",
                "text": "",
                "content": []
            },
            {
                "key": "ASSESSMENT",
                "title": "Assessment",
                "text": "",
                "content": []
            },
            {
                "key": "PLAN",
                "title": "Plan",
                "text": "",
                "content": []
            },
            {
                "key": "PRESCRIPTION",
                "title": "Prescription",
                "text": "",
                "content": []
            },
            {
                "key": "FOLLOW_UP",
                "title": "Follow-up",
                "text": "",
                "content": []
            },
            {
                "key": "SOCIAL_HISTORY",
                "title": "Social history",
                "text": "",
                "content": []
            }
        ]
    },
    "suggested_dot_phrases": null
}`,
          },

          {
            text: `For each section:`,
          },
          {
            text: `Extract relevant information from the transcript.`,
          },
          {
            text: `Populate the "text" field with a bulleted list of key points, using "\n" for line breaks.`,
          },
          {
            text: `Populate the "content" array with individual items from the bulleted list.`,
          },
          {
            text: `If a section has no relevant information, leave "text" as an empty string and "content" as an empty array`,
          },
          {
            text: `Use appropriate medical terminology`,
          },
          {
            text: `Aim for clear, concise notes useful for healthcare providers.`,
          },
        ],
      },
    });
    const resp = await model.generateContent(request);
    const contentResponse = resp.response.candidates[0].content.parts[0].text;
    console.log(contentResponse);
    const jsonContent = this.extractJson(contentResponse);
    console.log(jsonContent);
    return jsonContent;
  }

  async generatePatientInstructionsfFromTranscript(transcript: string) {
    const generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
    };

    const functionDeclarations: Tool[] = [
      {
        functionDeclarations: [
          {
            name: 'get_patient_medication',
            description: 'get the patient medication from transcript',
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                action: { type: FunctionDeclarationSchemaType.STRING },
                details: { type: FunctionDeclarationSchemaType.STRING },
              },
              required: ['action', 'details'],
            },
          },
          {
            name: 'get_patient_lifestyle_changes',
            description: 'get the patient lifestyle changes from transcript',
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                action: { type: FunctionDeclarationSchemaType.STRING },
                details: { type: FunctionDeclarationSchemaType.STRING },
              },
              required: ['action', 'details'],
            },
          },
          {
            name: 'get_patient_follow_up',
            description: 'get the patient follow up from transcript',
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                action: { type: FunctionDeclarationSchemaType.STRING },
                details: { type: FunctionDeclarationSchemaType.STRING },
              },
              required: ['action', 'details'],
            },
          },
          {
            name: 'get_patient_other_instructions',
            description: 'get the patient other instructions from transcript',
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                action: { type: FunctionDeclarationSchemaType.STRING },
                details: { type: FunctionDeclarationSchemaType.STRING },
              },
              required: ['action', 'details'],
            },
          },
        ],
      },
    ];
    const toolConfig = {
      function_calling_config: {
        mode: 'ANY',
        // allowed_function_names: [
        //   'get_patient_medication',
        //   'get_patient_lifestyle_changes',
        //   'get_patient_follow_up',
        //   'get_patient_other_instructions',
        // ],
      },
    };
    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate instructions and next steps for patients from the following transcript`,
            },
            {
              text: `${transcript}`,
            },
          ],
        },
      ],
      tools: functionDeclarations,
      toolConfig: toolConfig,
      generationConfig: generationConfig,
    };

    const model = this.vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Patient Instructions AI',
        parts: [
          {
            text: `You are a patient instructions AI that generates instructions and next steps for patients from doctor-patient consultation based on a transcript sent by the user`,
          },
        ],
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    const resp = await model.generateContent(request);
    const contentResponse = resp.response.candidates[0].content.parts[0].text;
    console.log(resp.response.candidates[0].content.parts[0]);
    const stringe = this.extractJson(contentResponse);
    console.log(stringe);
    return stringe;
  }
}
