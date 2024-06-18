import { GoogleAIFileManager } from '@google/generative-ai/files';
import { ENVIRONMENT } from '../configs/environment';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { Storage } from '@google-cloud/storage';
import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';
import { Injectable } from '@nestjs/common';
import { Appointment } from 'src/modules/appointment/appointment.schema';
import { Stream } from 'stream';
import * as stream from 'stream';
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

  // [END storage_stream_file_upload]
  
  async uploadFile(file: Express.Multer.File, mimeType: string) {
    const storage = new Storage({
      projectId: apiKey.project_id,
      keyFilename: ENVIRONMENT.GOOGLE.CLOUD.API_KEY,
    });

    try {
      const bucket = storage.bucket('medix-audio');
      
      const newFilename = `medix_audio_${Date.now()}`;
      const newFile = bucket.file(newFilename);
      const passThroughStream = new stream.PassThrough();

      passThroughStream.write(file.buffer, (error) => {
        console.log(error);
      });
      passThroughStream
      .on('pipe', () => {
        console.log('upload started');
      })
      .on('error', () => {
        console.log('error dey');
      });
      passThroughStream.end();
      
      async function streamFileUpload() {
        passThroughStream.pipe(newFile.createWriteStream()).on('finish', () => {
          // The file upload is complete
        });
    
        return 'successs';
      }
      streamFileUpload().catch(console.error);
      passThroughStream
      .pipe(newFile.createWriteStream())
      .on('finish', () => {
        return {
            name: newFilename,
            size: (file.size / (1024 * 1024)).toFixed(2),
            mimeType: file.mimetype,
            publicUrl: `https://storage.cloud.google.com/medix-audio/${newFilename}`,
            url: `gs://medix-audio/${newFilename}`,
          };
        })
        .on('close', () => console.log('file stopped'))
        .on('drain', () => console.log('drained'));
      // await newFile.save(file.buffer, {
      //   contentType: mimeType,
      //   gzip: true,
      //   metadata: {
      //     cacheControl: 'public, max-age=31536000',
      //   },
      // });

      // return {
      //   name: newFilename,
      //   size: (file.size / (1024 * 1024)).toFixed(2),
      //   mimeType: file.mimetype,
      //   publicUrl: `https://storage.cloud.google.com/medix-audio/${newFilename}`,
      //   url: `gs://medix-audio/${newFilename}`,
      // };
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
  async generateNotesFromTranscript(transcript: string) {
    const generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
      response_mime_type: 'application/json',
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
        "title": "(suggest a title name that's simple)",
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
    const contentResponse = JSON.parse(
      resp.response.candidates[0].content.parts[0].text,
    );
    console.log(contentResponse);
    // let jsonContent = contentResponse
    //   .replace(/```json\n/, '')
    //   .replace(/\n```$/, '');
    // jsonContent = JSON.parse(jsonContent);
    // console.log(jsonContent, 'stuff');
    return contentResponse as unknown as Appointment['note'];
  }

  async generatePatientInstructionsfFromTranscript(transcript: string) {
    const generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
      response_mime_type: 'application/json',
    };

    // const functionDeclarations: Tool[] = [
    //   {
    //     functionDeclarations: [
    //       {
    //         name: 'get_patient_medication',
    //         description: 'get the patient medication from transcript',
    //         parameters: {
    //           type: FunctionDeclarationSchemaType.OBJECT,
    //           properties: {
    //             action: { type: FunctionDeclarationSchemaType.STRING },
    //             details: { type: FunctionDeclarationSchemaType.STRING },
    //           },
    //           required: ['action', 'details'],
    //         },
    //       },
    //       {
    //         name: 'get_patient_lifestyle_changes',
    //         description: 'get the patient lifestyle changes from transcript',
    //         parameters: {
    //           type: FunctionDeclarationSchemaType.OBJECT,
    //           properties: {
    //             action: { type: FunctionDeclarationSchemaType.STRING },
    //             details: { type: FunctionDeclarationSchemaType.STRING },
    //           },
    //           required: ['action', 'details'],
    //         },
    //       },
    //       {
    //         name: 'get_patient_follow_up',
    //         description: 'get the patient follow up from transcript',
    //         parameters: {
    //           type: FunctionDeclarationSchemaType.OBJECT,
    //           properties: {
    //             action: { type: FunctionDeclarationSchemaType.STRING },
    //             details: { type: FunctionDeclarationSchemaType.STRING },
    //           },
    //           required: ['action', 'details'],
    //         },
    //       },
    //       {
    //         name: 'get_patient_other_instructions',
    //         description: 'get the patient other instructions from transcript',
    //         parameters: {
    //           type: FunctionDeclarationSchemaType.OBJECT,
    //           properties: {
    //             action: { type: FunctionDeclarationSchemaType.STRING },
    //             details: { type: FunctionDeclarationSchemaType.STRING },
    //           },
    //           required: ['action', 'details'],
    //         },
    //       },
    //     ],
    //   },
    // ];
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
      generationConfig: generationConfig,
    };

    const model = this.vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Patient Instructions AI',
        parts: [
          {
            text: `
            Convert the following doctor-patient conversation transcript into structured patient instructions in JSON format. Focus on actionable items, medications, lifestyle changes, and follow-up recommendations. Use this structure:

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

For the "message_from_doctor" field, include a brief, kind message summarizing the visit and offering encouragement to the patient.

Ensure each instruction is clear, concise, and directly related to the patient's care. If a category has no relevant instructions, leave it as an empty array.`,
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
    const stringe = JSON.parse(contentResponse);
    return stringe;
  }
}
