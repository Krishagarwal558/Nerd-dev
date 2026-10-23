# 🎓 Nerd Dev — Universal AI Tutor Discord Bot

An elite, concept-focused AI Tutor Discord Bot that delivers structured, interactive masterclasses and 1-on-1 doubt solving across **Science, Mathematics, Computer Science, Engineering, History, and Economics**.

Powered by a high-availability **multi-cloud free failover engine** combining **Google Gemini Flash Lite** and **Groq Cloud (Qwen 3.8 27B)** ($0 API cost, ~16,000 free requests/day, zero laptop heating).

---

## ✨ Features

- **📖 6-Slide Concept Masterclasses (`/tutor [topic]`)**:
  - **🔑 Key Concepts & Technical Vocabulary**: Rigorous definitions of fundamental terms.
  - **📐 Mathematical Laws & Formulations**: Clear formulas, invariants, SI units, and derivations.
  - **🧪 Practical Examples & Concrete Calculations**: Step-by-step numbers plugged into formulas or real code traces.
  - **🌍 Real-World Scenarios**: Concrete physical, aerospace, or industrial production scenarios.
  - **⚡ GFG Pro-Tips & Edge Cases**: Common traps, exam gotchas, and boundary conditions.
- **💬 Full-Width Discord Presentation**: Clean markdown messages that take full screen width (no narrow embed boxes).
- **🕹️ In-Place Interactive Navigation**: Single-message deck updating via `[◀ Prev]`, `[Next ▶]`, `[✋ Ask Doubt]`, and `[📝 Quick Quiz]`.
- **💬 1-on-1 Conversational DMs (`on_message`)**: DM Nerd Dev directly with any question for an instant, concept-focused breakdown. Off-topic chatter is strictly rejected in $\le 15$ words to prevent token burn.
- **🛡️ Bulletproof JSON Recovery**: Built-in auto-repairing JSON engine (`json-repair`) ensuring 100% resilient course generation.

---

## 🚀 Quick Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Krishagarwal558/nerd-dev.git
cd nerd-dev
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your API keys:
```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```
- **Discord Bot Token**: From [Discord Developer Portal](https://discord.com/developers/applications)
- **Gemini API Key**: Free tier from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Groq API Key**: Free tier from [Groq Console](https://console.groq.com/keys)

### 3. Run the Bot
```bash
python bot.py
```

---

## ⚡ Slash Commands

| Command | Description |
| :--- | :--- |
| `/tutor [topic]` | Launch an interactive 6-slide Concept Masterclass on any subject. |
| `/doubt [question]` | Ask any doubt in science, math, history, engineering, or coding. |
| `/status` | View live multi-cloud failover engine health and API quota status. |

---

## 🏛️ Architecture & Failover

```
[ Discord User / Server ]
           │
           ▼
     [ Nerd Dev ]
           │
     ┌─────┴──────────────────┐
     ▼                        ▼
[ Primary Engine ]     [ Fast Doubt Engine ]
Google Gemini Flash    Groq Cloud Qwen 3.8 27B
(1M Context, Free)     (~0.2s Latency, Free)
     └─────┬──────────────────┘
           ▼
[ Auto Failover & JSON Repair ]
```

---

## 📜 License
MIT
