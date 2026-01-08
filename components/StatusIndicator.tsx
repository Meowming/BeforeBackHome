
import React from 'react';
import { Situation } from '../types';

interface StatusIndicatorProps {
  situation: Situation;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ situation }) => {
  const { severity, status_label } = situation;

  // Calculate color from green (0) to red (100)
  // severity 0: #10b981 (emerald-500)
  // severity 50: #f59e0b (amber-500)
  // severity 100: #ef4444 (red-500)
  const getSeverityColor = (val: number) => {
    if (val < 50) return `rgb(${Math.floor(16 + (val / 50) * (245 - 16))}, ${Math.floor(185 - (val / 50) * (185 - 158))}, ${Math.floor(129 - (val / 50) * (129 - 11))})`;
    const p = (val - 50) / 50;
    return `rgb(${Math.floor(245 + p * (239 - 245))}, ${Math.floor(158 - p * (158 - 68))}, ${Math.floor(11 - p * (11 - 68))})`;
  };

  const currentColor = getSeverityColor(severity);

  return (
    <div className="w-full max-w-md mx-auto py-6 px-8 bg-slate-900/40 border border-white/5 rounded-3xl backdrop-blur-md shadow-2xl animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-3">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">局势监控</span>
        <span 
          className="text-lg font-black italic serif tracking-wider transition-colors duration-500"
          style={{ color: currentColor, textShadow: `0 0 15px ${currentColor}66` }}
        >
          {status_label}
        </span>
      </div>
      
      <div className="relative h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${Math.max(2, Math.min(100, severity))}%`,
            backgroundColor: currentColor,
            boxShadow: `0 0 20px ${currentColor}aa`
          }}
        />
        {/* Decorative markers */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
      </div>
      
      <div className="mt-2 flex justify-between text-[8px] font-bold text-slate-600 tracking-widest uppercase">
        <span>安全</span>
        <span>危险</span>
      </div>
    </div>
  );
};

export default StatusIndicator;
