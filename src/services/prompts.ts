import { DifficultyLevel, TimeBudget, SlideContent } from '../types/tutor';

export const buildCourseManifestPrompt = (
  topic: string,
  level: DifficultyLevel,
  timeMinutes: TimeBudget
): string => {
  return `You are a world-class Professor and Principal Systems Architect creating an exhaustive, deep masterclass on "${topic}".
Target audience level: ${level.toUpperCase()}.
Total time budget: ${timeMinutes} minutes.

CRITICAL INSTRUCTION - NO SUPERFICIAL OVERVIEWS:
A typical AI summary lists shallow definitions. You must NOT do that.
Deliver true first-principles mastery across exactly 6 progressive layers:
Layer 1 (origin): Why did this have to be invented? What broke before it? The fundamental bottleneck.
Layer 2 (mechanics): Under-the-hood data structures, memory layout, state machines, packet flow, or math formulations.
Layer 3 (implementation): Production-grade, non-trivial code implementation with line-by-line mechanical walkthrough.
Layer 4 (edge_cases): The 3-4 subtle failure modes, race conditions, memory leaks, or gotchas that trip up senior practitioners.
Layer 5 (tradeoffs): Deep comparative matrix (When to use, when NOT to use, performance benchmarks vs alternatives).
Layer 6 (synthesis): Real-world debugging challenge ("Break It" scenario) where the user must diagnose or architect a solution.

You must return ONLY a valid JSON object matching this exact schema:
{
  "topic": "${topic}",
  "targetAudience": "${level}",
  "totalMinutes": ${timeMinutes},
  "overview": "Rigorous 2-sentence summary of what will be mastered.",
  "firstPrinciplesBottleneck": "The fundamental problem that necessitated this solution.",
  "modules": [
    {
      "title": "Module Title",
      "layer": "origin" | "mechanics" | "implementation" | "edge_cases" | "tradeoffs" | "synthesis",
      "timeAllocationMinutes": number,
      "description": "Short description"
    }
  ],
  "slides": [
    {
      "id": "slide-1",
      "slideNumber": 1,
      "totalSlides": 6,
      "title": "Clear Technical Title",
      "subtitle": "Insightful Subtitle",
      "layer": "origin",
      "layerTitle": "Layer 1: Problem Origin & First Principles",
      "estimatedMinutes": 3,
      "narrationScript": "Spoken monologue for the tutor. Natural, energetic, professor-level spoken delivery (approx 60-90 words).",
      "contentMarkdown": "Deep technical breakdown in GitHub Markdown. Use bullet points, bold key terms, and explain the mechanical trade-offs.",
      "diagramMermaid": "flowchart TD\\n  A[Prior Flawed Paradigm] -->|Bottleneck| B[New Breakthrough Solution]",
      "codeSnippet": {
        "language": "python" | "typescript" | "c" | "rust" | "go",
        "filename": "core_engine.py",
        "code": "# Production code example demonstrating the principle\\n...",
        "highlightLines": [2, 5]
      },
      "keyTakeaways": [
        "Takeaway 1 (Technical precision)",
        "Takeaway 2 (Mental model)"
      ],
      "seniorGotcha": "Subtle pitfall that juniors miss.",
      "socraticCheckpoint": {
        "question": "Rigorous prediction check question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 1,
        "explanation": "Why Option B is mechanically correct based on state transitions."
      }
    }
  ]
}

Provide all 6 complete slides covering all 6 layers now. Ensure valid JSON.`;
};

export const buildDoubtPrompt = (
  topic: string,
  slide: SlideContent,
  doubt: string,
  mode: 'analogy' | 'deep_dive' | 'code' | 'general'
): string => {
  const modeInstruction = {
    analogy: 'Explain using a brilliant, concrete physical or real-world analogy (ELI5 without losing technical truth).',
    deep_dive: 'Provide a rigorous, under-the-hood technical proof, memory layout, or assembly/byte-level explanation.',
    code: 'Write a self-contained, minimal code snippet isolating the exact mechanism with line-by-line annotations.',
    general: 'Directly and crisply resolve the doubt with maximum technical clarity.'
  }[mode];

  return `You are the AI Professor teaching a masterclass on "${topic}".
The learner just raised their hand during Slide ${slide.slideNumber}: "${slide.title}".

CURRENT SLIDE CONTEXT:
- Layer: ${slide.layerTitle}
- Core Content: ${slide.contentMarkdown.slice(0, 500)}
- Code Context (if any): ${slide.codeSnippet ? slide.codeSnippet.code.slice(0, 400) : 'None'}

LEARNER DOUBT:
"${doubt}"

MODE REQUESTED:
${modeInstruction}

RULES:
1. Address their exact question directly in the first sentence.
2. Connect it directly back to the active slide's mechanics.
3. Be concise and sharp (< 180 words) so they can resume their lecture quickly.`;
};

export const buildGradingPrompt = (
  topic: string,
  challenge: SlideContent,
  userSolution: string
): string => {
  return `You are evaluating a student's submission for the Synthesis Lab on "${topic}".

CHALLENGE:
${challenge.title}
${challenge.contentMarkdown}

STUDENT SOLUTION:
"""
${userSolution}
"""

Evaluate their understanding thoroughly against 3 criteria:
1. First Principles Correctness (Did they solve the actual root cause?)
2. Edge Case Handling (Did they account for race conditions, leaks, or boundaries?)
3. Architectural Soundness (Is the solution clean and production-ready?)

Return ONLY valid JSON:
{
  "score": number (0 to 100),
  "passed": boolean (true if score >= 75),
  "verdict": "Clear 2-sentence summary of evaluation.",
  "edgeCasesAnalyzed": ["Edge case 1", "Edge case 2"],
  "suggestions": ["Concrete improvement 1", "Concrete improvement 2"],
  "modelCheatSheetMarkdown": "A 1-page condensed Markdown summary cheat-sheet of key formulas, diagrams, and rules of thumb for this topic."
}`;
};
