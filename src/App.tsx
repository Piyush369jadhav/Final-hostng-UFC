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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-red-500/30 overflow-x-hidden">
      {/* Advanced Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-red-600 origin-left z-[100] shadow-[0_0_15px_#dc2626]"
        style={{ scaleX }}
      />

      {/* Futuristic Grid Background */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />

      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/20 blur-[150px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Futuristic Header */}
        <header className="mb-16 text-center relative overflow-hidden py-8">
          <div className="scanline" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 1, 
              type: "spring", 
              bounce: 0.4 
            }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-red-500/30 text-[10px] font-bold tracking-[0.3em] text-red-500 uppercase backdrop-blur-md">
              <Trophy className="w-3 h-3 neon-glow-red" />
              <span className="glitch-hover">From Piyush • Octagon Intel</span>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "-0.02em" }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="text-7xl md:text-9xl font-black uppercase italic cyber-text leading-none"
          >
            UFC <span className="text-red-600">EVENTS</span>
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex items-center justify-center gap-4 text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase"
          >
            <div className="h-px w-8 bg-zinc-800" />
            <span>Combat Stream // IST Time</span>
            <div className="h-px w-8 bg-zinc-800" />
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-12 max-w-md mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text"
                placeholder="PROBE FIGHTERS OR EVENTS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800/50 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-all font-mono text-xs tracking-widest placeholder:text-zinc-800 backdrop-blur-sm"
              />
            </div>
          </motion.div>
        </header>

        {/* Event List */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 relative"
        >
          {/* Top/Bottom Fade Masks */}
          <div className="absolute -top-12 left-0 right-0 h-24 bg-gradient-to-b from-[#050505] to-transparent z-20 pointer-events-none" />
          <div className="absolute -bottom-12 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] to-transparent z-20 pointer-events-none" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600/20 blur-2xl animate-pulse" />
                <Loader2 className="w-16 h-16 text-red-600 animate-spin relative z-10" />
              </div>
              <p className="text-zinc-600 font-mono text-[10px] tracking-[0.5em] animate-pulse">SYNCING WITH OCTAGON DATABASE...</p>
            </div>
          ) : error ? (
            <motion.div 
              variants={itemVariants}
              className="glass-card neon-border-red p-10 rounded-3xl text-center relative overflow-hidden"
            >
              <div className="scanline" />
              <p className="text-red-500 font-mono text-sm mb-8 tracking-wider">{error}</p>
              <button 
                onClick={loadEvents}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-95"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                RE-ESTABLISH LINK
              </button>
            </motion.div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-24 text-zinc-700 font-mono text-xs tracking-[0.3em]">
              NO MATCHING SIGNALS DETECTED
            </div>
          ) : (
            <div className="grid gap-8">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, index) => {
                  const ist = convertToIST(event.date, event.time);
                  const isExpanded = expandedEvent === event.name;

                  return (
                    <motion.div
                      key={event.name}
                      layout
                      variants={itemVariants}
                      className={`group relative glass-card rounded-3xl overflow-hidden transition-all duration-700 ${isExpanded ? 'neon-border-red ring-1 ring-red-500/30' : 'hover:border-red-500/20'}`}
                    >
                      <div className="scanline opacity-5" />
                      
                      {/* Event Header Card */}
                      <div 
                        onClick={() => toggleExpand(event.name)}
                        className="p-8 md:p-10 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="px-3 py-1 rounded-sm bg-red-600 text-[9px] font-black tracking-[0.2em] uppercase shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                              {event.name.includes('UFC') ? 'PPV' : 'FIGHT NIGHT'}
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                              <Calendar className="w-3 h-3 text-red-500" />
                              {ist.date}
                            </div>
                          </div>
                          
                          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic group-hover:text-red-500 transition-colors duration-500">
                            {event.mainEvent}
                          </h3>
                          
                          <div className="mt-6 flex flex-wrap items-center gap-6 text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                              <Clock className="w-3.5 h-3.5 text-red-500 neon-glow-red" />
                              {ist.time} IST
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                              <MapPin className="w-3.5 h-3.5 text-red-500 neon-glow-red" />
                              {event.location}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right hidden md:block">
                            <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.3em] mb-1">Status</p>
                            <p className="text-xs font-black text-green-500 uppercase tracking-widest animate-pulse">Active Signal</p>
                          </div>
                          <motion.div 
                            animate={{ 
                              rotate: isExpanded ? 180 : 0,
                              scale: isExpanded ? 1.1 : 1,
                              borderColor: isExpanded ? "#dc2626" : "#27272a"
                            }}
                            className="w-14 h-14 rounded-2xl bg-black/60 border border-zinc-800 flex items-center justify-center group-hover:border-red-500 transition-all duration-500 backdrop-blur-md shadow-inner"
                          >
                            <RefreshCw className={`w-5 h-5 text-zinc-500 group-hover:text-red-500 transition-colors ${isExpanded ? 'animate-spin-slow' : ''}`} />
                          </motion.div>
                        </div>
                      </div>

                      {/* Expanded Content: Fight Card */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="border-t border-red-500/10 bg-gradient-to-b from-red-500/5 to-transparent relative overflow-hidden"
                          >
                            <div className="p-8 md:p-12">
                              <div className="flex items-center gap-4 mb-10">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-red-500/50" />
                                <span className="text-[10px] font-black font-mono text-red-500 uppercase tracking-[0.5em]">Battle Roster</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-red-500/30 to-red-500/50" />
                              </div>

                              <div className="grid gap-6">
                                {event.fighters.map((fight, fIndex) => (
                                  <motion.div 
                                    key={fIndex}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: fIndex * 0.08 + 0.2 }}
                                    className="flex items-center justify-between p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-500 group/fight relative overflow-hidden"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/0 to-red-600/5 translate-x-[-100%] group-hover/fight:translate-x-[100%] transition-transform duration-1000" />
                                    
                                    <div className="flex-1 text-right pr-6 relative z-10">
                                      <p className="text-lg font-black uppercase tracking-tight italic group-hover/fight:text-red-500 transition-colors">{fight.name.split(' vs ')[0] || fight.name}</p>
                                      <div className="flex justify-end gap-1.5 mt-2">
                                        {fight.lastFive.split('-').map((res, i) => (
                                          <div key={i} className={`w-2 h-2 rounded-full shadow-[0_0_5px] ${res === 'W' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-600 shadow-red-600/50'}`} />
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-center px-8 border-x border-white/10 relative z-10">
                                      <div className="text-[12px] font-black text-red-600 italic animate-pulse">VS</div>
                                      <div className="text-[8px] text-zinc-600 font-mono mt-2 uppercase tracking-widest">{fight.weightClass}</div>
                                    </div>

                                    <div className="flex-1 text-left pl-6 relative z-10">
                                      <p className="text-lg font-black uppercase tracking-tight italic group-hover/fight:text-red-500 transition-colors">{fight.name.split(' vs ')[1] || 'TBD'}</p>
                                      <div className="flex justify-start gap-1.5 mt-2">
                                        {fight.lastFive.split('-').map((res, i) => (
                                          <div key={i} className={`w-2 h-2 rounded-full shadow-[0_0_5px] ${res === 'W' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-600 shadow-red-600/50'}`} />
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Futuristic Footer */}
        <footer className="mt-32 pt-16 border-t border-zinc-900/50 text-center relative">
          <div className="scanline opacity-5" />
          <div className="flex justify-center gap-12 mb-10">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }} className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
          </div>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.6em] mb-4">
            Curated by <span className="text-red-500 font-black italic">Piyush</span> for the Octagon Fans
          </p>
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/5 text-zinc-800 font-mono text-[8px] uppercase tracking-[0.3em]">
            © 2026 Combat Intel Systems // Neural Link Established
          </div>
        </footer>
      </main>
    </div>
  );
}
