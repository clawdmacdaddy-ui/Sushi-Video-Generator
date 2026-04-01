import { GoogleGenAI } from "@google/genai";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check if it's a 503 or 429 error
      const isRetryable = error.message?.includes("503") || 
                         error.message?.includes("429") || 
                         error.message?.includes("high demand") ||
                         error.status === "UNAVAILABLE";
      
      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API busy (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function generateThematicPrompt(
  apiKey: string,
  rollName: string,
  userSuggestions?: string
) {
  const ai = new GoogleGenAI({ apiKey });
  
  return await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a cinematic food commercial director. Research the name of this sushi roll: "${rollName}". 
      ${userSuggestions ? `The user has also provided these specific creative suggestions/notes: "${userSuggestions}". Incorporate these into your vision.` : ''}
      
      Create a highly descriptive, cinematic video prompt for an AI video generator (Veo). 
      The prompt should describe a 9:16 portrait video that captures the essence of the name and the user's suggestions.
      
      Incorporate the following details:
      1. **Camera Angles**: Suggest specific movements like macro close-ups, slow orbital pans, low-angle hero shots, or serpentine zooms.
      2. **Lighting Styles**: Define the mood (e.g., dramatic high-contrast, soft ethereal glow, warm golden hour, neon cyberpunk, or cool moonlight).
      3. **Atmospheric Elements**: Add thematic effects like rising steam, shimmering sparks, bubbling sauce, floating cherry blossom petals, or gentle water ripples.
      
      Examples:
      - "Volcano Roll": Dramatic red and orange under-lighting, a low-angle macro shot, with a slow bubbling effect in the spicy mayo and faint embers floating in the air.
      - "Ocean Breeze Roll": Cool blue and turquoise lighting, a gentle wave-like orbital camera motion, with a light sea mist and subtle water ripples reflecting on the plate.
      - "Dragon Roll": Serpentine camera movement tracking the length of the roll, dramatic side-lighting to highlight texture, and faint wisps of smoke or "dragon breath" rising from the eel.
      
      The prompt should be one cohesive paragraph focusing on the visual atmosphere, assuming the base image is a photo of the sushi.
      Return ONLY the prompt text, no other commentary.`,
    });

    return response.text || "A cinematic close-up of the sushi roll with professional lighting and slow camera movement.";
  });
}

export async function generateSushiVideo(
  apiKey: string,
  imageData: string, // base64
  prompt: string
) {
  const ai = new GoogleGenAI({ apiKey });
  
  return await withRetry(async () => {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageData.split(',')[1] || imageData,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16' // Portrait for Instagram
      }
    });

    return operation;
  });
}

export async function pollVideoOperation(apiKey: string, operation: any) {
  const ai = new GoogleGenAI({ apiKey });
  
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await withRetry(async () => {
      return await ai.operations.getVideosOperation({ operation });
    });
  }
  
  return operation;
}

export async function fetchVideoBlob(apiKey: string, downloadLink: string) {
  return await withRetry(async () => {
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }
    
    return await response.blob();
  });
}
