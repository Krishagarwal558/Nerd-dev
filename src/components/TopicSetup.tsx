import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { DifficultyLevel, TimeBudget } from '../types/tutor';

interface TopicSetupProps {
  onStartCourse: (topic: string, level: DifficultyLevel, minutes: TimeBudget) => void;
  isLoading: boolean;
  loadingStatus: string;
  ollamaOnline: boolean;
  ollamaModel: string;
}

const POPULAR_TOPICS = [
  { topic: 'Raft Consensus Algorithm', category: 'Distributed Systems', time: 20 as TimeBudget },
  { topic: 'Transformer Attention & QKV Math', category: 'Deep Learning', time: 35 as TimeBudget },
  { topic: 'Node.js Event Loop & Libuv Internals', category: 'Systems Programming', time: 20 as TimeBudget },
  { topic: 'Rust Ownership, Borrowing & Lifetimes', category: 'Language Design', time: 20 as TimeBudget },
  { topic: 'B-Tree Database Indexing & Disk I/O', category: 'Databases', time: 35 as TimeBudget },
  { topic: 'Zero-Knowledge Proofs & zk-SNARKs', category: 'Cryptography', time: 35 as TimeBudget },
];

export const TopicSetup: React.FC<TopicSetupProps> = ({
  onStartCourse,
  isLoading,
  loadingStatus,
  ollamaOnline,
  ollamaModel,
}) => {
  const [topic, setTopic] = useState('');
  const [timeMinutes, setTimeMinutes] = useState<TimeBudget>(20);
  const [level, setLevel] = useState<DifficultyLevel>('intermediate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onStartCourse(topic.trim(), level, timeMinutes);
  };

  const handleSelectQuickTopic = (t: string, time: TimeBudget) => {
    setTopic(t);
    setTimeMinutes(time);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-14">
      {/* Hero Badge & Heading */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-mono">
          <Sparkles size={13} className="text-cyan-400" />
          <span>True First-Principles Mastery • Zero Fluff Overviews</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Master Any Complex Topic <br />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Slide by Slide to Production Depth
          </span>
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Powered by your <strong className="text-slate-200">local RTX 3050 GPU ({ollamaModel})</strong>. 
          Generates a 6-layer visual masterclass, solves doubts mid-lecture, tests your mental models, and evaluates you on real-world debugging.
        </p>

        {/* Local Engine Banner */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${
              ollamaOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
          >
            <Cpu size={13} />
            <span>Local Engine: {ollamaModel}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 pl-1 border-l border-slate-700">
              0 Token Cost • 100% Private
            </span>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-[#111624] border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Topic Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Topic or Architecture you want to master
            </label>
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Raft Consensus Algorithm, Linux Epoll, Transformers Self-Attention..."
                disabled={isLoading}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!topic.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Architecting...</span>
                  </>
                ) : (
                  <>
                    <span>Start Masterclass</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Time Budget & Difficulty Level Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Time Budget */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 tracking-wider uppercase">
                <Clock size={13} className="text-amber-400" />
                <span>Session Time Budget</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([10, 20, 35, 50] as TimeBudget[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimeMinutes(m)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-mono font-medium border transition-all ${
                      timeMinutes === m
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div>{m}m</div>
                    <div className="text-[10px] text-slate-500">
                      {m === 10 ? 'Sprint' : m === 20 ? 'Standard' : m === 35 ? 'Deep' : 'Exhaustive'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Level */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 tracking-wider uppercase">
                <Layers size={13} className="text-cyan-400" />
                <span>Instruction Depth</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'senior'] as DifficultyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-2.5 px-2 text-center rounded-lg text-xs font-medium capitalize border transition-all ${
                      level === lvl
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {lvl === 'senior' ? 'Senior / Arch' : lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Loading Progress State */}
        {isLoading && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                {loadingStatus}
              </span>
              <span className="text-slate-500">Local RTX 3050 @ ~43 t/s</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Popular Masterclasses Quick-Pick */}
      <div className="mt-10 space-y-3">
        <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <Zap size={13} className="text-amber-400" />
          <span>Or Choose a Handpicked Deep Masterclass</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {POPULAR_TOPICS.map((item) => (
            <div
              key={item.topic}
              onClick={() => handleSelectQuickTopic(item.topic, item.time)}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-600/60 hover:bg-slate-900 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                <span>{item.category}</span>
                <span className="text-indigo-400 group-hover:text-indigo-300">{item.time} mins</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {item.topic}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
