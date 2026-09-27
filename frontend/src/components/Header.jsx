import React from 'react';
import { Wrench, RotateCcw, BookOpen, Cpu, ShieldCheck } from 'lucide-react';

export default function Header({ 
  systemStatus, 
  modelName, 
  onOpenKnowledgeBase, 
  onResetSession, 
  isResetting 
}) {
  return (
    <header className="glass-panel rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl border border-white/10">
      {/* Brand & Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white">
          <Wrench className="w-6 h-6 animate-pulse-fast" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Precision AutoCare <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">AI</span>
            </h1>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Voice & Chat Agent
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Certified Service Advisor & Safety Triage System
          </p>
        </div>
      </div>

      {/* Status Badges & Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Backend Online Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs font-medium">
          <span className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-red-500'}`} />
          <span className="text-slate-300">
            {systemStatus === 'online' ? 'System Online' : 'Connecting...'}
          </span>
        </div>

        {/* AI Engine Model */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[140px]">{modelName}</span>
        </div>

        {/* Knowledge Base Trigger */}
        <button
          onClick={onOpenKnowledgeBase}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 border border-white/10 hover:border-cyan-500/50 transition-all hover:text-white"
          title="Browse Local Diagnostic Knowledge Base"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Knowledge Base</span>
        </button>

        {/* Reset Session Button */}
        <button
          onClick={onResetSession}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-300 border border-red-500/30 hover:border-red-500/60 transition-all disabled:opacity-50"
          title="Start a fresh conversation"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>New Session</span>
        </button>
      </div>
    </header>
  );
}
