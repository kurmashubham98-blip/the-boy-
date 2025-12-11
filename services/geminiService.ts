import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Helper to get client ensuring we have a key if possible
const getClient = async (requiresUserKey: boolean = false): Promise<GoogleGenAI> => {
  if (requiresUserKey && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        // Trigger selection if not selected, though UI should handle this
        await window.aistudio.openSelectKey();
    }
  }
  
  // Note: process.env.API_KEY is injected by the environment.
  // When using window.aistudio (Veo/Pro-Image), the key is handled internally by the environment wrapper
  // but we still pass the env key as a fallback/placeholder or for standard models.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateChatResponse = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  message: string
): Promise<string> => {
  try {
    const ai = await getClient();
    const chat: Chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: "You are a wise mentor and strategist for 'The Boys'. You provide helpful, direct, and encouraging advice on coding, fitness, and life. Keep it cool, slightly gamified.",
      },
    });

    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Mission failed. Connection to HQ interrupted.";
  }
};

export const generateImage = async (
  prompt: string,
  resolution: '1K' | '2K' | '4K'
): Promise<string> => {
  try {
    // This model requires user-selected API key
    const ai = await getClient(true); 

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: resolution,
          aspectRatio: "16:9", // Default cinematic
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image data returned");

  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const checkApiKeySelection = async (): Promise<boolean> => {
    if (window.aistudio) {
        return await window.aistudio.hasSelectedApiKey();
    }
    return true; // Fallback if not in that specific env, assume env var works
};

export const openApiKeySelection = async (): Promise<void> => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
    }
};