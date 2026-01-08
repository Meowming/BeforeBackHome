
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment } from '../types';

interface FragmentCardProps {
  fragment: Fragment;
  isLocked: boolean;
}

const FragmentCard: React.FC<FragmentCardProps> = ({ fragment, isLocked }) => {
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
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : (isLocked ? 0.6 : 1),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative p-4 mb-3 rounded-lg border text-sm md:text-base leading-relaxed transition-all
        ${fragment.isFixed 
          ? 'bg-slate-700/80 border-slate-500 text-slate-300 italic' 
          : isLocked 
            ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-500 cursor-grab active:cursor-grabbing shadow-lg'
        }
      `}
      {...(!fragment.isFixed && !isLocked ? { ...attributes, ...listeners } : {})}
    >
      {fragment.isFixed && (
        <div className="absolute -top-2 -left-2 bg-slate-600 text-[10px] px-2 py-0.5 rounded text-slate-200 border border-slate-500 uppercase tracking-tighter">
          固定
        </div>
      )}
      
      {!fragment.isFixed && !isLocked && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
      )}

      <p className="pr-6">{fragment.text}</p>
    </div>
  );
};

export default FragmentCard;
