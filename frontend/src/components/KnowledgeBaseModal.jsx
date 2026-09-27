import React, { useState, useEffect } from 'react';
import { X, Search, ShieldAlert, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

export default function KnowledgeBaseModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [kbData, setKbData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !kbData) {
      setIsLoading(true);
      fetch('/api/knowledge-base')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setKbData(data.data);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('KB load error:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, kbData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/knowledge-base?query=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.data || []);
          }
        })
        .catch(console.error);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl border border-white/10 overflow-hidden bg-slate-950">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Automotive Knowledge Base & Safety Matrix
              </h3>
              <p className="text-xs text-slate-400">
                8 Mechanical Categories • Diagnostic Protocols • Strict Safety Constraints
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symptoms (e.g., brakes, battery clicking, overheating steam, lifter tick)..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm animate-pulse">
              Loading Diagnostic Knowledge Base...
            </div>
          ) : searchResults !== null ? (
            /* Search Results View */
            <div className="flex flex-col gap-4">
              <div className="text-xs font-semibold text-slate-400">
                Found {searchResults.length} topic match{searchResults.length === 1 ? '' : 'es'} for "{searchQuery}"
              </div>
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No matching diagnostic rules found. Try searching for "brakes", "transmission", "battery", or "overheating".
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-cyan-400">
                        {item.category} — {item.topic?.id?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.safetyLevel === 'CRITICAL' 
                          ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {item.safetyLevel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      <strong className="text-slate-400">Symptoms:</strong> {(item.topic?.symptoms || []).join(', ')}
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong className="text-slate-400">Potential Causes:</strong> {(item.topic?.potentialCauses || []).join(', ')}
                    </div>
                    <div className="text-xs text-emerald-300 font-medium bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                      <strong>Recommended Action:</strong> {item.topic?.recommendedAction}
                    </div>
                    {item.topic?.criticalWarning && (
                      <div className="text-xs text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                        ⚠️ <strong>Warning:</strong> {item.topic.criticalWarning}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : kbData ? (
            /* Full Category View */
            <div className="flex flex-col gap-6">
              {/* Safety Rules Section */}
              {kbData.safetyEscalation && (
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5" />
                      <span>{kbData.safetyEscalation.name}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-500/30 text-white">
                      MANDATORY DIRECTIVES
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {(kbData.safetyEscalation.coreDirectives || []).map((dir, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-red-500/20 text-xs text-slate-300 flex flex-col gap-1">
                        <span className="font-bold text-red-300">{dir.directive}</span>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{dir.rule || dir.protocol}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8 Mechanical Categories */}
              {Object.entries(kbData)
                .filter(([key]) => key !== 'safetyEscalation' && key !== 'safety_escalation')
                .map(([key, category]) => (
                  <div key={key} className="p-5 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-cyan-400" />
                        {category.name || key.toUpperCase()}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {category.safetyLevel || 'STANDARD'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 italic">
                      {category.disclaimer}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                      {(category.subtopics || []).map((sub, sIdx) => (
                        <div key={sIdx} className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col gap-1.5 text-xs">
                          <span className="font-semibold text-cyan-300">
                            {sub.id.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <p className="text-slate-400 text-[11px]">
                            <strong>Symptoms:</strong> {(sub.symptoms || []).join(', ')}
                          </p>
                          <p className="text-emerald-400/90 text-[11px]">
                            <strong>Action:</strong> {sub.recommendedAction}
                          </p>
                          {sub.criticalWarning && (
                            <p className="text-red-300 text-[10px] bg-red-950/30 p-1.5 rounded border border-red-500/20">
                              ⚠️ {sub.criticalWarning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
