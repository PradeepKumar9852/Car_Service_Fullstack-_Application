import React from 'react';
import { Wrench, Shield, Check, Flame, AlertTriangle } from 'lucide-react';

export default function DiagnosticCard({ diagnosticContext = {} }) {
  const category = diagnosticContext.category || 'general';
  const suggestedAction = diagnosticContext.suggestedAction || 'Certified Multi-Point Inspection & OBD-II Diagnostic Scan';
  const matchedKnowledge = diagnosticContext.matchedKnowledge || [];

  const getCategoryColor = (cat) => {
    switch (cat.toLowerCase()) {
      case 'brakes':
      case 'overheating':
      case 'safety_escalation':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'battery':
      case 'engine':
      case 'transmission':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'ac':
      case 'tyres':
      case 'noises':
      default:
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-white/10 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wrench className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Diagnostic Triage
          </h2>
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getCategoryColor(category)}`}>
          {category}
        </span>
      </div>

      {/* Recommended Service Box */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border-l-4 border-cyan-500 border-y border-r border-white/5 flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Recommended Service Action
        </span>
        <p className="text-xs font-medium text-slate-200 leading-relaxed">
          {suggestedAction}
        </p>
      </div>

      {/* Matched Protocols List */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Active Knowledge Protocols ({matchedKnowledge.length > 0 ? matchedKnowledge.length : '8 Categories Armed'})
        </span>
        
        {matchedKnowledge.length > 0 ? (
          <div className="flex flex-col gap-2">
            {matchedKnowledge.map((item, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col gap-1.5 text-xs animate-fade-in"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-cyan-300 truncate">
                    {item.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.safetyLevel === 'CRITICAL' 
                      ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {item.safetyLevel || 'STANDARD'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                  {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-900/30 border border-white/5">
            Engine, Battery, Overheating, Brakes, Tyres, Transmission, AC, Noises, and Safety rules monitored in real-time.
          </p>
        )}
      </div>
    </div>
  );
}
