import React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Settings as SettingsIcon,
  Cpu,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CourseManifest } from '../types/tutor';

interface HeaderProps {
  course: CourseManifest | null;
  currentSlideIndex: number;
  totalSlides: number;
  remainingSeconds: number;
  isSpeaking: boolean;
  isPaused: boolean;
  speechRate: number;
  ollamaOnline: boolean;
  ollamaModel: string;
  onToggleSpeech: () => void;
  onCycleRate: () => void;
  onOpenSettings: () => void;
  onResetSession: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  course,
  currentSlideIndex,
  totalSlides,
  remainingSeconds,
  isSpeaking,
  isPaused,
  speechRate,
  ollamaOnline,
  ollamaModel,
  onToggleSpeech,
  onCycleRate,
  onOpenSettings,
  onResetSession,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0E131F]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-sm">
      {/* Left: Brand & Topic */}
      <div className="flex items-center gap-3">
        <div
          onClick={onResetSession}
          className="flex items-center gap-2 cursor-pointer group select-none"
          title="Return to Topic Selection"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-400 bg-clip-text text-transparent text-sm leading-none">
              PEAK TUTOR
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">FIRST-PRINCIPLES AI</div>
          </div>
        </div>

        {course && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
            <span className="font-semibold text-slate-200 truncate max-w-[220px]" title={course.topic}>
              {course.topic}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
              Slide {currentSlideIndex + 1} / {totalSlides}
            </span>
          </div>
        )}
      </div>

      {/* Center: Session Countdown */}
      {course && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300">
          <Clock size={13} className="text-amber-400" />
          <span>{formatTime(remainingSeconds)}</span>
          <span className="text-[10px] text-slate-500 uppercase">remaining</span>
        </div>
      )}

      {/* Right: Audio Narration, GPU Badge, Settings */}
      <div className="flex items-center gap-2">
        {/* Audio Narration Controller */}
        {course && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={onToggleSpeech}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isSpeaking && !isPaused
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title={isSpeaking && !isPaused ? 'Pause Instructor Audio' : 'Play Instructor Audio'}
            >
              {isSpeaking && !isPaused ? (
                <>
                  <Pause size={13} />
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 h-3 bg-white animate-bounce" />
                    <span className="w-0.5 h-2 bg-white animate-bounce delay-75" />
                    <span className="w-0.5 h-3 bg-white animate-bounce delay-150" />
                  </span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span className="hidden sm:inline text-[11px]">Narration</span>
                </>
              )}
            </button>

            <button
              onClick={onCycleRate}
              className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Change Voice Speed"
            >
              {speechRate}x
            </button>
          </div>
        )}

        {/* Local GPU / Ollama Status Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono"
          title={ollamaOnline ? `Connected to local model: ${ollamaModel}` : 'Ollama not detected'}
        >
          <Cpu size={13} className={ollamaOnline ? 'text-emerald-400' : 'text-rose-400'} />
          <span className="text-[11px] text-slate-300">RTX 3050</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              ollamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>

        {/* Settings modal button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Configure LLM & Preferences"
        >
          <SettingsIcon size={16} />
        </button>

        {course && (
          <button
            onClick={onResetSession}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
            title="End Session & Start New Topic"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
