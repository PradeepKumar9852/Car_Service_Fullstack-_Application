import React from 'react';
import { 
  User, 
  Phone, 
  Clock, 
  Car, 
  AlertCircle, 
  Gauge, 
  ShieldAlert, 
  CheckCircle2, 
  Circle, 
  Download,
  ClipboardCheck
} from 'lucide-react';

export default function IntakeProgressCard({ customerProfile = {}, intake = {}, onExportJson }) {
  const fields = [
    { key: 'name', label: 'Customer Name', icon: User, placeholder: 'Waiting for name...' },
    { key: 'phone', label: 'Contact Phone', icon: Phone, placeholder: 'Waiting for phone...' },
    { key: 'vehicleModel', label: 'Vehicle Model', icon: Car, placeholder: 'e.g. 2019 Toyota Camry' },
    { key: 'issueStartTime', label: 'Issue Started', icon: Clock, placeholder: 'e.g. Yesterday morning' },
    { key: 'complaint', label: 'Reported Issue', icon: AlertCircle, placeholder: 'Primary symptoms...' },
    { key: 'mileage', label: 'Approx. Mileage', icon: Gauge, placeholder: 'e.g. 65,000 mi' },
    { key: 'drivableStatus', label: 'Drivable Status', icon: ShieldAlert, placeholder: 'Drivable / Unsafe' }
  ];

  const progress = intake.progressPercentage || 0;
  const isComplete = Boolean(intake.isComplete);

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-white/10 shadow-xl">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Customer Intake Progress
          </h2>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
          isComplete 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        }`}>
          {progress}% Complete
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-white/5">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(6,182,212,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist Grid */}
      <div className="flex flex-col gap-2">
        {fields.map((field) => {
          const val = customerProfile[field.key];
          const hasValue = val && val !== 'Unknown' && val !== 'null';
          const Icon = field.icon;

          return (
            <div 
              key={field.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all border ${
                hasValue 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' 
                  : 'bg-slate-900/40 border-white/5 text-slate-400'
              }`}
            >
              {/* Status Indicator Icon */}
              <div className="shrink-0">
                {hasValue ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-fade-in" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </div>

              {/* Field Label & Value */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-300">{field.label}:</span>
                </div>
                <span className={`truncate text-right font-mono text-[11px] ${
                  hasValue ? 'text-white font-medium' : 'text-slate-500 italic'
                }`}>
                  {hasValue ? val : field.placeholder}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intake Complete Celebratory Export Card */}
      {isComplete && (
        <div className="mt-1 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900/90 border border-emerald-500/40 flex items-center justify-between gap-3 animate-slide-up shadow-lg shadow-emerald-900/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Intake Verified & Complete!</span>
          </div>
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Order</span>
          </button>
        </div>
      )}
    </div>
  );
}
