import React, { useState } from 'react';
import {
  X,
  Award,
  Copy,
  Check,
  RotateCcw,
  Download,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { CourseManifest, LabGradingResult } from '../types/tutor';

interface MasteryReportModalProps {
  course: CourseManifest;
  gradingResult: LabGradingResult;
  isOpen: boolean;
  onClose: () => void;
  onStartNewTopic: () => void;
}

export const MasteryReportModal: React.FC<MasteryReportModalProps> = ({
  course,
  gradingResult,
  isOpen,
  onClose,
  onStartNewTopic,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCheatSheet = () => {
    navigator.clipboard.writeText(gradingResult.modelCheatSheetMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([gradingResult.modelCheatSheetMarkdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${course.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-mastery-cheatsheet.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111624] border border-indigo-900/80 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Award size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Topic Mastery Certificate</div>
              <div className="text-xs text-slate-400">{course.topic}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Certificate Card */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border border-indigo-800/40 text-center space-y-3 relative overflow-hidden shadow-inner">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono">
              <Sparkles size={12} />
              <span>Full First-Principles Mastery Verified</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white">
              {course.topic}
            </h3>

            <div className="flex items-center justify-center gap-6 pt-2 font-mono text-xs">
              <div>
                <div className="text-slate-400">Mastery Score</div>
                <div className="text-xl font-bold text-emerald-400">
                  {gradingResult.score} / 100
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-slate-400">Pacing Time</div>
                <div className="text-xl font-bold text-indigo-400">
                  {course.totalMinutes} mins
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <div className="text-slate-400">Audience Depth</div>
                <div className="text-xl font-bold text-cyan-400 capitalize">
                  {course.targetAudience}
                </div>
              </div>
            </div>
          </div>

          {/* Cheat Sheet Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-400" />
                <span>Generated 1-Page Mastery Cheat-Sheet</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCheatSheet}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Download size={12} />
                  <span>Download .md</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {gradingResult.modelCheatSheetMarkdown}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Review Slides
          </button>
          <button
            onClick={onStartNewTopic}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide shadow-md shadow-indigo-600/20 transition-all"
          >
            <RotateCcw size={14} />
            <span>Master Another Topic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
