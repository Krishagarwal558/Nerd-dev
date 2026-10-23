import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Lightbulb,
  Cpu,
  Code,
  Play,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SlideContent } from '../types/tutor';
import { streamDoubt } from '../services/ollama';

interface DoubtSolverModalProps {
  topic: string;
  slide: SlideContent;
  isOpen: boolean;
  onClose: () => void;
}

export const DoubtSolverModal: React.FC<DoubtSolverModalProps> = ({
  topic,
  slide,
  isOpen,
  onClose,
}) => {
  const [doubtText, setDoubtText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [streamedThinking, setStreamedThinking] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  const [mode, setMode] = useState<'analogy' | 'deep_dive' | 'code' | 'general'>('general');
  const inputRef = useRef<HTMLInputElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setStreamedContent('');
      setStreamedThinking('');
    }
  }, [isOpen]);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamedContent, streamedThinking]);

  if (!isOpen) return null;

  const handleAsk = (overrideMode?: 'analogy' | 'deep_dive' | 'code' | 'general') => {
    const question = doubtText.trim();
    if (!question || isStreaming) return;

    const activeMode = overrideMode || mode;
    setIsStreaming(true);
    setStreamedContent('');
    setStreamedThinking('');

    streamDoubt(
      topic,
      slide,
      question,
      activeMode,
      (chunk, isThinking) => {
        if (isThinking) {
          setStreamedThinking((prev) => prev + chunk);
        } else {
          setStreamedContent((prev) => prev + chunk);
        }
      },
      () => {
        setIsStreaming(false);
      }
    );
  };

  const handlePreset = (presetQuestion: string, presetMode: 'analogy' | 'deep_dive' | 'code') => {
    setDoubtText(presetQuestion);
    setMode(presetMode);
    setTimeout(() => {
      // Trigger question immediately
      setIsStreaming(true);
      setStreamedContent('');
      setStreamedThinking('');

      streamDoubt(
        topic,
        slide,
        presetQuestion,
        presetMode,
        (chunk, isThinking) => {
          if (isThinking) {
            setStreamedThinking((prev) => prev + chunk);
          } else {
            setStreamedContent((prev) => prev + chunk);
          }
        },
        () => {
          setIsStreaming(false);
        }
      );
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111624] border border-indigo-900/60 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✋</span>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Mid-Lecture Doubt Solver</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  Slide {slide.slideNumber} Paused
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate max-w-[320px]">
                Context: {slide.title}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => handlePreset('Can you give a concrete real-world physical analogy for this mechanism?', 'analogy')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-800/60 hover:bg-indigo-900/50 text-indigo-300 transition-all"
          >
            <Lightbulb size={13} />
            <span>ELI5 Analogy</span>
          </button>

          <button
            onClick={() => handlePreset('Explain what is happening under the hood at the memory / byte level here.', 'deep_dive')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-800/60 hover:bg-cyan-900/50 text-cyan-300 transition-all"
          >
            <Cpu size={13} />
            <span>Under-the-Hood Proof</span>
          </button>

          <button
            onClick={() => handlePreset('What is an edge case where this exact code breaks down?', 'code')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/50 text-emerald-300 transition-all"
          >
            <Code size={13} />
            <span>Edge Case Breakdown</span>
          </button>
        </div>

        {/* Conversation Stream Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm leading-relaxed">
          {!streamedContent && !streamedThinking && !isStreaming && (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <Sparkles size={24} className="mx-auto text-indigo-400 opacity-60" />
              <p className="text-xs">
                Ask anything about the current slide or click a preset above. <br />
                Your local GPU responds directly with zero token limits.
              </p>
            </div>
          )}

          {/* GPU Chain-of-Thought (if present from reasoning model) */}
          {streamedThinking && (
            <div className="rounded-xl border border-indigo-950 bg-indigo-950/20 p-3 text-xs font-mono text-slate-400 space-y-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center justify-between w-full text-indigo-300 font-semibold"
              >
                <div className="flex items-center gap-1.5">
                  <BrainCircuit size={14} className="text-indigo-400" />
                  <span>Local GPU Reasoning Trace</span>
                </div>
                {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showThinking && (
                <div className="pl-4 border-l border-indigo-800/50 whitespace-pre-wrap max-h-40 overflow-y-auto text-[11px] text-slate-400 leading-normal">
                  {streamedThinking}
                </div>
              )}
            </div>
          )}

          {/* AI Instructor Response */}
          {streamedContent && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 text-xs md:text-sm whitespace-pre-wrap leading-relaxed animate-fade-in font-sans">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
                <span>AI Tutor Explanation:</span>
              </div>
              {streamedContent}
            </div>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono animate-pulse">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Generating response on RTX 3050...</span>
            </div>
          )}

          <div ref={responseEndRef} />
        </div>

        {/* Input Bar & Resume Button */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <input
              ref={inputRef}
              type="text"
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAsk();
              }}
              placeholder="Type your question or doubt..."
              disabled={isStreaming}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
            />
            <button
              onClick={() => handleAsk()}
              disabled={!doubtText.trim() || isStreaming}
              className="absolute right-2 top-2 bottom-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <Play size={13} className="text-emerald-400" />
            <span>Resume Lecture</span>
          </button>
        </div>
      </div>
    </div>
  );
};
