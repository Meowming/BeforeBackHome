
import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { Fragment, Situation, GameHistoryItem, TurnOutcome } from './types';
import { adjudicateTurn } from './services/geminiService';
import FragmentCard from './components/FragmentCard';
import StatusIndicator from './components/StatusIndicator';

const BAD_ENDING_DEMO = [
  { text: "“砰！”防盗门被推开的声音清脆地响彻走廊。", delay: 1000 },
  { text: "我还在电脑前打得火热，屏幕上大大的“VICTORY”还没褪去。", delay: 2000 },
  { text: "父母推门而入，一眼就看到了发光的屏幕。", delay: 3000 },
  { text: "“你还在玩游戏？作业写完了吗？”母亲的声音充满了失望。", delay: 4000 },
  { text: "电脑被强行关机，接下来是一整晚的冷战和无尽的责骂。", delay: 5000 },
  { text: "【结局：信任崩塌】你的游戏时光彻底终结。", delay: 6000 },
];

const INITIAL_FRAGMENTS: Fragment[] = [
  { id: 'start-1', text: '“砰！”防盗门被推开的声音清脆地响彻走廊。', isFixed: true },
  { id: 'start-2', text: '我还在电脑前打得火热，屏幕上大大的“VICTORY”还没褪去。', isFixed: false },
  { id: 'start-3', text: '父母的说话声在门外响起，“今天超市人真多啊。”', isFixed: false },
  { id: 'start-4', text: '我感到一阵寒意从脊梁骨升起，手心全是冷汗。', isFixed: false },
  { id: 'start-5', text: '迅速伸手去摸显示器的电源开关。', isFixed: false },
];

const INITIAL_ALTERNATIVES: string[] = [
  "我深吸一口气，瞬间点击屏幕右下角的桌面显示按钮。",
  "我假装在写英语卷子，嘴里还小声念叨着单词。",
  "我大声回应道：“妈，你们回来啦？我刚好在预习明天的课。”"
];

const INITIAL_SITUATION: Situation = {
  severity: 15,
  status_label: "风平浪静"
};

type GameState = 'intro' | 'playing' | 'ended';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [introIndex, setIntroIndex] = useState(-1);
  const [situation, setSituation] = useState<Situation>(INITIAL_SITUATION);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [currentFragments, setCurrentFragments] = useState<Fragment[]>(INITIAL_FRAGMENTS);
  const [alternatives, setAlternatives] = useState<Fragment[]>(
    INITIAL_ALTERNATIVES.map((t, i) => ({ id: `alt-initial-${i}`, text: t, isFixed: false, isNew: true }))
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<TurnOutcome['outcome'] | null>(null);
  const [feedback, setFeedback] = useState<string>("时间紧迫，父母已经到门口了。");
  const [hasAddedAlternative, setHasAddedAlternative] = useState(false);

  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === 'intro') {
      const timers = BAD_ENDING_DEMO.map((item, idx) => setTimeout(() => setIntroIndex(idx), item.delay));
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [gameState]);

  // Auto-scroll to feedback on new round
  useEffect(() => {
    if (gameState === 'playing' && history.length > 0) {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [history.length, gameState]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeInAltIndex = alternatives.findIndex(a => a.id === activeId);
    
    if (activeInAltIndex !== -1) {
      if (hasAddedAlternative) return;

      const altItem = alternatives[activeInAltIndex];
      const overIndex = currentFragments.findIndex(f => f.id === overId);
      const newFragments = [...currentFragments];
      const insertAt = overIndex >= 0 ? overIndex : newFragments.length;
      
      newFragments.splice(insertAt, 0, { ...altItem, isNew: true });
      setCurrentFragments(newFragments);
      setAlternatives(prev => prev.filter(a => a.id !== activeId));
      setHasAddedAlternative(true);
    } else {
      if (activeId !== overId) {
        setCurrentFragments((items) => {
          const oldIndex = items.findIndex((i) => i.id === activeId);
          const newIndex = items.findIndex((i) => i.id === overId);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || gameOutcome?.is_game_over || !hasAddedAlternative) return;
    
    const finalNarrative = currentFragments.map(f => f.text);
    const turnIndex = history.length + 1;
    
    setIsSubmitting(true);
    try {
      const historyTexts = history.flatMap(h => h.fragments.map(f => f.text));
      const result = await adjudicateTurn(historyTexts, finalNarrative, situation);

      setSituation(result.new_situation);

      if (result.outcome.is_game_over) {
        setGameOutcome(result.outcome);
        setGameState('ended');
      } else {
        const archivedFragments = [...currentFragments];
        setHistory(prev => [...prev, { 
          round: turnIndex, 
          fragments: archivedFragments, 
          outcome: result 
        }]);
        setFeedback(result.player_feedback_cn);
        
        // Use unique IDs with Turn Index to avoid overlaps
        setCurrentFragments(result.next_fragments_cn.map((t, idx) => ({
          id: `turn-${turnIndex}-base-${idx}`, 
          text: t, 
          isFixed: idx === 0
        })));
        
        setAlternatives(result.alternatives_cn.map((t, idx) => ({
          id: `turn-${turnIndex}-alt-${idx}`, 
          text: t, 
          isFixed: false, 
          isNew: true 
        })));

        setHasAddedAlternative(false);
      }
    } catch (e) {
      console.error(e);
      alert("因果律扰动过大，请刷新重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const restart = () => {
    setSituation(INITIAL_SITUATION);
    setHistory([]);
    setCurrentFragments(INITIAL_FRAGMENTS);
    setAlternatives(INITIAL_ALTERNATIVES.map((t, i) => ({ id: `alt-initial-${i}`, text: t, isFixed: false, isNew: true })));
    setGameOutcome(null);
    setHasAddedAlternative(false);
    setGameState('intro');
    setIntroIndex(-1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#020617] bg-gradient-to-b from-indigo-950/20 via-slate-950 to-purple-950/20 flex flex-col items-center pb-56">
      <header className="sticky top-0 z-50 w-full bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-black pt-5 pb-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300 tracking-[0.3em] uppercase serif">回家之前</h1>
          {gameState !== 'intro' && <StatusIndicator situation={situation} />}
        </div>
      </header>

      <main className="w-full max-w-2xl px-6 mt-10">
        {gameState === 'intro' && (
          <div className="flex flex-col items-center space-y-6 py-10">
            <h2 className="text-xl font-bold text-red-400/80 tracking-[0.2em] uppercase serif mb-6">默认结局：如果我们什么都不做...</h2>
            <div className="w-full space-y-4">
              {BAD_ENDING_DEMO.map((item, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border border-white/5 transition-all duration-1000 ${idx <= introIndex ? 'opacity-100 translate-y-0 bg-slate-900/40 text-slate-400' : 'opacity-0 translate-y-4'}`}>
                  <p className="serif italic leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
            {introIndex >= BAD_ENDING_DEMO.length - 1 && (
              <button 
                onClick={() => setGameState('playing')} 
                className="px-16 py-6 bg-white text-indigo-950 rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-bounce mt-10 transition-all hover:scale-105 active:scale-95"
              >
                重写这刻命运
              </button>
            )}
          </div>
        )}

        {gameState !== 'intro' && (
          <div className="space-y-12 mb-20 opacity-30 grayscale-[0.8] blur-[0.5px]">
            {history.map((item, hIdx) => (
              <div key={`history-${hIdx}`}>
                <div className="text-[10px] text-slate-500 font-bold tracking-[0.5em] mb-4 text-center uppercase">过去的回响 ROUND {item.round}</div>
                {item.fragments.map(f => <FragmentCard key={`hist-${f.id}`} fragment={f} isLocked={true} />)}
              </div>
            ))}
          </div>
        )}

        {gameState === 'playing' && !gameOutcome && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div ref={feedbackRef} className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
               <p className="text-white font-black serif text-2xl md:text-3xl leading-relaxed drop-shadow-2xl mb-4">{feedback}</p>
               <div className="inline-block px-4 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5">
                 <span className="text-indigo-300 text-[10px] font-bold tracking-[0.3em] uppercase">
                   {hasAddedAlternative ? '已选入命数 · 编排因果并提交' : '从下方拖入一段备选命数，介入这段现实'}
                 </span>
               </div>
            </div>

            <SortableContext items={currentFragments.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="min-h-[300px] pb-10 space-y-1">
                {currentFragments.map((f) => (
                  <FragmentCard key={f.id} fragment={f} isLocked={false} />
                ))}
              </div>
            </SortableContext>

            {/* Alternatives Pool (Floating Panel) */}
            <div className="fixed bottom-0 left-0 w-full px-6 pb-12 pt-16 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-40 pointer-events-none">
              <div className="max-w-2xl mx-auto pointer-events-auto">
                {!hasAddedAlternative && (
                  <div className="animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="h-px flex-grow bg-white/5"></div>
                      <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">备选分支</span>
                      <div className="h-px flex-grow bg-white/5"></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <SortableContext items={alternatives.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        {alternatives.map((a) => (
                          <FragmentCard key={a.id} fragment={a} isLocked={false} isAlternative={true} />
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 flex justify-center">
                   <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !hasAddedAlternative}
                    className={`
                      w-full py-5 rounded-3xl font-black text-xl tracking-[0.3em] text-white shadow-2xl transition-all duration-500
                      ${isSubmitting || !hasAddedAlternative
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5' 
                        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:scale-[1.02] active:scale-95 shadow-indigo-500/20'
                      }
                    `}
                   >
                     {isSubmitting ? '正在重塑现实...' : hasAddedAlternative ? '定格这段瞬间' : '请先选择一个分支'}
                   </button>
                </div>
              </div>
            </div>
          </DndContext>
        )}

        {gameState === 'ended' && gameOutcome && (
          <div className="mt-12 p-12 bg-slate-900/60 border border-white/10 rounded-[2.5rem] text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl animate-in zoom-in-95 duration-700">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-200 mb-10 serif tracking-tighter">
              {gameOutcome.ending_type === 'total_distrust' ? '信任崩塌' : '现实收束'}
            </h2>
            <div className="text-2xl text-indigo-100/90 leading-relaxed mb-16 serif italic font-light">“{gameOutcome.ending_text}”</div>
            
            <div className="w-full mb-16">
              <div className="flex justify-between items-end mb-4 px-2">
                <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">最终局势</span>
                <span className="text-xl font-black text-red-500 italic serif">{situation.status_label}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]" style={{ width: `${situation.severity}%` }} />
              </div>
            </div>

            <button onClick={restart} className="w-full py-6 bg-white text-indigo-950 font-black rounded-3xl text-xl hover:bg-slate-100 transition-all active:scale-95 shadow-2xl">
              回到梦境的起点
            </button>
          </div>
        )}
      </main>

      <footer className="fixed bottom-6 left-0 w-full py-1 text-center text-[10px] text-slate-700 font-bold uppercase tracking-[0.8em] pointer-events-none z-50">
        BEFORE GOING HOME · 叙事剪辑实验室
      </footer>
    </div>
  );
};

export default App;
