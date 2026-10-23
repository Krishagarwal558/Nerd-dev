import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SlideContent, LabGradingResult } from '../types/tutor';
import { gradeSynthesisSolution } from '../services/ollama';
import { CodeBlock } from './CodeBlock';

interface SynthesisLabProps {
  topic: string;
  slide: SlideContent;
  onOpenReport: (result: LabGradingResult) => void;
  onReset: () => void;
}

export const SynthesisLab: React.FC<SynthesisLabProps> = ({
  topic,
  slide,
  onOpenReport,
  onReset,
}) => {
  const [solution, setSolution] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<LabGradingResult | null>(null);
  const [showHints, setShowHints] = useState(false);

  const handleSubmitSolution = async () => {
    if (!solution.trim() || isGrading) return;
    setIsGrading(true);

    try {
      const result = await gradeSynthesisSolution(topic, slide, solution);
      setGradingResult(result);

      if (result.passed) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="bg-[#111624] border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-purple-950/70 border border-purple-800/60 text-purple-300">
              Layer 6: Capstone Synthesis Lab
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              Final Mastery Evaluation
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
            {slide.title}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Diagnose the broken scenario to prove thorough understanding.
          </p>
        </div>
      </div>

      {/* Scenario & Bug Description */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: The Challenge */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
              <AlertTriangle size={14} />
              <span>The Production Outage Scenario</span>
            </div>
            <div className="text-xs md:text-sm text-slate-300 leading-relaxed space-y-2">
              <p>{slide.contentMarkdown}</p>
            </div>
          </div>

          {/* Broken code viewer */}
          {slide.codeSnippet && (
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-slate-400 uppercase font-semibold">
                Broken Implementation:
              </span>
              <CodeBlock
                code={slide.codeSnippet.code}
                language={slide.codeSnippet.language}
                filename={slide.codeSnippet.filename}
              />
            </div>
          )}

          {/* Hint accordion */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs">
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Lightbulb size={13} />
              <span>{showHints ? 'Hide Architectural Hints' : 'Need a Clue? Show Hints'}</span>
            </button>
            {showHints && (
              <ul className="mt-2 pl-4 list-disc space-y-1 text-slate-300 text-xs animate-fade-in">
                <li>Look for unbounded growth in background event listeners or queues.</li>
                <li>Ensure resources are explicitly released in finally blocks or teardown lifecycles.</li>
                <li>Check for state mutation without appropriate locks or monotonic sequence IDs.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Right: The Solution Editor & Grading Rubric */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold uppercase">Your Solution & Patch:</span>
              <span className="text-slate-500">Code or Architectural Explanation</span>
            </div>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="// Write your fix or explain your architectural diagnosis here...&#10;// e.g., Replace uncollected event listeners with WeakRef or AbortController..."
              disabled={isGrading}
              rows={12}
              className="w-full p-4 rounded-xl bg-[#0B0F19] border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y shadow-inner"
            />
          </div>

          <button
            onClick={handleSubmitSolution}
            disabled={!solution.trim() || isGrading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            {isGrading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating on Local GPU (RTX 3050)...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Submit Solution for AI Rubric Grading</span>
              </>
            )}
          </button>

          {/* Live Grading Card */}
          {gradingResult && (
            <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {gradingResult.passed ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <XCircle size={18} className="text-amber-400" />
                  )}
                  <span className="font-bold text-sm text-white">
                    {gradingResult.passed ? 'Mastery Verified!' : 'Needs Refinement'}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-base font-extrabold text-indigo-400">
                  <span>Score:</span>
                  <span>{gradingResult.score} / 100</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {gradingResult.verdict}
              </p>

              {/* Edge Cases Checked */}
              {gradingResult.edgeCasesAnalyzed && gradingResult.edgeCasesAnalyzed.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
                    Edge Cases Evaluated:
                  </span>
                  <div className="space-y-1">
                    {gradingResult.edgeCasesAnalyzed.map((ec, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{ec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onOpenReport(gradingResult)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
                >
                  <FileText size={14} />
                  <span>View Mastery Certificate & Download Cheat-Sheet</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
