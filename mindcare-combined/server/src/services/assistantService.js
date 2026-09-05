// mindcare-combined/server/src/services/assistantService.js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processAssistantQuery(userId, query) {
  const systemInstruction = `
    You are MindCare AI, an empathetic health and general assistant.
    1. Answer general user questions accurately, concisely, and completely.
    2. Provide specialized support for MindCare features (cognitive games, wellness tracking, caregiver tools).
    3. For medical advice queries, provide general educational info and advise consulting a healthcare professional.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return { response: response.text };
}