import React from 'react';
import { Zap, Flame, AlertOctagon, BatteryCharging, Wind, Cog, Volume2 } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'smoke',
    title: 'Smoke & Overheating',
    icon: Flame,
    danger: true,
    prompt: 'Help, thick white smoke is coming from under my hood and the engine temp is pinned in the red!'
  },
  {
    id: 'brakes',
    title: 'Brakes to Floor',
    icon: AlertOctagon,
    danger: true,
    prompt: 'My brake pedal goes completely to the floorboard and I have very little stopping power!'
  },
  {
    id: 'battery',
    title: 'Battery Clicking',
    icon: BatteryCharging,
    danger: false,
    prompt: 'When I try to start my car I just hear a fast clicking noise and the dash lights flicker.'
  },
  {
    id: 'ac',
    title: 'A/C Blowing Warm',
    icon: Wind,
    danger: false,
    prompt: 'My air conditioning is blowing lukewarm ambient air even when turned to maximum AC.'
  },
  {
    id: 'trans',
    title: 'Transmission Slipping',
    icon: Cog,
    danger: false,
    prompt: 'The engine revs very high before catching gear and shifting from 1st into 2nd.'
  },
  {
    id: 'noise',
    title: 'Humming Noise in Turn',
    icon: Volume2,
    danger: false,
    prompt: 'I hear a loud droning or humming noise at 45 mph that gets louder when I turn the steering wheel to the right.'
  }
];

export default function QuickScenarios({ onSelectScenario, disabled }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/60 border-y border-white/5 overflow-x-auto no-scrollbar shrink-0">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 shrink-0 mr-1">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>Scenarios:</span>
      </div>

      <div className="flex items-center gap-2">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.prompt)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0 disabled:opacity-50 ${
                sc.danger
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30 hover:border-red-500/60'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10 hover:border-cyan-500/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${sc.danger ? 'text-red-400' : 'text-cyan-400'}`} />
              <span>{sc.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
