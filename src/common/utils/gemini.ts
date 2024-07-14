// import { GoogleAIFileManager } from '@google/generative-ai/files';
// import { ENVIRONMENT } from '../configs/environment';
// import * as apiKey from '../../medix-424107-59f23af2a167.json';
// import { Storage } from '@google-cloud/storage';
// import {
//   GenerativeModel,
//   HarmBlockThreshold,
//   HarmCategory,
//   VertexAI,
// } from '@google-cloud/vertexai';
// import { Injectable } from '@nestjs/common';
// import { Appointment } from 'src/modules/appointment/appointment.schema';

// @Injectable()
// export class Gemini {
//   apiKey: string;
//   model: GenerativeModel;
//   vertexAI: VertexAI;
//   fileManager: GoogleAIFileManager;
//   constructor() {
//     this.vertexAI = new VertexAI({
//       project: apiKey.project_id,
//       location: 'us-central1',
//     });
//     this.model = this.vertexAI.getGenerativeModel({
//       model: 'gemini-1.5-flash-001',
//       generationConfig: {
//         maxOutputTokens: 8192,
//         temperature: 1,
//         topP: 0.95,
//       },
//       safetySettings: [
//         {
//           category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
//           threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
//           threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
//           threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//           threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
//         },
//       ],
//     });
//     this.fileManager = new GoogleAIFileManager(this.apiKey);
//   }
//   async uploadFile(file: Express.Multer.File, mimeType: string) {
//     const storage = new Storage({
//       projectId: apiKey.project_id,
//       keyFilename: ENVIRONMENT.GOOGLE.CLOUD.API_KEY,
//     });

//     const bucket = storage.bucket('medix-audio');

//     const newFilename = `medix_audio_${Date.now()}`;
//     const newFile = bucket.file(newFilename);

//     try {
//       await newFile.save(file.buffer, {
//         contentType: mimeType,
//         metadata: {
//           cacheControl: 'public, max-age=31536000',
//         },
//       });

//       console.log(`${file.originalname} uploaded to medix-audio🎉`);

//       return {
//         name: newFilename,
//         size: (file.size / (1024 * 1024)).toFixed(2),
//         mimeType: file.mimetype,
//         publicUrl: `https://storage.cloud.google.com/medix-audio/${newFilename}`,
//         url: `gs://medix-audio/${newFilename}`,
//       };
//     } catch (error) {
//       console.error('ERROR:', error);
//     }
//   }

//   async generateTranscriptFromAudio(url: string, mimeType: string) {
//     const filePart = {
//       fileData: {
//         fileUri: url,
//         mimeType: mimeType,
//       },
//     };
//     const textPart = {
//       text: `audio`,
//     };
//     const generationConfig = {
//       temperature: 0.95,
//       topP: 1.0,
//       maxOutputTokens: 8192,
//       response_mime_type: 'application/json',
//     };

//     const request = {
//       contents: [{ role: 'user', parts: [filePart, textPart] }],
//       generationConfig,
//     };
//     const generativeModel = this.vertexAI.getGenerativeModel({
//       model: 'gemini-1.5-flash-001',
//       systemInstruction: {
//         role: 'Medical Transcription AI',
//         parts: [
//           {
//             text: `You are an assistant for doctors. You receive an audio recording of conversation between patient and doctor and generate an array of text seperated by commas, based on this schema:
//             ["Hi doctor", I am feeling unwell", "When did it start?"]
//             `,
//           },
//           {
//             text: `Extract relevant information from the transcript.`,
//           },
//           {
//             text: `If a section has no relevant information, leave "text" as an empty string.`,
//           },
//           {
//             text: `Use appropriate medical terminology.`,
//           },
//         ],
//       },
//     });
//     const resp = await generativeModel.generateContent(request);
//     const contentResponse = resp.response.candidates[0].content.parts[0].text;
//     const stringe = JSON.parse(contentResponse);
//     return stringe;
//   }

//   async generateNotesFromTranscript(transcript: string) {
//     const generationConfig = {
//       temperature: 0.95,
//       topP: 1.0,
//       maxOutputTokens: 8192,
//       response_mime_type: 'application/json',
//     };
//     const request = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             {
//               text: `Convert the following doctor-patient conversation transcript into structured medical notes`,
//             },
//             {
//               text: ` transcript: 
//               ${transcript}`,
//             },
            
//           ],
//         },
//       ],
//       generationConfig: generationConfig,
//     };

//     const model = this.vertexAI.preview.getGenerativeModel({
//       model: 'gemini-1.5-flash-001',
//       systemInstruction: {
//         role: 'Medical Notes AI',
//         parts: [
//           {
//             text: `You are a medical notes AI that converts doctor-patient conversation transcript into structured medical notes using this JSON format`,
//           },
//           {
//             text: `The JSON format:
//             {
//     "note": {
//         "title": "(suggest a title name that's simple)",
//         "sections": [
//             {
//                 "key": "CHIEF_COMPLAINT",
//                 "title": "Chief complaint",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "HISTORY_OF_PRESENT_ILLNESS",
//                 "title": "History of present illness",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "PAST_MEDICAL_HISTORY",
//                 "title": "Past medical history",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "CURRENT_MEDICATIONS",
//                 "title": "Current medications",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "ALLERGIES",
//                 "title": "Allergies",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "REVIEW_OF_SYSTEMS",
//                 "title": "Review of systems",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "PHYSICAL_EXAMINATION",
//                 "title": "Physical examination",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "ASSESSMENT",
//                 "title": "Assessment",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "PLAN",
//                 "title": "Plan",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "PRESCRIPTION",
//                 "title": "Prescription",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "FOLLOW_UP",
//                 "title": "Follow-up",
//                 "text": "",
//                 "content": []
//             },
//             {
//                 "key": "SOCIAL_HISTORY",
//                 "title": "Social history",
//                 "text": "",
//                 "content": []
//             }
//         ]
//     },
//     "suggested_dot_phrases": null
// }`,
//           },

//           {
//             text: `For each section:`,
//           },
//           {
//             text: `Extract relevant information from the transcript.`,
//           },
//           {
//             text: `Populate the "text" field with a bulleted list of key points, using "\n" for line breaks.`,
//           },
//           {
//             text: `Populate the "content" array with individual items from the bulleted list.`,
//           },
//           {
//             text: `If a section has no relevant information, leave "text" as an empty string and "content" as an empty array`,
//           },
//           {
//             text: `Use appropriate medical terminology`,
//           },
//           {
//             text: `Aim for clear, concise notes useful for healthcare providers.`,
//           },
//         ],
//       },
//     });
//     const resp = await model.generateContent(request);
//     const contentResponse = JSON.parse(
//       resp.response.candidates[0].content.parts[0].text,
//     );
//     return contentResponse as unknown as Appointment['note'];
//   }

//   async generatePatientInstructionsfFromTranscript(transcript: string) {
//     const generationConfig = {
//       temperature: 0.95,
//       topP: 1.0,
//       maxOutputTokens: 8192,
//       response_mime_type: 'application/json',
//     };

//     const request = {
//       contents: [
//         {
//           role: 'user',
//           parts: [
//             {
//               text: `Generate instructions and next steps for patients from the following transcript`,
//             },
//             {
//               text: `${transcript}`,
//             },
//           ],
//         },
//       ],
//       generationConfig: generationConfig,
//     };

//     const model = this.vertexAI.preview.getGenerativeModel({
//       model: 'gemini-1.5-flash-001',
//       systemInstruction: {
//         role: 'Patient Instructions AI',
//         parts: [
//           {
//             text: `
//             Convert the following doctor-patient conversation transcript into structured patient instructions in JSON format. Focus on actionable items, medications, lifestyle changes, and follow-up recommendations. Use this structure:

// {
//     "messageFromDoctor": "",
//     "medication": [
//       {
//         "action": "",
//         "details": ""
//       }
//     ],
//     "lifestyleChanges": [
//       {
//         "action": "",
//         "details": ""
//       }
//     ],
//     "followUp": [
//       {
//         "action": "",
//         "details": ""
//       }
//     ],
//     "otherInstructions": [
//       {
//         "action": "",
//         "details": ""
//       }
//     ]
// }`,
//           },
//           {
//             text: `For the "message_from_doctor" field, include a brief, kind message summarizing the visit and offering encouragement to the patient.`,
//           },
//           {
//             text: `Ensure each instruction is clear, concise, and directly related to the patient's care. If a category has no relevant instructions, leave it as an empty array.`,
//           },
//         ],
//       },
//       safetySettings: [
//         {
//           category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
//           threshold: HarmBlockThreshold.BLOCK_NONE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
//           threshold: HarmBlockThreshold.BLOCK_NONE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
//           threshold: HarmBlockThreshold.BLOCK_NONE,
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//           threshold: HarmBlockThreshold.BLOCK_NONE,
//         },
//       ],
//     });
//     const resp = await model.generateContent(request);
//     const contentResponse = resp.response.candidates[0].content.parts[0].text;
//     const stringe = JSON.parse(contentResponse);
//     return stringe;
//   }
// }




// Import necessary modules and configurations
import { GoogleAIFileManager } from '@google/generative-ai/files';
import { ENVIRONMENT } from '../configs/environment';
import * as apiKey from '../../medix-424107-59f23af2a167.json';
import { Storage } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';
import {
  GenerativeModel,
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from '@google-cloud/vertexai';
import { Injectable } from '@nestjs/common';
import { Appointment } from 'src/modules/appointment/appointment.schema';

@Injectable()
export class Gemini {
  apiKey: string;
  model: GenerativeModel;
  vertexAI: VertexAI;
  fileManager: GoogleAIFileManager;

  constructor() {
    // Initialize VertexAI with project settings
    this.vertexAI = new VertexAI({
      project: apiKey.project_id,
      location: 'us-central1',
    });

    // Set up the generative model with specific configuration
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

    // Initialize the file manager with the API key
    this.fileManager = new GoogleAIFileManager(this.apiKey);
  }

  /**
   * Uploads a file to Google Cloud Storage.
   * @param file - The file to be uploaded.
   * @param mimeType - The MIME type of the file.
   * @returns Information about the uploaded file.
   */
  async uploadFile(file: Express.Multer.File, mimeType: string) {
    const storage = new Storage({
      projectId: apiKey.project_id,
      keyFilename: ENVIRONMENT.GOOGLE.CLOUD.API_KEY,
    });

    const bucket = storage.bucket('medix-audio');
    const newFilename = `medix_audio_${Date.now()}`;
    const newFile = bucket.file(newFilename);

    try {
      await newFile.save(file.buffer, {
        contentType: mimeType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      console.log(`${file.originalname} uploaded to medix-audio🎉`);

      return {
        name: newFilename,
        size: (file.size / (1024 * 1024)).toFixed(2),
        mimeType: file.mimetype,
        publicUrl: `https://storage.googleapis.com/medix-audio/${newFilename}`,
        url: `gs://medix-audio/${newFilename}`,
      };
    } catch (error) {
      console.error('ERROR:', error);
    }
  }

  /**
   * Transcribes audio from a stream in real-time.
   * @param stream - The audio stream to be transcribed.
   * @param mimeType - The MIME type of the audio.
   */
  async transcribeAudioStream(stream: NodeJS.ReadableStream, mimeType: string) {
    const client = new SpeechClient({
      projectId: apiKey.project_id,
      keyFilename: ENVIRONMENT.GOOGLE.CLOUD.API_KEY,
    });

    const request = {
      config: {
        encoding: mimeType.split('/')[1].toUpperCase(),
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      interimResults: true,
    };

    const recognizeStream = client
      .streamingRecognize(request)
      .on('data', data =>
        process.stdout.write(
          data.results[0] && data.results[0].alternatives[0]
            ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
            : '\n\nReached transcription limit, press Ctrl+C\n'
        )
      )
      .on('error', console.error)
      .on('end', () => {
        console.log('Transcription ended.');
      });

    stream.pipe(recognizeStream);
  }

  /**
   * Generates a transcript from an audio file URL.
   * @param url - The URL of the audio file.
   * @param mimeType - The MIME type of the audio file.
   * @returns The generated transcript.
   */
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
    const generationConfig = {
      temperature: 0.95,
      topP: 1.0,
      maxOutputTokens: 8192,
      response_mime_type: 'application/json',
    };

    const request = {
      contents: [{ role: 'user', parts: [filePart, textPart] }],
      generationConfig,
    };
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      systemInstruction: {
        role: 'Medical Transcription AI',
        parts: [
          {
            text: `You are an assistant for doctors. You receive an audio recording of conversation between patient and doctor and generate an array of text separated by commas, based on this schema:
            ["Hi doctor", "I am feeling unwell", "When did it start?"]
            `,
          },
          {
            text: `Extract relevant information from the transcript.`,
          },
          {
            text: `If a section has no relevant information, leave "text" as an empty string.`,
          },
          {
            text: `Use appropriate medical terminology.`,
          },
        ],
      },
    });
    const resp = await generativeModel.generateContent(request);
    const contentResponse = resp.response.candidates[0].content.parts[0].text;
    return JSON.parse(contentResponse);
  }

  /**
   * Converts a transcript into structured medical notes.
   * @param transcript - The transcript of the doctor-patient conversation.
   * @returns Structured medical notes.
   */
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
        "description": "(suggest a description that's simple and two lines long, )",
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
    return contentResponse as unknown as Appointment['note'];
  }

  /**
   * Generates patient instructions from a transcript.
   * @param transcript - The transcript of the doctor-patient conversation.
   * @returns Structured patient instructions in JSON format.
   */
  async generatePatientInstructionsFromTranscript(transcript: string) {
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
}`,
          },
          {
            text: `For the "message_from_doctor" field, include a brief, kind message summarizing the visit and offering encouragement to the patient.`,
          },
          {
            text: `Ensure each instruction is clear, concise, and directly related to the patient's care. If a category has no relevant instructions, leave it as an empty array.`,
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
    return JSON.parse(contentResponse);
  }
}
