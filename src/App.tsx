import React, { useState, useEffect, useRef } from 'react';
import { CourseManifest, DifficultyLevel, TimeBudget, LabGradingResult, LLMSettings } from './types/tutor';
import { generateCourse, checkOllamaStatus, getSettings } from './services/ollama';
import { speechService } from './services/speech';
import { Header } from './components/Header';
import { TopicSetup } from './components/TopicSetup';
import { RoadmapView } from './components/RoadmapView';
import { SlideDeck } from './components/SlideDeck';
import { DoubtSolverModal } from './components/DoubtSolverModal';
import { SynthesisLab } from './components/SynthesisLab';
import { MasteryReportModal } from './components/MasteryReportModal';
import { SettingsModal } from './components/SettingsModal';

export function App() {
  const [course, setCourse] = useState<CourseManifest | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Pacing Timer
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Modals
  const [isDoubtOpen, setIsDoubtOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [masteryReport, setMasteryReport] = useState<LabGradingResult | null>(null);

  // Engine Status
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [settings, setSettings] = useState<LLMSettings>(getSettings());

  // Check Ollama health on startup
  useEffect(() => {
    checkOllamaStatus(settings.ollamaBaseUrl).then((res) => {
      setOllamaOnline(res.online);
    });
  }, [settings.ollamaBaseUrl]);

  // Session Pacing Countdown Timer
  useEffect(() => {
    if (!course || isTimerPaused || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [course, isTimerPaused, remainingSeconds]);

  // Trigger speech when slide changes (if auto-play enabled)
  useEffect(() => {
    if (!course) {
      speechService.cancel();
      setIsSpeaking(false);
      return;
    }

    const currentSlide = course.slides[currentSlideIndex];
    if (currentSlide && settings.autoPlaySpeech && !isDoubtOpen) {
      playSlideNarration(currentSlide.narrationScript);
    } else {
      speechService.cancel();
      setIsSpeaking(false);
    }
  }, [currentSlideIndex, course]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (course) {
          handleToggleDoubt();
        }
      } else if (e.code === 'ArrowRight') {
        if (course && currentSlideIndex < course.slides.length - 1 && !isDoubtOpen) {
          handleNextSlide();
        }
      } else if (e.code === 'ArrowLeft') {
        if (course && currentSlideIndex > 0 && !isDoubtOpen) {
          handlePrevSlide();
        }
      } else if (e.code === 'Escape') {
        if (isDoubtOpen) handleCloseDoubt();
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (masteryReport) setMasteryReport(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [course, currentSlideIndex, isDoubtOpen, isSettingsOpen, masteryReport]);

  const playSlideNarration = (script: string) => {
    speechService.speak(script, {
      rate: speechRate,
      voiceName: settings.speechVoice,
      onEnd: () => {
        setIsSpeaking(false);
        setIsAudioPaused(false);
      },
    });
    setIsSpeaking(true);
    setIsAudioPaused(false);
  };

  const handleToggleSpeech = () => {
    if (!course) return;
    const currentSlide = course.slides[currentSlideIndex];
    if (isSpeaking && !isAudioPaused) {
      speechService.pause();
      setIsAudioPaused(true);
    } else if (isAudioPaused) {
      speechService.resume();
      setIsAudioPaused(false);
    } else {
      playSlideNarration(currentSlide.narrationScript);
    }
  };

  const handleCycleSpeechRate = () => {
    const nextRate = speechRate === 1.0 ? 1.25 : speechRate === 1.25 ? 1.5 : 1.0;
    setSpeechRate(nextRate);
    if (course && isSpeaking) {
      // Restart with new rate
      playSlideNarration(course.slides[currentSlideIndex].narrationScript);
    }
  };

  const handleStartCourse = async (
    topic: string,
    level: DifficultyLevel,
    timeMinutes: TimeBudget
  ) => {
    setIsLoading(true);
    setLoadingStatus('Connecting to local GPU tutor...');

    try {
      const manifest = await generateCourse(topic, level, timeMinutes, (status) => {
        setLoadingStatus(status);
      });
      setCourse(manifest);
      setCurrentSlideIndex(0);
      setRemainingSeconds(timeMinutes * 60);
      setIsTimerPaused(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDoubt = () => {
    if (isDoubtOpen) {
      handleCloseDoubt();
    } else {
      // Pause audio and timer when doubt modal is raised
      speechService.pause();
      setIsAudioPaused(true);
      setIsTimerPaused(true);
      setIsDoubtOpen(true);
    }
  };

  const handleCloseDoubt = () => {
    setIsDoubtOpen(false);
    setIsTimerPaused(false);
    // Optionally resume speech
    if (isAudioPaused) {
      speechService.resume();
      setIsAudioPaused(false);
    }
  };

  const handleNextSlide = () => {
    if (!course) return;
    if (currentSlideIndex < course.slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleResetSession = () => {
    speechService.cancel();
    setCourse(null);
    setCurrentSlideIndex(0);
    setMasteryReport(null);
  };

  const isSynthesisLab = course && currentSlideIndex === course.slides.length - 1;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Header
        course={course}
        currentSlideIndex={currentSlideIndex}
        totalSlides={course?.slides.length || 0}
        remainingSeconds={remainingSeconds}
        isSpeaking={isSpeaking}
        isPaused={isAudioPaused}
        speechRate={speechRate}
        ollamaOnline={ollamaOnline}
        ollamaModel={settings.ollamaModel}
        onToggleSpeech={handleToggleSpeech}
        onCycleRate={handleCycleSpeechRate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={handleResetSession}
      />

      {/* Main Content View */}
      <main className="flex-1 px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
        {!course ? (
          /* Step 1: Topic & Pacing Setup */
          <TopicSetup
            onStartCourse={handleStartCourse}
            isLoading={isLoading}
            loadingStatus={loadingStatus}
            ollamaOnline={ollamaOnline}
            ollamaModel={settings.ollamaModel}
          />
        ) : (
          /* Step 2: Active Masterclass Presentation */
          <div className="space-y-6">
            {/* 6-Layer Course Roadmap */}
            <RoadmapView
              course={course}
              currentSlideIndex={currentSlideIndex}
              onSelectSlide={(idx) => setCurrentSlideIndex(idx)}
            />

            {/* Slide View or Synthesis Lab */}
            {isSynthesisLab ? (
              <SynthesisLab
                topic={course.topic}
                slide={course.slides[currentSlideIndex]}
                onOpenReport={(res) => setMasteryReport(res)}
                onReset={handleResetSession}
              />
            ) : (
              <SlideDeck
                slide={course.slides[currentSlideIndex]}
                isFirst={currentSlideIndex === 0}
                isLast={currentSlideIndex === course.slides.length - 1}
                onPrev={handlePrevSlide}
                onNext={handleNextSlide}
                onOpenDoubt={handleToggleDoubt}
              />
            )}
          </div>
        )}
      </main>

      {/* Mid-Lecture Doubt Solver Modal */}
      {course && (
        <DoubtSolverModal
          topic={course.topic}
          slide={course.slides[currentSlideIndex]}
          isOpen={isDoubtOpen}
          onClose={handleCloseDoubt}
        />
      )}

      {/* Topic Mastery Certificate & Cheat-Sheet */}
      {course && masteryReport && (
        <MasteryReportModal
          course={course}
          gradingResult={masteryReport}
          isOpen={!!masteryReport}
          onClose={() => setMasteryReport(null)}
          onStartNewTopic={handleResetSession}
        />
      )}

      {/* Configuration & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(newSettings) => {
          setSettings(newSettings);
          checkOllamaStatus(newSettings.ollamaBaseUrl).then((r) => setOllamaOnline(r.online));
        }}
      />
    </div>
  );
}
