import React from 'react';
import { CheckCircle2, Circle, Clock, Layers } from 'lucide-react';
import { CourseManifest } from '../types/tutor';

interface RoadmapViewProps {
  course: CourseManifest;
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  course,
  currentSlideIndex,
  onSelectSlide,
}) => {
  return (
    <div className="bg-[#111624] border border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-indigo-300 font-semibold uppercase tracking-wider">
          <Layers size={14} className="text-indigo-400" />
          <span>Masterclass Roadmap (6 Layers)</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <Clock size={12} className="text-amber-400" />
          <span>{course.totalMinutes}m allocated</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {course.slides.map((slide, idx) => {
          const isCompleted = idx < currentSlideIndex;
          const isActive = idx === currentSlideIndex;

          return (
            <button
              key={slide.id || idx}
              onClick={() => onSelectSlide(idx)}
              className={`p-3 text-left rounded-xl border transition-all text-xs flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500/50'
                  : isCompleted
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-slate-900/30 border-slate-800/60 text-slate-500 hover:border-slate-700 hover:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-slate-400">
                  L{idx + 1} • {slide.estimatedMinutes}m
                </span>
                {isCompleted ? (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                ) : isActive ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                ) : (
                  <Circle size={12} className="text-slate-600" />
                )}
              </div>

              <div>
                <div
                  className={`font-semibold line-clamp-1 ${
                    isActive ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-400'
                  }`}
                  title={slide.title}
                >
                  {slide.title}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {slide.layerTitle.split(':')[1]?.trim() || slide.layer}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
