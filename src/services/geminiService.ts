import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface UFCEvent {
  name: string;
  date: string; 
  time: string; 
  location: string;
  mainEvent: string;
  fighters: {
    name: string;
    imageUrl?: string;
    record: string; // e.g., "20-4-0"
  }[];
  sourceUrl?: string;
}

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  const model = "gemini-3-flash-preview";
  const currentDate = new Date().toISOString().split('T')[0];
  
  const prompt = `Find the upcoming UFC events starting from today (${currentDate}). 
  For each event, provide:
  1. Event Name (e.g., UFC 300)
  2. Date and Time (including timezone)
  3. Location
  4. Main Event fight (e.g., "Alex Pereira vs Jamahal Hill")
  5. For the two main event fighters:
     - Full Name
     - Professional MMA Record (Wins-Losses-Draws, e.g., "21-2-0")
     - A direct URL to their first available high-quality image from a Google Image search or official sports site.
  
  Return the data as a JSON array of objects with keys: name, date, time, location, mainEvent, fighters (array of {name, imageUrl, record}). 
  If no image URL is found, leave imageUrl as null.
  Ensure the dates are in the future relative to ${currentDate}.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const events = JSON.parse(text);
    return events;
  } catch (error) {
    console.error("Error fetching UFC events:", error);
    return [];
  }
}
