import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it in your environment or GitHub Secrets.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

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

const CACHE_KEY = "ufc_events_cache";
const CACHE_TIME_KEY = "ufc_events_cache_time";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function getCachedEvents(): UFCEvent[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    
    if (cached && cachedTime) {
      const now = Date.now();
      const age = now - parseInt(cachedTime);
      
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (e) {
    console.error("Error reading cache:", e);
  }
  return null;
}

function saveEventsToCache(events: UFCEvent[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.error("Error saving cache:", e);
  }
}

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  const model = "gemini-3-flash-preview";
  const currentDate = new Date().toISOString().split('T')[0];
  
  const prompt = `Find the upcoming UFC events starting from today (${currentDate}) and for the next 3 months. 
  Use Google Search to find real, scheduled UFC events (like UFC 300, UFC Fight Night).
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
  Ensure the dates are in the future relative to ${currentDate}.
  If there are no events scheduled, return an empty array [].`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    
    // Check if the response is empty or just an empty array string
    if (!text || text === "[]" || text === "null" || text === "{}") {
      const cached = getCachedEvents();
      if (cached && cached.length > 0) {
        console.log("AI returned empty, using cached events.");
        return cached;
      }
      throw new Error("The AI couldn't find any upcoming UFC events. This might be due to a search grounding issue or no events being scheduled soon.");
    }
    
    try {
      const events = JSON.parse(text);
      
      if (!Array.isArray(events)) {
        throw new Error("Invalid response format: expected an array of events.");
      }

      if (events.length === 0) {
        const cached = getCachedEvents();
        if (cached && cached.length > 0) return cached;
        throw new Error("No upcoming UFC events found in the search results.");
      }
      
      saveEventsToCache(events);
      return events;
    } catch (parseError: any) {
      console.error("JSON Parse Error:", text);
      const cached = getCachedEvents();
      if (cached && cached.length > 0) return cached;
      throw new Error(`Failed to process event data: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    // Fallback to cache on any error (like 429 or network issues)
    const cached = getCachedEvents();
    if (cached && cached.length > 0) {
      console.log("Returning cached events due to error:", error.message);
      return cached;
    }
    
    const message = error?.message || error?.toString() || "Unknown error occurred while fetching events.";
    throw new Error(message);
  }
}
