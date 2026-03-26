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
    record: string; // e.g., "20-4-0"
    weightClass: string; // e.g., "Middleweight"
    lastFive: string; // e.g., "W-W-L-W-W"
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

const STATIC_UFC_EVENTS: UFCEvent[] = [
  {
    name: "UFC Fight Night: Adesanya vs. Pyfer",
    date: "March 28, 2026",
    time: "10:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Israel Adesanya vs Joe Pyfer",
    fighters: [
      { name: "Israel Adesanya", record: "24-3-0", weightClass: "Middleweight", lastFive: "L-W-L-W-W" },
      { name: "Joe Pyfer", record: "12-3-0", weightClass: "Middleweight", lastFive: "L-W-W-W-W" }
    ]
  },
  {
    name: "UFC Fight Night: Moicano vs. Duncan",
    date: "April 04, 2026",
    time: "9:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Renato Moicano vs Chris Duncan",
    fighters: [
      { name: "Renato Moicano", record: "18-5-1", weightClass: "Lightweight", lastFive: "W-W-W-L-W" },
      { name: "Chris Duncan", record: "11-1-0", weightClass: "Lightweight", lastFive: "L-W-W-W-W" }
    ]
  },
  {
    name: "UFC 327: Prochazka vs. Ulberg",
    date: "April 11, 2026",
    time: "10:00 PM ET",
    location: "T-Mobile Arena, Las Vegas, NV",
    mainEvent: "Jiri Prochazka vs Carlos Ulberg",
    fighters: [
      { name: "Jiri Prochazka", record: "30-4-1", weightClass: "Light Heavyweight", lastFive: "W-L-W-W-W" },
      { name: "Carlos Ulberg", record: "10-1-0", weightClass: "Light Heavyweight", lastFive: "W-W-W-W-W" }
    ]
  },
  {
    name: "UFC Fight Night: Burns vs. Malott",
    date: "April 18, 2026",
    time: "8:00 PM ET",
    location: "Scotiabank Arena, Toronto, Canada",
    mainEvent: "Gilbert Burns vs Mike Malott",
    fighters: [
      { name: "Gilbert Burns", record: "22-7-0", weightClass: "Welterweight", lastFive: "L-L-W-W-L" },
      { name: "Mike Malott", record: "10-1-1", weightClass: "Welterweight", lastFive: "L-W-W-W-W" }
    ]
  },
  {
    name: "UFC Fight Night: Sterling vs. Zalal",
    date: "April 25, 2026",
    time: "10:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Aljamain Sterling vs Youssef Zalal",
    fighters: [
      { name: "Aljamain Sterling", record: "24-4-0", weightClass: "Featherweight", lastFive: "W-L-W-W-W" },
      { name: "Youssef Zalal", record: "14-5-1", weightClass: "Featherweight", lastFive: "W-W-W-D-W" }
    ]
  },
  {
    name: "UFC Fight Night: Della Maddalena vs. Prates",
    date: "May 02, 2026",
    time: "9:00 PM ET",
    location: "Perth, Australia",
    mainEvent: "Jack Della Maddalena vs Carlos Prates",
    fighters: [
      { name: "Jack Della Maddalena", record: "17-2-0", weightClass: "Welterweight", lastFive: "W-W-W-W-W" },
      { name: "Carlos Prates", record: "18-6-0", weightClass: "Welterweight", lastFive: "W-W-W-W-W" }
    ]
  },
  {
    name: "UFC 328: Chimaev vs. Strickland",
    date: "May 09, 2026",
    time: "10:00 PM ET",
    location: "Kingdom Arena, Riyadh, Saudi Arabia",
    mainEvent: "Khamzat Chimaev vs Sean Strickland",
    fighters: [
      { name: "Khamzat Chimaev", record: "13-0-0", weightClass: "Middleweight", lastFive: "W-W-W-W-W" },
      { name: "Sean Strickland", record: "28-6-0", weightClass: "Middleweight", lastFive: "W-L-W-W-L" }
    ]
  },
  {
    name: "UFC Fight Night: Allen vs. Costa",
    date: "May 16, 2026",
    time: "8:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Brendan Allen vs Paulo Costa",
    fighters: [
      { name: "Brendan Allen", record: "23-5-0", weightClass: "Middleweight", lastFive: "W-W-W-W-W" },
      { name: "Paulo Costa", record: "14-3-0", weightClass: "Middleweight", lastFive: "L-W-L-W-L" }
    ]
  },
  {
    name: "UFC 326: Holloway vs. Oliveira 2",
    date: "June 13, 2026",
    time: "10:00 PM ET",
    location: "T-Mobile Arena, Las Vegas, NV",
    mainEvent: "Max Holloway vs Charles Oliveira",
    fighters: [
      { name: "Max Holloway", record: "26-7-0", weightClass: "Lightweight", lastFive: "W-W-W-L-W" },
      { name: "Charles Oliveira", record: "34-9-0", weightClass: "Lightweight", lastFive: "W-L-W-W-L" }
    ]
  },
  {
    name: "UFC 325: Volkanovski vs. Lopes 2",
    date: "July 11, 2026",
    time: "10:00 PM ET",
    location: "Sydney, Australia",
    mainEvent: "Alexander Volkanovski vs Diego Lopes",
    fighters: [
      { name: "Alexander Volkanovski", record: "26-4-0", weightClass: "Featherweight", lastFive: "L-L-W-W-L" },
      { name: "Diego Lopes", record: "24-6-0", weightClass: "Featherweight", lastFive: "W-W-W-W-W" }
    ]
  }
];

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  // Return static data immediately to bypass API issues
  return Promise.resolve(STATIC_UFC_EVENTS);
}
