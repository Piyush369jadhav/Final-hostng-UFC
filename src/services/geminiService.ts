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

const STATIC_UFC_EVENTS: UFCEvent[] = [
  {
    name: "UFC Fight Night: Adesanya vs. Pyfer",
    date: "March 28, 2026",
    time: "10:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Israel Adesanya vs Joe Pyfer",
    fighters: [
      { name: "Israel Adesanya", record: "24-3-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/ADESANYA_ISRAEL_L_04-08.png" },
      { name: "Joe Pyfer", record: "12-3-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/PYFER_JOE_L_10-07.png" }
    ]
  },
  {
    name: "UFC Fight Night: Moicano vs. Duncan",
    date: "April 04, 2026",
    time: "9:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Renato Moicano vs Chris Duncan",
    fighters: [
      { name: "Renato Moicano", record: "18-5-1", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-02/MOICANO_RENATO_L_02-12.png" },
      { name: "Chris Duncan", record: "11-1-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-03/DUNCAN_CHRIS_L_03-18.png" }
    ]
  },
  {
    name: "UFC 327: Prochazka vs. Ulberg",
    date: "April 11, 2026",
    time: "10:00 PM ET",
    location: "T-Mobile Arena, Las Vegas, NV",
    mainEvent: "Jiri Prochazka vs Carlos Ulberg",
    fighters: [
      { name: "Jiri Prochazka", record: "30-4-1", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-11/PROCHAZKA_JIRI_L_11-11.png" },
      { name: "Carlos Ulberg", record: "10-1-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-05/ULBERG_CARLOS_L_05-13.png" }
    ]
  },
  {
    name: "UFC Fight Night: Burns vs. Malott",
    date: "April 18, 2026",
    time: "8:00 PM ET",
    location: "Scotiabank Arena, Toronto, Canada",
    mainEvent: "Gilbert Burns vs Mike Malott",
    fighters: [
      { name: "Gilbert Burns", record: "22-7-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/BURNS_GILBERT_L_04-08.png" },
      { name: "Mike Malott", record: "10-1-1", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-06/MALOTT_MIKE_L_06-10.png" }
    ]
  },
  {
    name: "UFC Fight Night: Sterling vs. Zalal",
    date: "April 25, 2026",
    time: "10:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Aljamain Sterling vs Youssef Zalal",
    fighters: [
      { name: "Aljamain Sterling", record: "24-4-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-05/STERLING_ALJAMAIN_L_05-06.png" },
      { name: "Youssef Zalal", record: "14-5-1", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-03/ZALAL_YOUSSEF_L_03-23.png" }
    ]
  },
  {
    name: "UFC Fight Night: Della Maddalena vs. Prates",
    date: "May 02, 2026",
    time: "9:00 PM ET",
    location: "Perth, Australia",
    mainEvent: "Jack Della Maddalena vs Carlos Prates",
    fighters: [
      { name: "Jack Della Maddalena", record: "17-2-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-07/DELLA_MADDALENA_JACK_L_07-15.png" },
      { name: "Carlos Prates", record: "18-6-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-02/PRATES_CARLOS_L_02-10.png" }
    ]
  },
  {
    name: "UFC 328: Chimaev vs. Strickland",
    date: "May 09, 2026",
    time: "10:00 PM ET",
    location: "Kingdom Arena, Riyadh, Saudi Arabia",
    mainEvent: "Khamzat Chimaev vs Sean Strickland",
    fighters: [
      { name: "Khamzat Chimaev", record: "13-0-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-10/CHIMAEV_KHAMZAT_L_10-21.png" },
      { name: "Sean Strickland", record: "28-6-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-09/STRICKLAND_SEAN_L_09-09.png" }
    ]
  },
  {
    name: "UFC Fight Night: Allen vs. Costa",
    date: "May 16, 2026",
    time: "8:00 PM ET",
    location: "UFC APEX, Las Vegas, NV",
    mainEvent: "Brendan Allen vs Paulo Costa",
    fighters: [
      { name: "Brendan Allen", record: "23-5-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-11/ALLEN_BRENDAN_L_11-18.png" },
      { name: "Paulo Costa", record: "14-3-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-02/COSTA_PAULO_L_02-12.png" }
    ]
  },
  {
    name: "UFC 326: Holloway vs. Oliveira 2",
    date: "June 13, 2026",
    time: "10:00 PM ET",
    location: "T-Mobile Arena, Las Vegas, NV",
    mainEvent: "Max Holloway vs Charles Oliveira",
    fighters: [
      { name: "Max Holloway", record: "26-7-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-04/HOLLOWAY_MAX_L_04-15.png" },
      { name: "Charles Oliveira", record: "34-9-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-06/OLIVEIRA_CHARLES_L_06-10.png" }
    ]
  },
  {
    name: "UFC 325: Volkanovski vs. Lopes 2",
    date: "July 11, 2026",
    time: "10:00 PM ET",
    location: "Sydney, Australia",
    mainEvent: "Alexander Volkanovski vs Diego Lopes",
    fighters: [
      { name: "Alexander Volkanovski", record: "26-4-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2023-07/VOLKANOVSKI_ALEXANDER_L_07-08.png" },
      { name: "Diego Lopes", record: "24-6-0", imageUrl: "https://dmxg5wxfqgb4u.cloudfront.net/styles/athlete_bio_full_body/s3/2024-04/LOPES_DIEGO_L_04-13.png" }
    ]
  }
];

export async function fetchUpcomingUFCEvents(): Promise<UFCEvent[]> {
  // Return static data immediately to bypass API issues
  return Promise.resolve(STATIC_UFC_EVENTS);
}
