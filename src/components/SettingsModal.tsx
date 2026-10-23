import React, { useState, useEffect } from 'react';
import { X, Check, Cpu, Sparkles, Volume2, Key, RefreshCw } from 'lucide-react';
import { LLMSettings } from '../types/tutor';
import { getSettings, saveSettings, checkOllamaStatus } from '../services/ollama';
import { speechService } from '../services/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: LLMSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<LLMSettings>(getSettings());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      setAvailableVoices(speechService.getVoices());
      handleTestOllama();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    setOllamaTestResult(null);
    try {
      const res = await checkOllamaStatus(settings.ollamaBaseUrl);
      if (res.online) {
        setAvailableModels(res.models);
        setOllamaTestResult(`Connected! Found ${res.models.length} local models.`);
      } else {
        setOllamaTestResult('Could not connect to Ollama. Make sure "ollama serve" is running.');
      }
    } catch {
      setOllamaTestResult('Connection failed.');
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    onSettingsSaved(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111624] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-indigo-400" />
            <span className="font-bold text-white text-sm">Settings & AI Intelligence Engine</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 uppercase tracking-wider block">
              AI Intelligence Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: 'ollama' })}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  settings.provider === 'ollama'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Cpu size={14} className="text-emerald-400" />
                    <span>Local GPU (RTX 3050)</span>
                  </span>
                  {settings.provider === 'ollama' && <Check size={14} className="text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  100% Free • Unlimited Tokens • Private
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: 'gemini' })}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  settings.provider === 'gemini'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>Google Gemini Free</span>
                  </span>
                  {settings.provider === 'gemini' && <Check size={14} className="text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cloud Fallback • 1M Context
                </div>
              </button>
            </div>
          </div>

          {/* Local Ollama Settings */}
          {settings.provider === 'ollama' && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-400">Ollama Model</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.ollamaModel}
                    onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                    placeholder="qwen-local"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                  <button
                    onClick={handleTestOllama}
                    disabled={isTestingOllama}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                    title="Refresh connection"
                  >
                    <RefreshCw size={13} className={isTestingOllama ? 'animate-spin' : ''} />
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {availableModels.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Available models on disk:</span>
                  <div className="flex flex-wrap gap-1">
                    {availableModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSettings({ ...settings, ollamaModel: m })}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          settings.ollamaModel === m
                            ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ollamaTestResult && (
                <div className="text-[11px] text-emerald-400 font-mono">
                  {ollamaTestResult}
                </div>
              )}
            </div>
          )}

          {/* Gemini Cloud Settings */}
          {settings.provider === 'gemini' && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-400 flex items-center gap-1">
                  <Key size={13} />
                  <span>Google AI Studio API Key (Free)</span>
                </label>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline block pt-1"
                >
                  Get free API key at Google AI Studio &rarr;
                </a>
              </div>
            </div>
          )}

          {/* Audio & Narration Preferences */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider">
              <Volume2 size={14} className="text-indigo-400" />
              <span>Voice Narration Preferences</span>
            </div>

            {/* Speech rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Narration Speed</span>
                <span className="font-mono text-indigo-300">{settings.speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => setSettings({ ...settings, speechRate: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Auto play toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Auto-play audio when slide changes</span>
              <input
                type="checkbox"
                checked={settings.autoPlaySpeech}
                onChange={(e) => setSettings({ ...settings, autoPlaySpeech: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
