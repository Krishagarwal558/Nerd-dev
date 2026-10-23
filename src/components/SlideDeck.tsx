import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  ShieldAlert,
  ArrowRight,
  Code,
  Network,
} from 'lucide-react';
import { SlideContent } from '../types/tutor';
import { MermaidViewer } from './MermaidViewer';
import { CodeBlock } from './CodeBlock';

interface SlideDeckProps {
  slide: SlideContent;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenDoubt: () => void;
}

export const SlideDeck: React.FC<SlideDeckProps> = ({
  slide,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onOpenDoubt,
}) => {
  const [showNarration, setShowNarration] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Layer color badge mapping
  const layerBadges: Record<string, { label: string; color: string; border: string }> = {
    origin: { label: 'Layer 1: Origin & First Principles', color: 'bg-indigo-950/70 text-indigo-300', border: 'border-indigo-800/60' },
    mechanics: { label: 'Layer 2: Internal Mechanics & Data Flow', color: 'bg-cyan-950/70 text-cyan-300', border: 'border-cyan-800/60' },
    implementation: { label: 'Layer 3: Production Code Architecture', color: 'bg-emerald-950/70 text-emerald-300', border: 'border-emerald-800/60' },
    edge_cases: { label: 'Layer 4: Failure Modes & Senior Gotchas', color: 'bg-rose-950/70 text-rose-300', border: 'border-rose-800/60' },
    tradeoffs: { label: 'Layer 5: Comparative Trade-Off Matrix', color: 'bg-amber-950/70 text-amber-300', border: 'border-amber-800/60' },
    synthesis: { label: 'Layer 6: Reverse-Debugging Lab', color: 'bg-purple-950/70 text-purple-300', border: 'border-purple-800/60' },
  };

  const currentBadge = layerBadges[slide.layer] || layerBadges.origin;

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    setHasAnswered(true);
  };

  return (
    <div className="bg-[#111624] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[640px]">
      {/* Slide Top Banner */}
      <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium border ${currentBadge.color} ${currentBadge.border}`}
          >
            {currentBadge.label}
          </span>
          <span className="text-xs font-mono text-slate-400">
            ~{slide.estimatedMinutes} mins pace
          </span>
        </div>

        {/* View Monologue toggle */}
        <button
          onClick={() => setShowNarration(!showNarration)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <MessageSquareQuote size={14} className="text-indigo-400" />
          <span>{showNarration ? 'Hide Instructor Monologue' : 'View Instructor Monologue'}</span>
        </button>
      </div>

      {/* Spoken Narration Drawer (if toggled) */}
      {showNarration && (
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-900/40 text-xs text-indigo-200 font-sans leading-relaxed animate-fade-in flex items-start gap-2.5">
          <MessageSquareQuote size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-indigo-300">Instructor Monologue (Spoken by AI): </span>
            {slide.narrationScript}
          </div>
        </div>
      )}

      {/* Slide Content Body */}
      <div className="p-6 md:p-8 flex-1 space-y-6 overflow-y-auto">
        {/* Title Header */}
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {slide.title}
          </h2>
          <p className="text-sm md:text-base text-slate-400 font-medium">
            {slide.subtitle}
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Markdown & Key Takeaways (7 cols if visuals exist, else 12) */}
          <div className={`${slide.diagramMermaid || slide.codeSnippet ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-6`}>
            {/* Markdown notes */}
            <div className="text-slate-300 text-sm leading-relaxed space-y-3 prose prose-invert prose-indigo max-w-none">
              {slide.contentMarkdown.split('\n\n').map((paragraph, idx) => {
                // Render headers
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="text-base font-bold text-slate-100 tracking-wide mt-4 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" />
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                // Bullet points
                if (paragraph.startsWith('* ') || paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').map((l) => l.replace(/^[*-]\s+/, ''));
                  return (
                    <ul key={idx} className="space-y-1.5 pl-4 list-disc list-outside text-slate-300">
                      {items.map((item, i) => (
                        <li key={i} className="pl-1 leading-normal">
                          {item}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={idx}>{paragraph}</p>;
              })}
            </div>

            {/* Key Takeaways */}
            {slide.keyTakeaways && slide.keyTakeaways.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                  <Lightbulb size={14} className="text-cyan-400" />
                  <span>Key Mental Models & Takeaways</span>
                </div>
                <div className="space-y-1.5">
                  {slide.keyTakeaways.map((takeaway, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Senior Gotcha Box */}
            {slide.seniorGotcha && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/60 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400 uppercase tracking-wide">
                  <ShieldAlert size={14} />
                  <span>Senior Practitioner Gotcha (Failure Mode)</span>
                </div>
                <p className="leading-relaxed text-slate-300 pl-5">{slide.seniorGotcha}</p>
              </div>
            )}
          </div>

          {/* Right Column: Visuals (Mermaid Architecture Diagram + Code Snippet) */}
          {(slide.diagramMermaid || slide.codeSnippet) && (
            <div className="lg:col-span-6 space-y-4">
              {/* Architecture Diagram */}
              {slide.diagramMermaid && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase font-mono">
                    <Network size={13} className="text-indigo-400" />
                    <span>State & Architecture Schematic</span>
                  </div>
                  <MermaidViewer chart={slide.diagramMermaid} />
                </div>
              )}

              {/* Code Snippet */}
              {slide.codeSnippet && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase font-mono">
                    <Code size={13} className="text-emerald-400" />
                    <span>Production Implementation Dissection</span>
                  </div>
                  <CodeBlock
                    code={slide.codeSnippet.code}
                    language={slide.codeSnippet.language}
                    filename={slide.codeSnippet.filename}
                    highlightLines={slide.codeSnippet.highlightLines}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Socratic Active Recall Checkpoint (if configured for this slide) */}
        {slide.socraticCheckpoint && (
          <div className="mt-8 p-5 rounded-xl bg-indigo-950/20 border border-indigo-900/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <HelpCircle size={15} className="text-indigo-400" />
              <span>Socratic Prediction Gate: Check Your Mental Model</span>
            </div>
            <p className="text-sm font-semibold text-white">
              {slide.socraticCheckpoint.question}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {slide.socraticCheckpoint.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === slide.socraticCheckpoint!.correctIndex;
                let btnStyle = 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700';

                if (hasAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-semibold';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-200';
                  } else {
                    btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={hasAnswered}
                    className={`p-3 text-left rounded-lg text-xs border transition-all ${btnStyle}`}
                  >
                    <span className="font-mono font-bold mr-2 text-indigo-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed animate-fade-in ${
                  selectedOption === slide.socraticCheckpoint.correctIndex
                    ? 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-200'
                    : 'bg-amber-950/40 border border-amber-900/60 text-amber-200'
                }`}
              >
                <span className="font-bold">
                  {selectedOption === slide.socraticCheckpoint.correctIndex
                    ? '✓ Correct Mental Model! '
                    : 'Notice: '}
                </span>
                {slide.socraticCheckpoint.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between gap-4">
        {/* Previous Button */}
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous Slide</span>
        </button>

        {/* Center: RAISE HAND / ASK DOUBT (Prominent CTA) */}
        <button
          onClick={onOpenDoubt}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all group"
          title="Pause lecture and ask your local AI tutor anything (Hotkey: Space)"
        >
          <span className="text-base group-hover:rotate-12 transition-transform">✋</span>
          <span>Raise Hand • Ask Doubt</span>
          <span className="hidden md:inline px-1.5 py-0.5 rounded text-[10px] bg-black/30 font-mono text-cyan-200">
            Space
          </span>
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
        >
          <span>{isLast ? 'Complete & Start Lab' : 'Next Slide'}</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
