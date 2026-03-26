/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchUpcomingUFCEvents, UFCEvent } from './services/geminiService';
import { Calendar, Clock, MapPin, Trophy, Loader2, RefreshCw, Search } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { parse } from 'date-fns';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';

export default function App() {
  const [events, setEvents] = useState<UFCEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Advanced Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    setExpandedEvent(null);
    try {
      const data = await fetchUpcomingUFCEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('App Load Error:', err);
      const errorMessage = err?.message || String(err);
      
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        setError('Rate Limit Exceeded: Your API key has hit its limit for Google Search. Please wait 60 seconds and try again.');
      } else if (errorMessage.includes('GEMINI_API_KEY')) {
        setError('API Key Missing: Please check your GitHub Secrets configuration.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const toggleExpand = (eventName: string) => {
    setExpandedEvent(expandedEvent === eventName ? null : eventName);
  };

  const convertToIST = (dateStr: string, timeStr: string) => {
    try {
      // Clean up the time string for parsing (remove timezone abbreviations)
      const cleanTime = timeStr.replace(/(ET|PT|MT|CT|UTC|BST)/g, '').trim();
      
      // Map common UFC timezones to IANA names
      let tz = 'America/New_York'; // Default to ET (Eastern Time)
      if (timeStr.includes('PT')) tz = 'America/Los_Angeles';
      if (timeStr.includes('MT')) tz = 'America/Denver';
      if (timeStr.includes('CT')) tz = 'America/Chicago';
      if (timeStr.includes('UTC')) tz = 'UTC';

      // Parse the date in the source timezone
      // We use a specific format that matches "March 28, 2026 10:00 PM"
      const formatString = 'MMMM d, yyyy h:mm a';
      const combinedStr = `${dateStr} ${cleanTime}`;
      
      // Parse the date string into a Date object, assuming it's in the source timezone
      const parsedDate = parse(combinedStr, formatString, new Date());
      
      if (isNaN(parsedDate.getTime())) {
        // Fallback to native parsing if date-fns fails
        const nativeDate = new Date(combinedStr);
        if (isNaN(nativeDate.getTime())) return { date: dateStr, time: timeStr, isFallback: true };
        
        // If native worked, we still need to adjust for the timezone difference manually 
        // because native Date(str) assumes local time if no offset is present.
        // But better to use formatInTimeZone with the correct source context.
      }

      // To correctly convert: 
      // 1. We have a Date object that thinks it's in local time (IST)
      // 2. We need to tell it "No, you are actually ET"
      // 3. Then convert to IST.
      
      // A better way with date-fns-tz:
      // zonedTimeToUtc converts a date in a specific timezone to a UTC date.
      // However, we can just use formatInTimeZone if we have a valid UTC timestamp.
      
      // Let's use a more robust approach:
      // 10:00 PM ET is 02:00 UTC (next day) or 03:00 UTC depending on DST.
      // IST is UTC + 5:30.
      
      // The simplest way to handle this without complex libraries is to append the offset.
      const offsets: Record<string, string> = {
        'America/New_York': '-04:00', // Usually -04:00 in March/April (EDT)
        'America/Los_Angeles': '-07:00',
        'America/Denver': '-06:00',
        'America/Chicago': '-05:00',
        'UTC': '+00:00'
      };

      // Note: March 28, 2026 is after DST starts (March 8, 2026)
      const currentOffset = tz === 'America/New_York' ? '-04:00' : offsets[tz] || '-04:00';
      
      const dateWithOffset = new Date(`${dateStr} ${cleanTime} ${currentOffset}`);
      
      if (isNaN(dateWithOffset.getTime())) {
        return { date: dateStr, time: timeStr, isFallback: true };
      }

      const istDate = formatInTimeZone(dateWithOffset, 'Asia/Kolkata', 'PPP');
      const istTime = formatInTimeZone(dateWithOffset, 'Asia/Kolkata', 'p');

      return { date: istDate, time: istTime, isFallback: false };
    } catch (e) {
      console.error("Conversion error:", e);
      return { date: dateStr, time: timeStr, isFallback: true };
    }
  };

  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.mainEvent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Advanced Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-red-600 origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-zinc-900/20 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="flex items-center gap-3 text-red-500 font-mono text-xs tracking-[0.3em] uppercase mb-2"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4, 
                  ease: "easeInOut" 
                }}
              >
                <Trophy size={14} />
              </motion.div>
              <motion.span
                animate={{ 
                  x: [-2, 2, -2],
                  rotate: [-3, 3, -3]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 5, 
                  ease: "easeInOut" 
                }}
                className="inline-block"
              >
                from Piyush
              </motion.span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              UFC <span className="text-zinc-500 italic">Upcoming</span>
            </motion.h1>
          </div>
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </motion.button>
        </header>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative mb-12"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Search events or fighters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600"
          />
        </motion.div>

        {/* Content with Scroll Fade Mask */}
        <div className="relative">
          {/* Top Fade Mask */}
          <div className="absolute -top-4 left-0 right-0 h-12 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          
          {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-red-500" size={48} />
            <p className="text-zinc-500 font-mono animate-pulse">Scanning the Octagon...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/10 border border-red-900/20 rounded-2xl p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadEvents} className="text-zinc-100 underline underline-offset-4">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const ist = convertToIST(event.date, event.time);
                const isExpanded = expandedEvent === event.name;
                return (
                  <motion.div
                    key={event.name + index}
                    layout
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50, scale: 0.9, rotate: index % 2 === 0 ? -2 : 2 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 100,
                      damping: 20,
                      delay: index * 0.05 
                    }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    onClick={() => toggleExpand(event.name)}
                    className={`group relative bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 md:p-8 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer ${isExpanded ? 'ring-2 ring-red-500/50' : ''}`}
                  >
                    {/* Event Card Content */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
                            Upcoming
                          </span>
                          <span className="text-zinc-500 text-xs font-mono">
                            {event.location}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 group-hover:text-red-500 transition-colors">
                          {event.name}
                        </h2>
                        <p className="text-zinc-400 text-lg font-medium italic mb-4">
                          {event.mainEvent}
                        </p>
                        
                        {/* Fighter Records on Card */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {event.fighters?.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/50">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{f.name}</span>
                              <span className="text-xs font-mono text-red-500 font-bold">{f.record}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 md:text-right min-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center md:justify-end gap-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                            <Calendar size={14} />
                            Date (IST)
                          </div>
                          <div className="text-xl font-bold">{ist.date}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center md:justify-end gap-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                            <Clock size={14} />
                            Time (IST)
                          </div>
                          <div className="text-xl font-bold text-red-500">{ist.time}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content: Fighter Details */}
                    <AnimatePresence>
                      {isExpanded && event.fighters && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-8 pt-8 border-t border-zinc-800 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                            {event.fighters.map((fighter, fIndex) => (
                              <div key={fighter.name + fIndex} className="bg-zinc-800/30 p-6 rounded-2xl border border-zinc-700/50">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Fighter</p>
                                    <h3 className="text-xl font-bold text-white">{fighter.name}</h3>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Weight Class</p>
                                    <p className="text-sm font-medium text-zinc-300">{fighter.weightClass}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Record</p>
                                    <p className="text-lg font-mono font-bold text-red-500">{fighter.record}</p>
                                  </div>
                                  <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Last 5</p>
                                    <div className="flex gap-1 mt-1">
                                      {fighter.lastFive.split('-').map((status, sIndex) => (
                                        <span 
                                          key={sIndex}
                                          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                                            status === 'W' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 
                                            status === 'L' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                                            'bg-zinc-500/20 text-zinc-500 border border-zinc-500/30'
                                          }`}
                                        >
                                          {status}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-center text-[10px] text-zinc-600 mt-6 uppercase tracking-widest">Main Event Fighter Profiles</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                      <Trophy size={120} className="text-white rotate-12" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredEvents.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
                <p className="text-zinc-500">No events found matching your search.</p>
              </div>
            )}
          </div>
        )}

          {/* Bottom Fade Mask */}
          <div className="absolute -bottom-4 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        </div>
      </main>

      <footer className="relative z-10 max-w-5xl mx-auto px-6 py-12 border-t border-zinc-900 text-center text-zinc-600 text-xs uppercase tracking-[0.3em]">
        <p>© {new Date().getFullYear()} UFC Event Tracker</p>
        <p className="mt-2 text-[10px]">Curated by Piyush for the Octagon Fans</p>
      </footer>
    </div>
  );
}
