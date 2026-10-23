import os
import json
import re
import httpx
import json_repair
from typing import Dict, Any, Optional

# API Keys from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip()

def clean_think_tags(text: str) -> str:
    """Removes any <think> tags from reasoning models"""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()

def extract_json(text: str) -> Dict[str, Any]:
    cleaned = clean_think_tags(text)
    
    # 1. Try json_repair directly (handles unescaped quotes, truncated output, control chars)
    try:
        data = json_repair.loads(cleaned)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # 2. Extract markdown code block if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if match:
        try:
            data = json_repair.loads(match.group(1))
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # 3. Try finding first { and repair to the end
    first = cleaned.find("{")
    if first != -1:
        try:
            data = json_repair.loads(cleaned[first:])
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # 4. Standard json fallback
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first != -1 and last != -1 and last > first:
        try:
            return json.loads(cleaned[first:last + 1])
        except Exception:
            pass

    raise ValueError("Failed to extract valid JSON from LLM output")

# -------------------------------------------------------------
# LOW-LEVEL CALLERS: GEMINI & GROQ
# -------------------------------------------------------------

async def call_gemini(prompt: str, json_mode: bool = False, max_tokens: int = 1500) -> str:
    """Fallback: Google Gemini Flash Free Tier (1,500 req/day, 1M context)"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={GEMINI_API_KEY}"
    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.6 if json_mode else 0.4
        }
    }
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            raise RuntimeError(f"Gemini API returned status {resp.status_code}: {resp.text}")
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned empty candidates")
        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        return text

async def call_groq(prompt: str, json_mode: bool = False, max_tokens: int = 1500) -> str:
    """Primary / Fast Engine: Groq Cloud Qwen 3.8 27B (14,400 req/day, blazing fast ~0.2s)"""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    # Enforce safe token cap for free-tier OTPM rate limits
    effective_max_tokens = min(max_tokens, 950)
    payload: Dict[str, Any] = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {"role": "system", "content": "You are Nerd Dev, an elite universal AI tutor who teaches ANY subject (Science, Math, History, Tech, Coding, Economics) to beginners using crisp, high-signal bullet points."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": effective_max_tokens,
        "temperature": 0.6 if json_mode else 0.4
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise RuntimeError(f"Groq API returned status {resp.status_code}: {resp.text}")
        data = resp.json()
        return data["choices"][0]["message"]["content"]

async def call_local_ollama(prompt: str, json_mode: bool = False) -> str:
    """Tertiary Fallback: Local RTX 3050 GPU (if machine happens to have Ollama running)"""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": "qwen-local",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.6}
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=40.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            return resp.json().get("response", "")
        raise RuntimeError("Ollama not responding")

async def call_with_failover(prompt: str, json_mode: bool = False, max_tokens: int = 1500) -> tuple[str, str]:
    """
    Automatic Smart Failover:
    - For large course generation (>950 tokens): Google Gemini Flash Lite (1M context) first, then Groq.
    - For doubt Q&A (<=950 tokens): Groq Cloud (~0.2s ultra fast) first, then Gemini.
    Returns: (response_text, provider_name)
    """
    errors = []

    # Large requests go to Gemini first to avoid Groq 1000 OTPM per-req ceiling
    try_gemini_first = (max_tokens > 950)

    if try_gemini_first:
        providers = [
            ("gemini", call_gemini, "Google Gemini Flash Lite"),
            ("groq", call_groq, "Groq Cloud (Qwen 3.8 27B)"),
        ]
    else:
        providers = [
            ("groq", call_groq, "Groq Cloud (Qwen 3.8 27B)"),
            ("gemini", call_gemini, "Google Gemini Flash Lite"),
        ]

    for p_id, func, name in providers:
        if p_id == "groq" and not GROQ_API_KEY:
            continue
        if p_id == "gemini" and not GEMINI_API_KEY:
            continue
        try:
            res = await func(prompt, json_mode=json_mode, max_tokens=max_tokens)
            return res, name
        except Exception as e:
            errors.append(f"{name} error: {e}")

    # Fallback to local Ollama if running
    try:
        res = await call_local_ollama(prompt, json_mode=json_mode)
        return res, "Local GPU (Ollama)"
    except Exception as e:
        errors.append(f"Local Ollama error: {e}")

    raise RuntimeError("All LLM providers failed: " + " | ".join(errors))

# -------------------------------------------------------------
# HIGH LEVEL METHODS: MODULAR DEEP LEARNING CURRICULUM
# -------------------------------------------------------------

async def generate_syllabus(topic: str) -> tuple[Dict[str, Any], str]:
    """Generates an exhaustive 5-module curriculum roadmap for the topic"""
    prompt = f"""You are a Principal Curriculum Director and Master Technical Educator.
Topic: "{topic}"
Goal: Design an EXHAUSTIVE 5-Module Curriculum that can serve as a student's PRIMARY way of learning this topic from first principles to advanced production mastery.

Return ONLY valid JSON matching this schema:
{{
  "topic": "{topic}",
  "modules": [
    {{"number": 1, "title": "Module 1 Title (Core Intuition & The Fundamental Problem)"}},
    {{"number": 2, "title": "Module 2 Title (Internal Mechanics & Detailed Step-by-Step Walkthrough)"}},
    {{"number": 3, "title": "Module 3 Title (Production Implementation, Laws & Formulations)"}},
    {{"number": 4, "title": "Module 4 Title (Mathematical/Systemic Nuance, Invariants & Complexities)"}},
    {{"number": 5, "title": "Module 5 Title (Edge Traps, Failure Modes & Industry/Real-World Legacy)"}}
  ]
}}"""
    raw_text, provider = await call_with_failover(prompt, json_mode=True, max_tokens=1000)
    return extract_json(raw_text), provider

async def generate_module(topic: str, module_info: Dict[str, Any], total_modules: int = 5) -> tuple[Dict[str, Any], str]:
    """Generates an uncompressed, exhaustive, deep pedagogical lesson for a single module"""
    mod_num = module_info.get("number", 1)
    mod_title = module_info.get("title", f"Module {mod_num}")

    prompt = f"""You are a Master Educator (combining GeeksforGeeks technical rigor, Khan Academy pedagogical clarity, and 3Blue1Brown conceptual intuition).
Topic: "{topic}"
Module {mod_num} of {total_modules}: "{mod_title}"

The student needs this to be their PRIMARY way of learning. Do NOT write a brief summary, shallow flashcard, or generic bullet points. Provide an EXHAUSTIVE, DEEP, PEDAGOGICAL LESSON that thoroughly teaches this module from first principles.

HARD LENGTH CONSTRAINT: The lesson markdown must be between 1,400 and 1,750 characters. Be dense, substantive, and clear with zero conversational fluff so it completely fills the screen without exceeding Discord's 2,000-character ceiling.

MUST INCLUDE (Format as clean Discord Markdown):
1. `# 📖 Module {mod_num} of {total_modules}: {mod_title}`
2. `### 🧠 Core Intuition & Thought Experiment`
   - Deep conceptual foundation explaining the systemic "why" and mechanics.
3. `### 🔑 Technical Vocabulary & Invariants`
   - Bold technical keywords with precise, authoritative definitions.
4. `### ⚙️ Step-by-Step Walkthrough & Concrete Trace`
   - If STEM/Algorithm: A concrete numerical trace or array walk-through (Iteration 1, 2, 3 with pointer values or calculations).
   - If History/Social Science: A concrete causal chain with specific dates, actors, economic figures, and actions.
5. `### 💻 Implementation, Formula or Core Framework`
   - Real plain-text formulas with units OR fully commented production code OR historical structural framework.
6. `### ⚠️ Common Pitfalls & Critical Gotchas`
   - Exact bugs, exam traps, or popular misconceptions and the precise truth.
7. `> ⚡ **GFG Key Takeaway:**` Memorable golden rule.

NO LaTeX slashes (no \\frac, \\text, \\Delta, \\approx, $...$). Use clean plain text and Unicode (², ³, ±, ×, ÷, √, π, θ, Δ, →, ≈) or code blocks.

Return ONLY valid JSON:
{{
  "module_number": {mod_num},
  "title": "{mod_title}",
  "content_markdown": "Full 1,400-1,750 character lesson markdown...",
  "checkpoint": {{
    "question": "A rigorous conceptual question testing true understanding of this module",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Detailed explanation of why this answer is correct."
  }}
}}"""
    raw_text, provider = await call_with_failover(prompt, json_mode=True, max_tokens=2200)
    return extract_json(raw_text), provider

async def generate_deep_dive(topic: str, module_info: Dict[str, Any]) -> tuple[str, str]:
    """Generates an advanced deep-dive expansion for a module when the student clicks [🔍 Deep Dive]"""
    mod_num = module_info.get("number", 1)
    mod_title = module_info.get("title", f"Module {mod_num}")

    prompt = f"""You are a Senior Staff Engineer and University Research Professor.
Topic: "{topic}"
Module: "{mod_title}"

The student clicked [🔍 Deep Dive] to explore the advanced mathematics, internal compiler/physical mechanics, and extreme edge cases of this topic.

Write an ADVANCED, IN-DEPTH DEEP DIVE (1,200 - 1,500 characters of clean Discord Markdown):
1. `## 🔍 Deep Dive: {mod_title}`
2. `### 🔬 Low-Level Mechanics / Mathematical Proof`
   - Detailed mathematical proof, cache line behavior, register allocation, or physical relativistic limits.
3. `### 💥 Production Failure Mode / Catastrophic Outage Case Study`
   - Real-world production outage or historical crisis caused by failing to understand this concept.
4. `### 🎯 Advanced Practice Challenge`
   - A challenging problem for the student to solve with the solution explained step-by-step.

NO LaTeX slashes. Use clean plain text and Unicode.
"""
    answer, provider = await call_with_failover(prompt, json_mode=False, max_tokens=1200)
    return clean_think_tags(answer), provider

async def generate_course(topic: str, level: str = "advanced", minutes: int = 25) -> tuple[Dict[str, Any], str]:
    """Generates syllabus and immediately compiles Module 1 in full pedagogical depth"""
    syllabus_data, provider = await generate_syllabus(topic)
    modules = syllabus_data.get("modules", [])
    if not modules:
        modules = [
            {"number": 1, "title": "Core Intuition & The Fundamental Problem"},
            {"number": 2, "title": "Internal Mechanics & Concrete Step-by-Step Trace"},
            {"number": 3, "title": "Production Implementation & Invariant Proofs"},
            {"number": 4, "title": "Mathematical Rigor & Complexity Nuance"},
            {"number": 5, "title": "Edge Traps, Failure Modes & Industry Applications"}
        ]
    m1_data, p2 = await generate_module(topic, modules[0], len(modules))
    
    course_data = {
        "topic": topic,
        "total_modules": len(modules),
        "modules": modules,
        "slides": [m1_data]
    }
    return course_data, provider

async def solve_chat_doubt(user_message: str, slide_context: Optional[str] = None) -> tuple[str, str]:
    """
    Concept-Focused Doubt & Explanation Solver:
    - Provides keywords, real formulas/frameworks, practical examples, and real-world scenarios.
    - Zero unrendered LaTeX; natural subject adaptation.
    """
    guardrail_prompt = f"""You are Nerd Dev, an elite universal tutor who explains doubts across ANY subject (Science, Math, History, Tech, Coding, Economics) using rigorous keywords, exact formulas or historical frameworks, practical examples, and real-world scenarios.

CRITICAL FORMATTING RULES:
1. DISCORD COMPLIANCE: NEVER use LaTeX syntax (no \\frac, \\text, \\Delta, \\approx, $...$). Write all math and relationships in clean plain text using standard Unicode (², ³, ±, ×, ÷, √, π, θ, Δ, →, ≈) or code blocks.
2. SUBJECT ADAPTATION:
   - For STEM: Real formulas, constants, and calculations.
   - For History/Humanities: Causal timelines, turning points, and real historical facts. Do NOT invent fake mathematical formulas for history.

STRICT SCOPE GUARDRAILS:
1. IF off-topic inquiry (casual chit-chat, weather, personal gossip, politics, jokes, non-educational creative writing, roleplay, etc.):
   Reply with EXACTLY this (and nothing else):
   "I am Nerd Dev, your 1-on-1 tutor. Ask me any concept in science, math, history, coding, or any subject!"
2. IF genuine educational inquiry:
   - Structure clearly:
     🔑 **Keywords & Core Concept**: [Bold technical terms and definitions]
     📐 **Core Law / Framework**: [Formula with units OR historical causal chain (NO LaTeX)]
     🧪 **Practical Example**: [Concrete numbers, calculation, or historical case]
     🌍 **Real-World Impact**: [Real physical or geopolitical consequence]
     ⚡ **GFG Pro-Tip**: [Common edge gotcha or misconception to avoid]
   - Keep it concise, high-signal, and easy to read.

{f'ACTIVE SLIDE CONTEXT: {slide_context}' if slide_context else ''}

USER INQUIRY:
"{user_message}"
"""
    answer, provider = await call_with_failover(guardrail_prompt, json_mode=False, max_tokens=400)
    return clean_think_tags(answer), provider

async def grade_homework(topic: str, challenge: str, student_code: str) -> tuple[Dict[str, Any], str]:
    """Grades Capstone Synthesis solution"""
    prompt = f"""Grade this engineering solution for "{topic}" like a Senior Staff Engineer conducting a code review.
Challenge Scenario: {challenge}
Student Solution:
{student_code}

Return ONLY valid JSON:
{{
  "score": 92,
  "passed": true,
  "verdict": "Clear 2-sentence assessment highlighting what was architecturally sound.",
  "strengths": ["Identified the core resource leak", "Preserved clean API contracts"],
  "edge_case_checked": "Checked for high concurrency backpressure",
  "cheat_sheet": "# {topic} — Nerd Dev Quick-Reference\\n\\n### Key Rules\\n1. Always enforce backpressure.\\n2. Detach event listeners upon lifecycle teardown."
}}"""
    raw_text, provider = await call_with_failover(prompt, json_mode=True, max_tokens=1000)
    return extract_json(raw_text), provider
