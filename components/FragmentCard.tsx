
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment } from '../types';

interface FragmentCardProps {
  fragment: Fragment;
  isLocked: boolean;
  isAlternative?: boolean;
}

const FragmentCard: React.FC<FragmentCardProps> = ({ fragment, isLocked, isAlternative }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: fragment.id,
    disabled: fragment.isFixed || isLocked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : (isLocked ? 0.4 : 1),
  };

  const isNew = fragment.isNew;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative p-4 mb-3 rounded-xl border-2 text-sm leading-relaxed transition-all duration-300
        ${fragment.isFixed 
          ? 'bg-slate-900/40 border-slate-700/50 text-slate-500 italic cursor-default' 
          : isLocked 
            ? 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-default scale-95'
            : isAlternative
              ? 'bg-gradient-to-br from-indigo-900/60 to-purple-900/40 border-indigo-400/50 text-indigo-100 hover:border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] cursor-grab active:cursor-grabbing'
              : isNew
                ? 'bg-gradient-to-br from-emerald-900/40 to-slate-900 border-emerald-500/50 text-emerald-100 animate-in zoom-in-95'
                : 'bg-slate-900/80 border-indigo-500/30 text-slate-100 hover:border-indigo-400/80 cursor-grab active:cursor-grabbing shadow-lg'
        }
      `}
      {...(!fragment.isFixed && !isLocked ? { ...attributes, ...listeners } : {})}
    >
      {fragment.isFixed && (
        <div className="absolute -top-2.5 -left-2 bg-slate-800 text-[10px] font-bold px-2 py-0.5 rounded text-slate-500 border border-slate-700 uppercase tracking-tighter">
          基石
        </div>
      )}

      {isNew && !isLocked && !isAlternative && (
        <div className="absolute -top-2.5 -right-2 bg-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded text-white border border-emerald-400 shadow-glow uppercase tracking-tighter">
          新命运
        </div>
      )}

      <p className={`pr-2 ${isAlternative ? 'font-medium' : ''}`}>
        {fragment.text}
      </p>

      {/* Fix: changed isFixed to fragment.isFixed */}
      {!isLocked && !fragment.isFixed && !isAlternative && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-60 transition-opacity">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r=".5"/><circle cx="9" cy="12" r=".5"/><circle cx="9" cy="19" r=".5"/><circle cx="15" cy="5" r=".5"/><circle cx="15" cy="12" r=".5"/><circle cx="15" cy="19" r=".5"/></svg>
        </div>
      )}
    </div>
  );
};

export default FragmentCard;
