// src/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing VITE_GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Available Gemma 4 endpoints on Gemini API:
// - "gemma-4-31b-it"   (High reasoning capability)
// - "gemma-4-26b-a4b-it" (MoE architecture)
// - "gemma-4-4b-it"    (Fast lightweight model)
export const model = genAI.getGenerativeModel({ model: "gemma-4-31b-it" });

/**
 * Sends a chat message with full multi-turn history
 */
export async function sendChatMessage(history, message) {
  const chat = model.startChat({
    history: history || [],
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  return response.text();
}

/**
 * Single prompt generation
 */
export async function generateContent(prompt) {
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}