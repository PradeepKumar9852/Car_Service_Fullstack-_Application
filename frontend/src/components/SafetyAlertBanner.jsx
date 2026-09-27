import React from 'react';
import { AlertOctagon, ShieldAlert, PhoneCall } from 'lucide-react';

export default function SafetyAlertBanner({ safetyAlert = {} }) {
  if (!safetyAlert || !safetyAlert.isEmergency) return null;

  return (
    <div className="p-4 rounded-2xl bg-red-950/80 border-2 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.35)] flex flex-col gap-2.5 animate-pulse-fast text-red-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-red-400 font-bold text-sm tracking-wide">
          <AlertOctagon className="w-5 h-5 text-red-400 animate-bounce" />
          <span>CRITICAL SAFETY ESCALATION [{safetyAlert.level || 'CRITICAL'}]</span>
        </div>
        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-red-500/30 text-white border border-red-400/50">
          Emergency Action
        </span>
      </div>

      <p className="text-xs text-red-100 font-medium leading-relaxed">
        {safetyAlert.advice || 'PULL OVER SAFELY & TURN OFF ENGINE IMMEDIATELY. Do not attempt to continue driving.'}
      </p>

      <div className="flex items-center gap-2 pt-1 border-t border-red-500/30 text-[11px] text-red-300 font-semibold">
        <PhoneCall className="w-3.5 h-3.5" />
        <span>Roadside Tow Assistance Recommended</span>
      </div>
    </div>
  );
}
