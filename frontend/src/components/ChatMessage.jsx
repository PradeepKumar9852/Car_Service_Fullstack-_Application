import React from 'react';
import { Bot, User, Volume2, AlertTriangle } from 'lucide-react';

export default function ChatMessage({ message, onSpeak }) {
  const isAssistant = message.role === 'assistant';
  const isCritical = message.safetyAlert && message.safetyAlert.isEmergency;

  return (
    <div className={`flex gap-3.5 max-w-[88%] sm:max-w-[80%] animate-fade-in ${
      isAssistant ? 'self-start' : 'self-end flex-row-reverse'
    }`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
        isAssistant 
          ? isCritical 
            ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-red-500/30'
            : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
          : 'bg-gradient-to-br from-slate-600 to-slate-800 text-slate-200 shadow-slate-900/40'
      }`}>
        {isAssistant ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      {/* Message Bubble Body */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className={`flex items-center gap-2 text-[11px] ${
          isAssistant ? 'justify-start' : 'justify-end'
        }`}>
          <span className="font-semibold text-slate-300">
            {isAssistant ? 'Alex (Service Advisor)' : 'You'}
          </span>
          <span className="text-slate-500 font-mono text-[10px]">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
          </span>
        </div>

        <div className={`p-4 rounded-2xl text-sm leading-relaxed border shadow-md relative group transition-all ${
          isAssistant
            ? isCritical
              ? 'bg-red-950/70 border-red-500/60 text-red-100 rounded-tl-sm shadow-red-950/40'
              : 'bg-slate-900/90 border-white/10 text-slate-100 rounded-tl-sm shadow-black/30'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400/40 text-white font-medium rounded-tr-sm shadow-cyan-900/20'
        }`}>
          {/* Emergency Tag inside bubble */}
          {isCritical && isAssistant && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-2 pb-1.5 border-b border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
              <span>SAFETY PROTOCOL INSTRUCTION</span>
            </div>
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Replay Audio TTS button */}
          {isAssistant && onSpeak && (
            <button
              onClick={() => onSpeak(message.content)}
              className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-cyan-300"
              title="Speak out loud"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
