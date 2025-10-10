
import { GoogleGenAI } from '@google/genai';
import type { ModelConfig } from '../types';

let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
    console.error("Gemini API Key not found. Please set the API_KEY environment variable.");
}

export const generateResponse = async (prompt: string, modelConfig: ModelConfig): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API client is not initialized. Check API Key.");
    }
    
    try {
        const response = await ai.models.generateContent({
            model: modelConfig.apiName,
            contents: prompt,
        });
        
        return response.text;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Better error message parsing could be done here
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}
