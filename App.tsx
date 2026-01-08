
import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { Fragment, Stats, GameHistoryItem, TurnOutcome } from './types';
import { adjudicateTurn } from './services/geminiService';
import FragmentCard from './components/FragmentCard';
import StatsDisplay from './components/StatsDisplay';

const INITIAL_FRAGMENTS: Fragment[] = [
  { id: '1-1', text: '“砰！”防盗门被推开的声音清脆地响彻走廊。', isFixed: true },
  { id: '1-2', text: '我还在电脑前打得火热，屏幕上大大的“VICTORY”还没褪去。', isFixed: false },
  { id: '1-3', text: '父母的说话声在门外响起，“今天超市人真多啊。”', isFixed: false },
  { id: '1-4', text: '我感到一阵寒意从脊梁骨升起，手心全是冷汗。', isFixed: false },
  { id: '1-5', text: '迅速伸手去摸显示器的电源开关。', isFixed: false },
];

const INITIAL_STATS: Stats = {
  trust: 50,
  autonomy: 50,
  study: 50,
  risk: 30,
  coherence: 100
};

const App: React.FC = () => {
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [currentFragments, setCurrentFragments] = useState<Fragment[]>(INITIAL_FRAGMENTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<TurnOutcome['outcome'] | null>(null);
  const [feedback, setFeedback] = useState<string>("时间紧迫，父母已经到门口了。");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCurrentFragments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // Don't allow moving fixed items or moving items onto fixed items' exact logic
        // Though dnd-kit handle this by disabling sensors on fixed items, 
        // we should ensure the order of fixed items stays relatively consistent if multiple exist.
        // Simple strategy: Allow move as long as it's not a fixed item being moved.
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || gameOutcome?.is_game_over) return;

    setIsSubmitting(true);
    try {
      const historyTexts = history.flatMap(h => h.fragments.map(f => f.text));
      const currentOrderTexts = currentFragments.map(f => f.text);
      
      const result = await adjudicateTurn(historyTexts, currentOrderTexts, stats);

      // Update stats based on delta
      setStats(prev => ({
        trust: prev.trust + (result.delta.trust || 0),
        autonomy: prev.autonomy + (result.delta.autonomy || 0),
        study: prev.study + (result.delta.study || 0),
        risk: prev.risk + (result.delta.risk || 0),
        coherence: prev.coherence + (result.delta.coherence || 0),
      }));

      // Check for death by stats
      const newTrust = stats.trust + (result.delta.trust || 0);
      const newAutonomy = stats.autonomy + (result.delta.autonomy || 0);
      const newStudy = stats.study + (result.delta.study || 0);

      if (newTrust < 0 || newAutonomy < 0 || newStudy < 0) {
        setGameOutcome({
          is_game_over: true,
          ending_type: 'none',
          ending_text: '你在精神压力和长期的冲突中彻底崩溃了。'
        });
      } else if (result.outcome.is_game_over) {
        setGameOutcome(result.outcome);
      } else {
        // Prepare next round
        setHistory(prev => [...prev, { 
          round: prev.length + 1, 
          fragments: currentFragments, 
          outcome: result 
        }]);
        
        setFeedback(result.player_feedback_cn);
        
        // Randomly assign fixed property to 1-2 items in next fragments for narrative anchoring
        const nextFragments: Fragment[] = result.next_fragments_cn.map((text, idx) => ({
          id: `${history.length + 2}-${idx}`,
          text,
          isFixed: idx === 0 // Usually the first one returned is the anchor
        }));
        
        setCurrentFragments(nextFragments);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error) {
      console.error(error);
      alert("通信中断，请重试一次。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const restartGame = () => {
    setStats(INITIAL_STATS);
    setHistory([]);
    setCurrentFragments(INITIAL_FRAGMENTS);
    setGameOutcome(null);
    setFeedback("时间紧迫，父母已经到门口了。");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center pb-20">
      {/* Header & Stats */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-xl font-bold py-3 text-slate-100 tracking-widest serif">回家之前</h1>
          <StatsDisplay stats={stats} />
        </div>
      </header>

      <main className="w-full max-w-2xl px-4 mt-8">
        {/* Previous Rounds (Locked) */}
        <div className="space-y-8 mb-12">
          {history.map((item, hIdx) => (
            <div key={`history-${hIdx}`} className="opacity-40 select-none grayscale-[0.5]">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-4 h-px bg-slate-800"></span>
                第 {item.round} 回合回顾
                <span className="flex-grow h-px bg-slate-800"></span>
              </div>
              {item.fragments.map((f) => (
                <FragmentCard key={f.id} fragment={f} isLocked={true} />
              ))}
              {item.outcome && (
                <div className="mt-2 text-sm text-slate-400 italic border-l-2 border-slate-700 pl-4 py-1">
                   {item.outcome.player_feedback_cn}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current Round (Active) */}
        {!gameOutcome && (
          <div className="relative">
            <div className="mb-6 text-center">
               <p className="text-slate-300 font-medium serif text-lg animate-pulse">{feedback}</p>
               <p className="text-slate-500 text-xs mt-2 uppercase tracking-tighter">拖拽碎片重新排序，点击提交</p>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentFragments.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentFragments.map((f) => (
                  <FragmentCard key={f.id} fragment={f} isLocked={false} />
                ))}
              </SortableContext>
            </DndContext>

            <div className="mt-10 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`
                  px-12 py-4 rounded-full font-bold text-lg tracking-widest transition-all
                  ${isSubmitting 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    正在审视...
                  </span>
                ) : '提交叙事'}
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOutcome && (
          <div className="mt-12 p-8 bg-slate-900/80 border border-slate-700 rounded-2xl text-center backdrop-blur-sm shadow-2xl animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-bold text-slate-100 mb-6 serif">
              {gameOutcome.ending_type === 'none' ? '命运尘埃落定' : '结局'}
            </h2>
            <div className="text-lg text-slate-300 leading-relaxed mb-8">
              {gameOutcome.ending_text}
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-8 text-sm border-y border-slate-800 py-6">
              <div>
                <span className="block text-slate-500 mb-1">信任度</span>
                <span className="text-xl font-bold text-blue-400">{Math.round(stats.trust)}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-1">自主感</span>
                <span className="text-xl font-bold text-emerald-400">{Math.round(stats.autonomy)}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-1">学业分</span>
                <span className="text-xl font-bold text-amber-400">{Math.round(stats.study)}</span>
              </div>
            </div>

            <button
              onClick={restartGame}
              className="px-10 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-colors"
            >
              重新开始
            </button>
          </div>
        )}
      </main>

      {/* Footer hint */}
      <footer className="fixed bottom-0 left-0 w-full py-2 text-center text-[10px] text-slate-700 uppercase tracking-widest pointer-events-none">
        回家之前 - 叙事片段重组实验
      </footer>
    </div>
  );
};

export default App;
