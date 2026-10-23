export type DifficultyLevel = 'beginner' | 'intermediate' | 'senior';

export type TimeBudget = 10 | 20 | 35 | 50; // in minutes

export interface SlideContent {
  id: string;
  slideNumber: number;
  totalSlides: number;
  title: string;
  subtitle: string;
  layer: 'origin' | 'mechanics' | 'implementation' | 'edge_cases' | 'tradeoffs' | 'synthesis';
  layerTitle: string;
  estimatedMinutes: number;
  narrationScript: string; // Text spoken by the audio tutor
  contentMarkdown: string; // Deep technical lecture notes
  diagramMermaid?: string; // Optional Mermaid flowchart/architecture/sequence
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
    highlightLines?: number[];
  };
  keyTakeaways: string[];
  seniorGotcha?: string; // Edge case that breaks systems
  socraticCheckpoint?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface CourseManifest {
  topic: string;
  targetAudience: DifficultyLevel;
  totalMinutes: number;
  overview: string;
  firstPrinciplesBottleneck: string; // The fundamental reason this concept was invented
  modules: {
    title: string;
    layer: SlideContent['layer'];
    timeAllocationMinutes: number;
    description: string;
  }[];
  slides: SlideContent[];
}

export interface DoubtMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: 'analogy' | 'deep_dive' | 'code' | 'general';
}

export interface SynthesisLabChallenge {
  title: string;
  scenario: string;
  brokenCodeOrSystem: string;
  bugDescription: string;
  hints: string[];
  expectedFixOutline: string;
}

export interface LabGradingResult {
  score: number; // 0 - 100
  passed: boolean;
  verdict: string;
  edgeCasesAnalyzed: string[];
  suggestions: string[];
  modelCheatSheetMarkdown: string;
}

export interface LLMSettings {
  provider: 'ollama' | 'gemini';
  ollamaBaseUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
  speechRate: number; // 0.8 - 1.5
  speechVoice: string;
  autoPlaySpeech: boolean;
}
