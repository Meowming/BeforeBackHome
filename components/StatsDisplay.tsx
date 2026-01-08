
import React from 'react';
import { Stats } from '../types';

interface StatsDisplayProps {
  stats: Stats;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats }) => {
  const renderStat = (label: string, value: number, color: string) => (
    <div className="flex flex-col items-center px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 shadow-inner">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{label}</span>
      <div className="relative w-16 h-1 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div 
          className={`absolute top-0 left-0 h-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-lg font-bold text-slate-100">{Math.round(value)}</span>
    </div>
  );

  return (
    <div className="flex justify-center gap-4 py-6 w-full max-w-2xl mx-auto">
      {renderStat('父母信任', stats.trust, 'bg-blue-500')}
      {renderStat('自主感', stats.autonomy, 'bg-emerald-500')}
      {renderStat('学业表现', stats.study, 'bg-amber-500')}
    </div>
  );
};

export default StatsDisplay;
