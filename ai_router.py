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
# HIGH LEVEL METHODS
# -------------------------------------------------------------

async def generate_course(topic: str, level: str = "advanced", minutes: int = 25) -> tuple[Dict[str, Any], str]:
    """Generates an intensely concept-focused masterclass with keywords, formulas/frameworks, practical examples, and scenarios"""
    prompt = f"""You are Nerd Dev, a Principal Scientific & Technical Educator writing in the authoritative, crystal-clear style of GeeksforGeeks and MIT OpenCourseWare.
Topic: "{topic}"

CRITICAL INSTRUCTIONS:
1. SUBJECT-AWARE INTELLECT:
   - If STEM (Physics, Math, Chemistry, CS, Engineering, Quant Economics): Include real physical/mathematical formulas, constants, units, and numerical calculations.
   - If Humanities / History / Social Sciences (e.g., French Revolution, World War I, Philosophy): Include real historical turning points, causal mechanisms, structural doctrines, and timelines. NEVER INVENT FAKE MATHEMATICAL FORMULAS OR CALCULUS DERIVATIVES FOR HISTORICAL/SOCIAL EVENTS.
2. NO UNRENDERED LATEX (DISCORD COMPLIANCE):
   - Discord does NOT support LaTeX rendering (do NOT use \\frac, \\text, \\Delta, \\approx, $...$).
   - Write all math and equations in clean, readable plain text using standard Unicode (e.g., ², ³, ±, ×, ÷, √, π, θ, Δ, →, ≈) or within standard code blocks (e.g., F = G * (m1 * m2) / r^2).
3. PROGRESSION (6 Masterclass Slides):
   - Slide 1: Foundations & Core Origin (Core premise, essential keywords, and historical/physical context)
   - Slide 2: Mechanics & Internal Systems (Internal state machine, field dynamics, or causal chain)
   - Slide 3: Deep Technical Breakdown & Calculation (Formula derivation with concrete numbers OR detailed timeline with dates/actors)
   - Slide 4: Key Invariants, Laws & Nuance (Conservation laws, treaties, or structural complexities)
   - Slide 5: Edge Cases, Traps & Misconceptions (What popular culture or exam candidates get wrong vs reality)
   - Slide 6: Real-World Industry & Historical Legacy (Large-scale modern deployment, planetary systems, or modern geopolitical impact)

Return ONLY valid JSON matching this schema:
{{
  "topic": "{topic}",
  "total_slides": 6,
  "slides": [
    {{
      "slide_number": 1,
      "title": "Clear Authoritative Title",
      "subtitle": "Authoritative fundamental law or premise",
      "keywords": [
        "**Keyword 1**: Rigorous technical definition...",
        "**Keyword 2**: Rigorous technical definition...",
        "**Keyword 3**: Rigorous technical definition..."
      ],
      "core_framework": "Clean plain-text formula with units OR historical causal flow (e.g. Cause A + Cause B -> Consequence C)...",
      "practical_example": "Concrete step-by-step numerical calculation OR detailed historical event with dates/numbers...",
      "real_world_scenario": "Real engineering application OR modern historical/geopolitical scenario...",
      "gfg_pro_tip": "Interview/Exam trap, edge case gotcha, or critical nuance...",
      "checkpoint": {{
        "question": "A rigorous conceptual question testing true understanding",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_index": 0,
        "explanation": "Detailed explanation of why this answer is correct in plain text."
      }}
    }}
  ]
}}"""
    raw_text, provider = await call_with_failover(prompt, json_mode=True, max_tokens=4500)
    data = extract_json(raw_text)
    return data, provider

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
