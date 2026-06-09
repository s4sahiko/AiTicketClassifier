"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Filter, Search, Bell, Upload, Loader2, BookOpen, AlertCircle, 
  Database, Check, ChevronLeft, ChevronRight, X, MessageSquare,
  ArrowUpRight, Sparkles, Zap, Terminal, Globe, Cpu, Layers, MousePointer2,
  FileText, Activity, Settings, Eye, Trash2, RefreshCcw, Info, ShieldCheck,
  Download
} from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, ResponsiveContainer, Cell, Tooltip, 
  RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie 
} from 'recharts';

// --- Config ---
const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low', 'N/A'];
const TEAM_OPTIONS = ['Network Operations', 'Infrastructure', 'Database Ops', 'Security & Access', 'Cloud Services', 'Hardware Support'];
const ISSUE_OPTIONS = ['Access/Login', 'Performance', 'Connectivity', 'Hardware', 'Software Bug', 'Billing', 'Account/Access'];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export default function NeuralDashboard() {
  const [ticketText, setTicketText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showInModalRecommendation, setShowInModalRecommendation] = useState(false);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(SEVERITY_OPTIONS);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(TEAM_OPTIONS);
  const [selectedIssues, setSelectedIssues] = useState<string[]>(ISSUE_OPTIONS);
  const [slackMessages, setSlackMessages] = useState<any[]>([]);
  const [systemEvents, setSystemEvents] = useState<any[]>([
    { type: 'info', msg: 'Neural Engine initialized.', time: '09:00 AM' },
    { type: 'warning', msg: 'Memory usage at 85%.', time: '10:45 AM' }
  ]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'alerts' | 'slack'>('alerts');
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const notificationRef = useRef<HTMLDivElement>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const addEvent = (msg: string, type: 'info' | 'warning' | 'error' = 'info') => {
    setSystemEvents(prev => [{ type, msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
    if (!showNotifications) setHasUnread(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        addEvent('Connection restored. Neural link stable.', 'info');
      };
      const handleOffline = () => {
        setIsOnline(false);
        addEvent('Connection lost. Running in offline fallback mode.', 'warning');
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        addEvent('PWA installation package is ready.', 'info');
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    addEvent(`PWA installation response: ${outcome}`, 'info');
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const fetchSlack = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/slack_activity`);
        const newMsgs = response.data.messages || [];
        if (newMsgs.length > slackMessages.length && !showNotifications) {
          setHasUnread(true);
        }
        setSlackMessages(newMsgs);
      } catch (err) { console.error("Slack link failed", err); }
    };
    fetchSlack();
    const interval = setInterval(fetchSlack, 15000);
    return () => clearInterval(interval);
  }, [slackMessages.length, showNotifications]);

  const handleToggleNotifications = () => {
    if (!showNotifications) setHasUnread(false);
    setShowNotifications(!showNotifications);
  };

  const handleAnalyze = async () => {
    if (!ticketText.trim()) {
      setValidationError("Input technical statement to initiate triage.");
      setTimeout(() => setValidationError(null), 3000);
      return;
    }
    setIsAnalyzing(true);
    setValidationError(null);
    const tempId = `TKT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    try {
      const response = await axios.post(`${API_BASE_URL}/recommend`, { ticket_text: ticketText, ticket_id: tempId });
      const newResult = { ...response.data, ticket_id: tempId, ticket_text: ticketText, timestamp: new Date().toLocaleTimeString() };
      setResults(prev => [newResult, ...prev]);
      setTicketText("");
      if (newResult.severity_prediction.label === 'Critical') {
        addEvent(`URGENT: Critical ticket ${tempId} detected.`, 'warning');
      }
    } catch (err) { 
      console.error("Inference failed", err); 
      setValidationError("Neural Link Failure. Ensure backend server is active.");
      addEvent(`Neural processing failure on ${tempId}.`, 'error');
    } finally { setIsAnalyzing(false); }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setStagedFile(file);
      addEvent(`File staged: ${file.name}`, 'info');
    }
  };

  const executeBulkAnalysis = async () => {
    if (!stagedFile) return;
    const file = stagedFile;
    setCsvLoading(true);
    setActiveFileName(file.name);
    addEvent(`Executing bulk analysis: ${file.name}`, 'info');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const parseCSVLine = (line: string) => {
        const res = []; let cur = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && line[i+1] === '"') { cur += '"'; i++; }
          else if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { res.push(cur); cur = ''; }
          else { cur += char; }
        }
        res.push(cur); return res.map(s => s.trim());
      };
      
      const textValue = event.target?.result as string;
      const lines = textValue.split(/\r?\n/).filter(l => l.trim());
      
      if (lines.length < 2) { 
        setCsvLoading(false); 
        addEvent('Analysis aborted: Manifest invalid.', 'error');
        return; 
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
      const textIdx = headers.findIndex(h => ['tickettext', 'description', 'text', 'fulltickettext', 'statement', 'body', 'content', 'subject', 'problem', 'details'].includes(h));
      const idIdx = headers.findIndex(h => ['ticketid', 'id', 'no', 'ref'].includes(h));

      if (textIdx === -1) { 
        setCsvLoading(false); 
        setValidationError(`Mapping failed. Missing core content column. Found: ${headers.join(', ')}`);
        addEvent('Analysis failed: Data column mapping missing.', 'error');
        return; 
      }

      const tickets = lines.slice(1).map((line, idx) => {
        try { const parts = parseCSVLine(line); return { ticket_text: parts[textIdx], ticket_id: idIdx !== -1 ? parts[idIdx] : `B-${idx + 1}` }; } catch (err) { return null; }
      }).filter(t => t && t.ticket_text);

      if (tickets.length === 0) { 
        setCsvLoading(false); 
        setValidationError("Zero valid records found in manifest."); 
        return; 
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/bulk_recommend`, { tickets: tickets.slice(0, 50) });
        if (response.data.results) { 
          setResults(prev => [...response.data.results, ...prev]); 
          setShowImportModal(false); 
          setStagedFile(null);
          addEvent(`Bulk ingestion of ${response.data.results.length} tickets complete.`, 'info');
        }
      } catch (err: any) { 
        addEvent('Server Link Failure. Check neural backend.', 'error');
      } finally { setCsvLoading(false); }
    };
    reader.readAsText(file);
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const sevOk = selectedSeverities.includes(r.severity_prediction.label) || !SEVERITY_OPTIONS.includes(r.severity_prediction.label);
      const teamOk = selectedTeams.includes(r.team_prediction.label) || !TEAM_OPTIONS.includes(r.team_prediction.label);
      const issueOk = selectedIssues.includes(r.issue_prediction.label) || !ISSUE_OPTIONS.includes(r.issue_prediction.label);
      return sevOk && teamOk && issueOk;
    });
  }, [results, selectedSeverities, selectedTeams, selectedIssues]);

  const handleDownloadCSV = () => {
    if (results.length === 0) return;
    addEvent('Generating neural manifest export...', 'info');
    const headers = ['Ticket ID', 'Input Text', 'Severity', 'Category', 'Assigned Team', 'Status'];
    const rows = results.map(r => [
      r.ticket_id,
      `"${r.ticket_text.replace(/"/g, '""')}"`,
      r.severity_prediction.label,
      r.issue_prediction.label,
      r.team_prediction.label,
      r.status || 'Active'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `neural_manifest_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addEvent('Export complete. File downloaded.', 'info');
  };

  const FilterGroup = ({ title, options, selected, onToggle, icon: Icon, onSelectAll, onReset }: any) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {title}</p>
        <div className="flex gap-2">
           <button onClick={onSelectAll} className="text-[7px] font-black uppercase text-zinc-700 hover:text-indigo-400 transition-colors">All</button>
           <button onClick={onReset} className="text-[7px] font-black uppercase text-zinc-700 hover:text-red-400 transition-colors">None</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt: string, index: number) => (
          <button 
            key={opt} onClick={() => onToggle(opt)} 
            className={cn(
              "px-3 py-2 rounded-lg text-[9px] font-bold border transition-all text-center relative group",
              selected.includes(opt) ? "bg-indigo-500/10 border-indigo-500/40 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400",
              (index === options.length - 1 && options.length % 2 !== 0) && "col-span-2"
            )}
          >
            <span className="truncate block">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#0a0b14] text-zinc-100 flex flex-col overflow-hidden text-[12px]">
      <header className="h-14 glass-morphism sticky top-0 z-40 flex items-center justify-between px-6 shrink-0 mx-2 mt-2 rounded-xl border border-white/5">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 group cursor-default">
              <div className="relative">
                 <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl transition-all group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10">
                    <ShieldCheck className="w-6 h-6 text-white" />
                    <Zap className="absolute -top-1 -right-1 w-3.5 h-3.5 text-indigo-400 fill-indigo-400 blur-[0.5px]" />
                 </div>
                 <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              </div>
              <div className="flex flex-col">
                 <div className="flex items-baseline gap-1">
                    <h1 className="font-extrabold text-base tracking-tighter text-white">Smart<span className="text-indigo-400 font-black">Ticket</span></h1>
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">PRO CORE</span>
                 </div>
                 <div className="flex items-center gap-2 overflow-hidden w-full">
                    <div className="relative flex items-center">
                       <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                       <div className="absolute inset-0 w-1 h-1 bg-indigo-400 blur-[2px] animate-ping" />
                    </div>
                    <div className="relative h-2 overflow-hidden flex items-center">
                       <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-[0.3em] whitespace-nowrap">Neural Intelligence Active</p>
                       <motion.div 
                         animate={{ x: ['-100%', '200%'] }} 
                         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                         className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                       />
                    </div>
                 </div>
              </div>
           </div>
           <div className="h-8 w-px bg-zinc-800/30 hidden md:block" />
           <div className="hidden lg:flex items-center gap-5">
              <div className="flex flex-col">
                 <span className="text-[6px] font-black text-zinc-700 uppercase tracking-widest mb-0.5">Neural Sync</span>
                 <div className="flex items-center gap-2">
                    <Activity className={cn("w-2.5 h-2.5 animate-pulse", isOnline ? "text-emerald-500" : "text-amber-500")} />
                    <span className={cn("text-[9px] font-black tabular-nums", isOnline ? "text-zinc-400" : "text-amber-400")}>
                       {isOnline ? "100% stable" : "offline mode"}
                    </span>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {deferredPrompt && (
              <button 
                onClick={handleInstallApp} 
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all text-indigo-400 animate-pulse active:scale-95 shrink-0"
              >
                 <Download className="w-3 h-3" />
                 <span className="text-[8px] font-black uppercase tracking-wider">Install App</span>
              </button>
           )}
           <div className="relative" ref={notificationRef}>
              <button 
                onClick={handleToggleNotifications} 
                className={cn(
                  "p-2 rounded-lg text-zinc-500 hover:text-indigo-400 transition-all relative border", 
                  showNotifications ? "bg-zinc-800 border-indigo-500/30" : "bg-zinc-900 border-zinc-800/60"
                )}
              >
                <Bell className="w-4 h-4" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-[#0a0b14]" />}
              </button>
              <AnimatePresence>{showNotifications && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-4 w-80 bg-[#0a0b14] rounded-2xl p-0 z-[60] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                     <div className="flex border-b border-white/5 bg-white/[0.02]">
                        <button onClick={() => setNotificationTab('alerts')} className={cn("flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all", notificationTab === 'alerts' ? "text-indigo-400 border-b-2 border-indigo-500" : "text-zinc-600 hover:text-zinc-400")}>System Pulse</button>
                        <button onClick={() => setNotificationTab('slack')} className={cn("flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all", notificationTab === 'slack' ? "text-cyan-400 border-b-2 border-cyan-500" : "text-zinc-600 hover:text-zinc-400")}>Pulse</button>
                     </div>
                     <div className="max-h-80 overflow-y-auto scrollbar-hide p-4 space-y-4">
                        {notificationTab === 'alerts' ? (
                          systemEvents.length > 0 ? (
                            systemEvents.map((ev, i) => (
                              <div key={i} className="flex gap-4 group">
                                 <div className={cn("w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border transition-colors", ev.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : ev.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400")}>
                                    {ev.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : ev.type === 'error' ? <Zap className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-[10px] text-zinc-300 font-bold leading-tight group-hover:text-white transition-colors">{ev.msg}</p>
                                    <p className="text-[8px] text-zinc-600 font-black uppercase">{ev.time}</p>
                                 </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-10 text-center text-zinc-600 italic">No system alerts.</div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                             <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-zinc-700" />
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Integration Pending</p>
                                <p className="text-[11px] text-zinc-600 font-medium leading-relaxed italic">External Slack bridge is not currently active. Connectivity hooks are preserved for future deployment.</p>
                             </div>
                          </div>
                        )}
                     </div>
                     <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                        <button onClick={() => setShowNotifications(false)} className="text-[8px] font-black uppercase text-zinc-600 hover:text-zinc-400 tracking-widest">Close Intelligence Hub</button>
                     </div>
                  </motion.div>
                )}</AnimatePresence>
           </div>
        </div>
      </header>

       <div className={cn("flex-1 flex overflow-hidden transition-all duration-300", isSidebarExpanded ? "p-2 gap-2" : "p-2 pl-0 gap-0")}>
        <div className="relative flex shrink-0">
          <motion.aside initial={false} animate={{ width: isSidebarExpanded ? 240 : 0 }} className={cn("glass-morphism rounded-xl flex flex-col relative overflow-hidden transition-all", isSidebarExpanded ? "border border-zinc-800/50" : "border-none")}>
            <div className={cn(
              "flex-1 flex flex-col p-4 space-y-8 scrollbar-hide mt-2 transition-opacity duration-300", 
              !isSidebarExpanded && "opacity-0 pointer-events-none"
            )}>
              <FilterGroup title="Priority" options={SEVERITY_OPTIONS} selected={selectedSeverities} onToggle={(s:string)=>setSelectedSeverities(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} onSelectAll={()=>setSelectedSeverities(SEVERITY_OPTIONS)} onReset={()=>setSelectedSeverities([])} icon={AlertCircle} />
              <FilterGroup title="Segments" options={TEAM_OPTIONS} selected={selectedTeams} onToggle={(s:string)=>setSelectedTeams(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} onSelectAll={()=>setSelectedTeams(TEAM_OPTIONS)} onReset={()=>setSelectedTeams([])} icon={Globe} />
              <FilterGroup title="Classifiers" options={ISSUE_OPTIONS} selected={selectedIssues} onToggle={(s:string)=>setSelectedIssues(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} onSelectAll={()=>setSelectedIssues(ISSUE_OPTIONS)} onReset={()=>setSelectedIssues([])} icon={Layers} />
              <div className="pt-6 border-t border-zinc-800/30 space-y-3">
                 <button 
                   onClick={() => setIsGapModalOpen(true)}
                   className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all text-[9px] font-bold uppercase tracking-widest group"
                 >
                    <Zap className="w-3 h-3 group-hover:scale-110 transition-transform text-zinc-600" />
                    Gap Analysis
                 </button>
                 <button onClick={() => { setResults([]); setActiveFileName(null); addEvent('Registry cache purged.', 'info'); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all text-[9px] font-bold uppercase tracking-widest group">
                    <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform text-zinc-600" /> 
                    Purge Cache
                 </button>
              </div>
            </div>
          </motion.aside>
          
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-16 bg-zinc-900 border border-zinc-800 rounded-r-lg flex items-center justify-center hover:bg-zinc-800 transition-all z-30 shadow-xl",
              isSidebarExpanded ? "left-full" : "left-0"
            )}
          >
            {isSidebarExpanded ? <ChevronLeft className="w-2.5 h-2.5 text-zinc-500" /> : <ChevronRight className="w-2.5 h-2.5 text-zinc-400" />}
          </button>
        </div>

        <main className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 xl:h-[220px]">
             <div className="xl:col-span-8 glass-morphism rounded-xl p-5 flex flex-col relative group overflow-hidden border border-white/5">
                <div className="flex justify-between mb-3 items-center">
                   <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-indigo-400" /><h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Neural Ingestion</h3></div>
                   <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-indigo-500/30 transition-all"><Upload className="w-3 h-3 text-cyan-400" /><span className="text-[8px] font-black uppercase text-zinc-500">Bulk Ingest</span></button>
                </div>
                <div className="flex-1 relative">
                  <textarea value={ticketText} onChange={(e) => { setTicketText(e.target.value); if (validationError) setValidationError(null); }} placeholder="Input technical statement..." className="w-full h-full bg-zinc-950/20 border border-zinc-800/40 rounded-xl p-5 text-lg text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-zinc-800 resize-none font-bold scrollbar-hide" />
                  <AnimatePresence>
                     {validationError && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/20 p-2 rounded-lg backdrop-blur-md z-10">
                           <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-3 h-3" /> {validationError}</p>
                        </motion.div>
                     )}
                  </AnimatePresence>
                  <div className="absolute bottom-4 right-4 animate-in fade-in slide-in-from-bottom-2">
                     <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing} 
                        className={cn(
                          "px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 active:scale-95", 
                          isAnalyzing ? "bg-zinc-800 text-zinc-600" : (validationError && ticketText.length === 0) ? "bg-zinc-900 text-zinc-700" : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl"
                        )}
                     >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3" /> Triage</>}
                     </button>
                  </div>
                </div>
             </div>
             <div className="xl:col-span-4 glass-morphism rounded-xl p-5 flex flex-col relative overflow-hidden border border-white/5">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-cyan-500" /><h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Neural Distribution</h3></div>
                   <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"><span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Flow</span></div>
                </div>
                <div className="flex-1 space-y-3">
                   {Object.entries(
                     results.reduce((acc: any, curr) => {
                       const cat = curr.issue_prediction.label;
                       acc[cat] = (acc[cat] || 0) + 1;
                       return acc;
                     }, {})
                   )
                   .sort((a: any, b: any) => b[1] - a[1])
                   .slice(0, 3)
                   .map(([cat, count]: [string, any]) => (
                     <div key={cat} className="space-y-1">
                        <div className="flex justify-between items-end">
                           <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{cat}</span>
                           <span className="text-[10px] font-black text-zinc-200">{count}</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-[1.5px] rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${(count / results.length) * 100}%` }} className="h-full bg-indigo-500/40" />
                        </div>
                     </div>
                   ))}
                   {results.length === 0 && <div className="h-full flex items-center justify-center italic text-zinc-700 text-[9px] uppercase tracking-widest">Waiting for Ingest...</div>}
                </div>
                <div className="flex justify-between items-end pt-3 mt-3 border-t border-zinc-800/20">
                   <div><p className="text-[7px] text-zinc-700 font-black uppercase tracking-widest mb-0.5">Total Payload</p><p className="text-xl font-black text-white italic tracking-tighter">{results.length < 1000 ? results.length : (results.length/1000).toFixed(1) + 'K'}</p></div>
                   <div className="text-right">
                      <p className="text-[7px] text-zinc-700 font-black uppercase tracking-widest mb-0.5">Critical Ratio</p>
                      <p className="text-[10px] font-black text-red-500/80 uppercase">{((results.filter(r => r.severity_prediction.label === 'Critical').length / (results.length || 1)) * 100).toFixed(0)}% <span className="text-[7px]">Alert</span></p>
                   </div>
                </div>
             </div>
          </div>

          <section className="flex-1 glass-morphism rounded-xl flex flex-col overflow-hidden border border-white/5">
             <div className="px-6 py-4 border-b border-zinc-800/30 shrink-0 bg-white/[0.01] flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Registry Stream</h3>
                   {activeFileName && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                        <FileText className="w-2.5 h-2.5 text-indigo-400" />
                        <span className="text-[8px] font-black uppercase text-indigo-300 tracking-widest">{activeFileName}</span>
                     </div>
                   )}
                </div>
                <button 
                  onClick={handleDownloadCSV} 
                  disabled={results.length === 0}
                  className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg group hover:border-indigo-500/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                   <FileText className="w-3 h-3 text-indigo-400" />
                   <span className="text-[8px] font-black uppercase text-zinc-500 group-hover:text-zinc-300">Export Manifest</span>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left">
                   <thead className="sticky top-0 bg-[#0a0b14]/95 backdrop-blur-md z-10 border-b border-zinc-800/10 text-[8px] font-black uppercase text-zinc-700 tracking-[0.25em]"><tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">Data Vector</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Severity</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-zinc-800/10">{filteredResults.map(r => (
                        <tr key={r.ticket_id} onClick={() => { setSelectedTicket(r); setShowInModalRecommendation(false); }} className={cn("group cursor-pointer transition-all", r.status === 'closed' ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05]" : "hover:bg-white/[0.01]")}>
                           <td className={cn("px-6 py-3 font-mono text-[10px] font-black uppercase transition-colors", r.status === 'closed' ? "text-emerald-500/50" : "text-zinc-600 group-hover:text-indigo-400")}>{r.ticket_id}</td>
                           <td className="px-6 py-3"><span className={cn("text-[12px] font-bold transition-all line-clamp-1", r.status === 'closed' ? "text-emerald-400/40 italic" : "text-zinc-400 opacity-60 group-hover:opacity-100")}>"{r.ticket_text}"</span></td>
                           <td className="px-6 py-3"><span className={cn("text-[10px] font-black uppercase tracking-widest", r.status === 'closed' ? "text-emerald-500/40" : "text-zinc-500")}>{r.issue_prediction.label}</span></td>
                           <td className="px-6 py-3"><span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all", r.status === 'closed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : (r.severity_prediction.label === 'Critical' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"))}>{r.status === 'closed' ? 'RESOLVED' : r.severity_prediction.label}</span></td>
                           <td className="px-6 py-3 text-right"><button className={cn("px-3 py-1 border rounded-lg transition-all text-[8px] font-black uppercase shadow-lg shadow-black/20", r.status === 'closed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400")}>{r.status === 'closed' ? 'View' : 'Expand'}</button></td>
                        </tr>
                      ))}</tbody>
                </table>
             </div>
          </section>
        </main>
      </div>
      <AnimatePresence>{selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)} className="absolute inset-0 bg-[#0a0b14]/95 backdrop-blur-2xl" />
             <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="relative w-full max-w-4xl h-full max-h-[600px] glass-morphism rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-white/5">
                <div className="p-6 border-b border-zinc-800/20 flex justify-between items-center bg-white/[0.01] shrink-0">
                    <div className="flex items-center gap-6">
                       <div className="flex flex-col">
                          <h3 className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-0.5">Neural Manifest <span className="text-zinc-800">//</span></h3>
                          <p className="text-xs font-black text-white italic tracking-tighter uppercase">{selectedTicket.ticket_id}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const isClosed = selectedTicket.status === 'closed';
                              const newStatus = isClosed ? undefined : 'closed';
                              const updatedResults = results.map(r => r.ticket_id === selectedTicket.ticket_id ? { ...r, status: newStatus } : r);
                              setResults(updatedResults);
                              setSelectedTicket({ ...selectedTicket, status: newStatus });
                              addEvent(`Ticket ${selectedTicket.ticket_id} status updated to ${newStatus === 'closed' ? 'RESOLVED' : 'ACTIVE'}.`, 'info');
                            }} 
                            className={cn(
                              "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all border",
                              selectedTicket.status === 'closed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
                            )}
                          >
                             {selectedTicket.status === 'closed' ? "Restore" : "Resolve"}
                          </button>
                       </div>
                    </div>
                    <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500"><X className="w-4 h-4" /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                   <div className="max-w-4xl mx-auto space-y-8">
                      {/* Section 1: Brief Description */}
                      <div className="space-y-2">
                         <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">Description</h4>
                         <p className="text-sm text-zinc-200 font-medium leading-relaxed tracking-tight selection:bg-indigo-500/30">
                           {selectedTicket.ticket_text}
                         </p>
                      </div>

                      {/* Section 2: Analysis Highlights */}
                      <div className="grid grid-cols-3 gap-8">
                         {[ 
                           { l: "TEAM", v: selectedTicket.team_prediction, color: "#06b6d4" },
                           { l: "SEVERITY", v: selectedTicket.severity_prediction, color: "#ef4444" },
                           { l: "CATEGORY", v: selectedTicket.issue_prediction, color: "#6366f1" } 
                         ].map(m => (
                            <div key={m.l} className="group">
                               <p className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-800 mb-1">{m.l}</p>
                               <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-[10px] font-black text-zinc-100 uppercase tracking-tight">{m.v.label}</span>
                                  <span className="text-[8px] font-black text-zinc-700">{(m.v.score * 100).toFixed(0)}%</span>
                               </div>
                               <div className="w-full bg-zinc-900/40 h-[1px] rounded-full overflow-hidden">
                                  <div className="h-full transition-all duration-1000" style={{ width: `${m.v.score*100}%`, backgroundColor: m.color }} />
                               </div>
                            </div>
                         ))}
                      </div>

                      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent" />

                      {/* Section 3: Neural Recommendation */}
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-500/80">Neural Recommendation</h4>
                         </div>
                         
                         {!showInModalRecommendation ? (
                            <div className="py-8 border border-zinc-900/50 rounded-xl flex flex-col items-center justify-center space-y-4 bg-white/[0.005]">
                               <Sparkles className="w-5 h-5 text-indigo-500/10" />
                               <button onClick={() => setShowInModalRecommendation(true)} className="px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-500/20 transition-all active:scale-95">Analyze Solution</button>
                            </div>
                         ) : (
                           <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                             {selectedTicket.suggestions.length > 0 ? (
                               <div className="space-y-6">
                                 <div className="space-y-1">
                                    <h5 className="text-sm font-black text-white tracking-tight">{selectedTicket.suggestions[0].title}</h5>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed max-w-2xl">{selectedTicket.suggestions[0].summary}</p>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedTicket.suggestions[0].resolution_steps.split(';').map((step:string, i:number, arr:any[]) => (
                                      <div 
                                        key={i} 
                                        className={cn(
                                          "flex gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] group hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20",
                                          arr.length === 3 && i === 2 ? "md:col-span-2 md:w-1/2 md:mx-auto" : ""
                                        )}
                                      >
                                         <span className="text-[10px] font-black text-indigo-400 mt-0.5">{String(i+1).padStart(2, '0')}</span>
                                         <p className="text-[12px] text-zinc-200 leading-relaxed font-medium">{step.trim()}</p>
                                      </div>
                                    ))}
                                 </div>
                               </div>
                             ) : (
                               <div className="py-10 text-center border border-zinc-900/30 rounded-xl">
                                  <AlertCircle className="w-4 h-4 text-zinc-800 mx-auto mb-2" />
                                  <p className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">No Suggestion Available</p>
                               </div>
                             )}
                           </motion.div>
                         )}
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}</AnimatePresence>

       <AnimatePresence>{showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowImportModal(false); setStagedFile(null); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl overflow-hidden">
                <div className="text-center space-y-3">
                   <div className="w-16 h-16 bg-zinc-800 text-zinc-100 rounded-xl flex items-center justify-center mx-auto shadow-md mb-6">{csvLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Database className="w-8 h-8" />}</div>
                   <h3 className="text-2xl font-bold tracking-tight text-zinc-100">{csvLoading ? "Processing" : stagedFile ? "File Staged" : "Import Records"}</h3>
                   {csvLoading ? (<p className="text-[10px] text-zinc-400 font-bold animate-pulse tracking-widest uppercase">Triage in progress...</p>) : stagedFile ? (<p className="text-[9px] text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis px-4">Ready: {stagedFile.name}</p>) : (<p className="text-[9px] text-zinc-500 font-medium">Drop a CSV to begin bulk classification.</p>)}
                </div>
                
                {!csvLoading && !stagedFile && (
                  <div 
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => { 
                       e.preventDefault(); 
                       e.stopPropagation(); 
                       setIsDragging(false); 
                       const file = e.dataTransfer.files[0]; 
                       if (file && file.name.endsWith('.csv')) {
                          handleFileSelection({ target: { files: [file] } } as any);
                       }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "group relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer",
                      isDragging ? "bg-zinc-800 border-zinc-600 scale-[1.01]" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                     <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center transition-all", isDragging ? "bg-zinc-100 border-white text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-700")}>
                        <Upload className={cn("w-5 h-5", isDragging && "animate-bounce")} />
                     </div>
                     <div className="text-center pointer-events-none">
                        <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isDragging ? "text-white" : "text-zinc-500")}>{isDragging ? "Ready to Stage" : "Click or Drop CSV"}</p>
                        <p className="text-[7px] font-bold text-zinc-700 uppercase tracking-widest leading-none">Limit: 50 records</p>
                     </div>
                     <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileSelection} className="hidden" />
                  </div>
                )}

                {!csvLoading && stagedFile && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                        <FileText className="w-10 h-10 text-zinc-400" />
                        <div className="text-center">
                           <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest mb-1 truncate max-w-[200px]">{stagedFile.name}</p>
                           <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{(stagedFile.size / 1024).toFixed(1)} KB • CSV Manifest</p>
                        </div>
                        <button onClick={() => { setStagedFile(null); setValidationError(null); }} className="mt-2 text-[8px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors underline underline-offset-4">Reset Selection</button>
                     </div>

                     {validationError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl animate-in fade-in zoom-in-95">
                           <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest leading-normal text-center">{validationError}</p>
                        </div>
                     )}

                     <button 
                        onClick={executeBulkAnalysis}
                        className="w-full bg-white hover:bg-zinc-200 py-4 rounded-xl flex items-center justify-center gap-3 text-zinc-950 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-[0.98]"
                     >
                        <Zap className="w-4 h-4" />
                        Execute Analysis
                     </button>
                  </motion.div>
                )}

                <div className={cn("flex flex-col gap-3", !stagedFile && "pt-2")}>
                   <button onClick={() => { setShowImportModal(false); setStagedFile(null); }} disabled={csvLoading} className="py-2 text-[9px] font-bold uppercase text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest">Cancel</button>
                </div>
                {csvLoading && (<div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800 overflow-hidden"><motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-full h-full bg-indigo-500" /></div>) }
             </motion.div>
          </div>
        )}</AnimatePresence>

       <AnimatePresence>{isGapModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGapModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-10 space-y-10">
                   <div className="flex justify-between items-center pb-6 border-b border-zinc-800">
                      <div className="space-y-1">
                         <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-100">Neural Gap Report</h3>
                         <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest leading-none">Intelligence Hub Audit</p>
                      </div>
                      <button onClick={() => setIsGapModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-500" /></button>
                   </div>

                   <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <h4 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-zinc-400" /> Domain Saturation</h4>
                         <div className="h-56 w-full bg-zinc-950 rounded-xl border border-zinc-800 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ISSUE_OPTIONS.map(opt => ({ 
                                 subject: opt, 
                                 A: results.some(r => r.issue_prediction.label === opt) ? 100 : 20,
                                 fullMark: 100 
                               }))}>
                                  <PolarGrid stroke="#27272a" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 7, fontWeight: 700 }} />
                                  <Radar name="Coverage" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                               </RadarChart>
                            </ResponsiveContainer>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-zinc-400" /> Actionability Core</h4>
                         <div className="h-56 w-full bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Resolved', value: results.filter(r => r.suggestions.length > 0).length },
                                      { name: 'Pending', value: results.length - results.filter(r => r.suggestions.length > 0).length || 1 }
                                    ]}
                                    cx="50%" cy="50%" innerRadius={60} outerRadius={75} paddingAngle={5} dataKey="value"
                                  >
                                     <Cell fill="#4f46e5" stroke="none" />
                                     <Cell fill="#27272a" stroke="none" />
                                  </Pie>
                               </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-3xl font-bold text-white tracking-tight">{(results.filter(r => r.suggestions.length > 0).length / (results.length || 1) * 100).toFixed(0)}%</span>
                               <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-1">Verified</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6 py-6 border-t border-zinc-800">
                      <div className="flex flex-col">
                         <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1.5">Uncertainty Burst</span>
                         <span className="text-base font-bold text-zinc-200 tracking-tight uppercase">{(results.filter(r => r.issue_prediction.score < 0.9).length / (results.length || 1) * 100).toFixed(1)}% <span className="text-xs text-zinc-600">unstable</span></span>
                      </div>
                      <div className="flex flex-col text-right">
                         <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1.5">Neural Status</span>
                         <span className="text-base font-bold text-zinc-200 tracking-tight uppercase">{results.length > 0 ? "Analyzing" : "Standby"}</span>
                      </div>
                   </div>

                   <button onClick={() => setIsGapModalOpen(false)} className="w-full py-4 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-white transition-all active:scale-[0.98] shadow-lg">Acknowledge Neural Audit</button>
                </div>
             </motion.div>
          </div>
        )}</AnimatePresence>
    </div>
  );
}
