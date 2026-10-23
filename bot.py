import os
import discord
from discord import app_commands
from discord.ext import commands
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

from ai_router import (
    generate_course,
    solve_chat_doubt,
    GEMINI_API_KEY,
    GROQ_API_KEY
)

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "").strip()

intents = discord.Intents.default()
intents.message_content = True
intents.dm_messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

# -------------------------------------------------------------
# MODAL: "RAISE HAND / ASK DOUBT"
# -------------------------------------------------------------
class DoubtModal(discord.ui.Modal):
    def __init__(self, topic: str, slide_title: str, slide_content: str):
        super().__init__(title=f"✋ Ask Doubt: {slide_title[:30]}")
        self.topic = topic
        self.slide_title = slide_title
        self.slide_content = slide_content

        self.doubt_input = discord.ui.TextInput(
            label="What part is confusing you?",
            style=discord.TextStyle.paragraph,
            placeholder="e.g. Can you explain this with a simpler analogy? Why did we need this step?",
            required=True,
            max_length=500
        )
        self.add_item(self.doubt_input)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True)
        user_doubt = self.doubt_input.value
        context = f"Slide: {self.slide_title}. Explanation: {self.slide_content[:350]}"

        try:
            answer, provider = await solve_chat_doubt(user_doubt, slide_context=context)
            msg = f"### 💡 Doubt Answer: *{user_doubt}*\n\n{answer}\n\n*(Nerd Dev • Powered by {provider})*"
            await interaction.followup.send(content=msg)
        except Exception as e:
            await interaction.followup.send(content=f"⚠️ Error resolving doubt: {e}", ephemeral=True)

# -------------------------------------------------------------
# VIEW: INTERACTIVE SLIDE DECK (NORMAL MESSAGE WITH BULLET POINTS)
# -------------------------------------------------------------
class SlideDeckView(discord.ui.View):
    def __init__(self, course_data: Dict[str, Any], provider: str, user_id: int):
        super().__init__(timeout=1800)  # 30 minute session timeout
        self.course_data = course_data
        self.provider = provider
        self.user_id = user_id
        self.slides = course_data.get("slides", [])
        self.current_idx = 0

    def get_current_message(self) -> str:
        slide = self.slides[self.current_idx]
        total_slides = len(self.slides)
        title = slide.get("title", f"Slide {self.current_idx + 1}")
        subtitle = slide.get("subtitle")

        lines = [f"# 📖 Slide {self.current_idx + 1} of {total_slides}: {title}"]
        if subtitle:
            lines.append(f"*{subtitle}*\n")
        else:
            lines.append("")

        # 1. Keywords & Core Concepts
        keywords = slide.get("keywords") or slide.get("concept_breakdown") or slide.get("intuition", [])
        if isinstance(keywords, list) and keywords:
            lines.append("### 🔑 Key Concepts & Technical Vocabulary")
            for pt in keywords:
                lines.append(f"• {pt}")
            lines.append("")
        elif isinstance(keywords, str) and keywords:
            lines.append(f"### 🔑 Key Concepts & Technical Vocabulary\n• {keywords}\n")

        # 2. Core Framework / Formula / Architecture
        framework = (
            slide.get("core_framework")
            or slide.get("formula_box")
            or slide.get("visual_or_code")
            or slide.get("highlight_box")
            or slide.get("code_snippet")
            or slide.get("code")
        )
        if framework:
            if isinstance(framework, dict):
                lang = framework.get("language", "text")
                snippet = framework.get("content", "").strip()
            else:
                lang = slide.get("visual_lang") or slide.get("highlight_language") or "text"
                snippet = str(framework).strip()
            if snippet:
                lines.append(f"### 📐 Core Law, Framework & Formulations\n```{lang}\n{snippet}\n```\n")

        # 3. Practical Example & Calculation / Case
        example = slide.get("practical_example") or slide.get("technical_deep_dive")
        if example:
            lines.append("### 🧪 Practical Case, Calculation & Walkthrough")
            if isinstance(example, list):
                for pt in example:
                    lines.append(f"• {pt}")
            else:
                lines.append(f"{example}")
            lines.append("")

        # 4. Real-World Scenario & Impact
        scenario = slide.get("real_world_impact") or slide.get("real_world_scenario")
        if scenario:
            lines.append("### 🌍 Real-World Impact & Systems")
            if isinstance(scenario, list):
                for pt in scenario:
                    lines.append(f"• {pt}")
            else:
                lines.append(f"{scenario}")
            lines.append("")

        # Fallback to paragraph content if needed
        content = slide.get("content")
        if content and not keywords and not example:
            lines.append(f"{content}\n")

        # 5. GFG Pro-Tip & Edge Cases
        pro_tip = slide.get("gfg_pro_tip") or slide.get("beginner_tip")
        if pro_tip:
            lines.append(f"> ⚡ **GFG Pro-Tip & Edge Cases:** {pro_tip}\n")

        lines.append(f"*(Slide {self.current_idx + 1}/{total_slides} • Concept Masterclass • Powered by {self.provider})*")

        msg = "\n".join(lines)
        if len(msg) > 1950:
            msg = msg[:1940] + "\n..."
        return msg

    def update_buttons(self):
        total = len(self.slides)
        self.prev_button.disabled = (self.current_idx == 0)
        self.next_button.disabled = (self.current_idx == total - 1)

    @discord.ui.button(label="◀ Prev", style=discord.ButtonStyle.secondary, disabled=True, row=0)
    async def prev_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This lesson belongs to another learner.", ephemeral=True)
            return
        if self.current_idx > 0:
            self.current_idx -= 1
            self.update_buttons()
            await interaction.response.edit_message(content=self.get_current_message(), view=self)

    @discord.ui.button(label="Next ▶", style=discord.ButtonStyle.primary, row=0)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("This lesson belongs to another learner.", ephemeral=True)
            return
        if self.current_idx < len(self.slides) - 1:
            self.current_idx += 1
            self.update_buttons()
            await interaction.response.edit_message(content=self.get_current_message(), view=self)

    @discord.ui.button(label="✋ Ask Doubt", style=discord.ButtonStyle.success, row=0)
    async def doubt_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Please start your own lesson with `/tutor`.", ephemeral=True)
            return
        slide = self.slides[self.current_idx]
        modal = DoubtModal(
            topic=self.course_data.get("topic", "Computer Science"),
            slide_title=slide.get("title", f"Slide {self.current_idx + 1}"),
            slide_content=str(slide.get("intuition", "")) + " " + str(slide.get("mechanics", ""))
        )
        await interaction.response.send_modal(modal)

    @discord.ui.button(label="📝 Quick Quiz", style=discord.ButtonStyle.secondary, row=0)
    async def quiz_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self.user_id:
            await interaction.response.send_message("Please start your own lesson with `/tutor`.", ephemeral=True)
            return
        slide = self.slides[self.current_idx]
        checkpoint = slide.get("checkpoint") or slide.get("quiz")
        if not checkpoint:
            await interaction.response.send_message("No quiz for this slide. Continue to the next!", ephemeral=True)
            return
        
        quiz_view = QuizView(checkpoint, self.user_id)
        msg = f"### 📝 Quick Quiz: Concept Check\n**{checkpoint.get('question')}**\n\n"
        for i, opt in enumerate(checkpoint.get("options", [])):
            msg += f"• **{chr(65 + i)}:** {opt}\n"
        await interaction.response.send_message(content=msg, view=quiz_view, ephemeral=True)

# -------------------------------------------------------------
# VIEW: QUIZ BUTTONS (A, B, C, D)
# -------------------------------------------------------------
class QuizView(discord.ui.View):
    def __init__(self, checkpoint: Dict[str, Any], user_id: int):
        super().__init__(timeout=120)
        self.checkpoint = checkpoint
        self.correct_idx = checkpoint.get("correct_index", 0)
        self.explanation = checkpoint.get("explanation", "Mechanically accurate.")
        self.options = checkpoint.get("options", ["A", "B", "C", "D"])
        self.user_id = user_id

        # Add buttons dynamically
        for i, opt in enumerate(self.options):
            label = f"{chr(65 + i)}: {opt[:45]}"
            btn = discord.ui.Button(label=label, custom_id=str(i), style=discord.ButtonStyle.secondary, row=i//2)
            btn.callback = self.make_callback(i)
            self.add_item(btn)

    def make_callback(self, chosen_idx: int):
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.user_id:
                await interaction.response.send_message("Not your quiz!", ephemeral=True)
                return
            is_correct = (chosen_idx == self.correct_idx)

            for child in self.children:
                if isinstance(child, discord.ui.Button):
                    child.disabled = True
                    if int(child.custom_id) == self.correct_idx:
                        child.style = discord.ButtonStyle.success
                    elif int(child.custom_id) == chosen_idx and not is_correct:
                        child.style = discord.ButtonStyle.danger

            verdict_text = "🎉 **Correct Mental Model!**" if is_correct else "❌ **Not quite.**"
            res_text = f"### {verdict_text}\n\n**Explanation:** {self.explanation}"
            await interaction.response.edit_message(content=res_text, view=self)
        return callback

# -------------------------------------------------------------
# BOT EVENTS & SLASH COMMANDS
# -------------------------------------------------------------

@bot.event
async def on_ready():
    print("=" * 60)
    print(f"[ONLINE] Nerd Dev AI Tutor Bot Logged in as: {bot.user}")
    print(f"Gemini API: {'ENABLED' if GEMINI_API_KEY else 'DISABLED (Check .env)'}")
    print(f"Groq Cloud API: {'ENABLED' if GROQ_API_KEY else 'DISABLED (Check .env)'}")
    print("=" * 60)
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} slash commands globally (including DMs)!")
    except Exception as e:
        print(f"Error syncing commands: {e}")

# -------------------------------------------------------------
# CONVERSATIONAL DM CHATBOT (DOUBTS ONLY • NORMAL MESSAGE)
# -------------------------------------------------------------
@bot.event
async def on_message(message: discord.Message):
    # Ignore messages from the bot itself
    if message.author.bot:
        return

    # Check if message was sent in Direct Messages (DM)
    if isinstance(message.channel, discord.DMChannel):
        if message.content.startswith("!"):
            await bot.process_commands(message)
            return

        async with message.channel.typing():
            try:
                answer, provider = await solve_chat_doubt(message.content)
                await message.channel.send(answer)
            except Exception as e:
                await message.channel.send(f"⚠️ Error resolving question: {e}")
        return

    # Process standard commands for guild channels
    await bot.process_commands(message)

# -------------------------------------------------------------
# SLASH COMMAND: /tutor (WORKS IN DMs & SERVERS)
# -------------------------------------------------------------
@bot.tree.command(name="tutor", description="Start an interactive beginner-friendly lesson on ANY topic")
@app_commands.describe(
    topic="What do you want to learn? (e.g. Gravitation, Calculus, C++ Classes, Photosynthesis, Stock Market)"
)
async def tutor_command(
    interaction: discord.Interaction,
    topic: str
):
    await interaction.response.defer(thinking=True)
    try:
        course_data, provider = await generate_course(
            topic=topic,
            level="beginner",
            minutes=15
        )
        view = SlideDeckView(course_data, provider, interaction.user.id)
        msg_text = view.get_current_message()
        await interaction.followup.send(content=msg_text, view=view)
    except Exception as e:
        await interaction.followup.send(content=f"⚠️ Failed to generate lesson: {e}", ephemeral=True)

# -------------------------------------------------------------
# SLASH COMMAND: /doubt (STANDALONE DOUBT)
# -------------------------------------------------------------
@bot.tree.command(name="doubt", description="Ask any doubt or question on any educational subject")
@app_commands.describe(question="Your question in science, math, history, coding, economics, or any subject")
async def doubt_command(interaction: discord.Interaction, question: str):
    await interaction.response.defer(thinking=True)
    try:
        answer, provider = await solve_chat_doubt(question)
        msg = f"### 💡 Concept Explanation\n\n{answer}\n\n*(Nerd Dev • Powered by {provider})*"
        await interaction.followup.send(content=msg)
    except Exception as e:
        await interaction.followup.send(content=f"⚠️ Error: {e}", ephemeral=True)

# -------------------------------------------------------------
# SLASH COMMAND: /status (FAILOVER ENGINE HEALTH)
# -------------------------------------------------------------
@bot.tree.command(name="status", description="Check the status and health of the AI Failover Engine")
async def status_command(interaction: discord.Interaction):
    groq_status = "🟢 Ready (14,400 free req/day • ~0.2s latency)" if GROQ_API_KEY else "🔴 Key Missing"
    gemini_status = "🟢 Ready (1,500 free req/day • 1M context)" if GEMINI_API_KEY else "🔴 Key Missing"

    status_text = (
        "### ⚡ Nerd Dev AI Failover Engine Status\n"
        f"• **Course Generator**: Google Gemini Flash Lite ({gemini_status})\n"
        f"• **Sub-Second Doubt Engine**: Groq Cloud Qwen 3.8 27B ({groq_status})\n"
        "• **Combined Free Capacity**: ~16,000 requests/day at $0 cost\n"
        "*(Nerd Dev Multi-Cloud Failover)*"
    )
    await interaction.response.send_message(content=status_text, ephemeral=True)

if __name__ == "__main__":
    if not DISCORD_BOT_TOKEN:
        print("[ERROR] DISCORD_BOT_TOKEN is missing in .env!")
        print("Please create a .env file with your Discord Bot Token and API keys.")
    else:
        bot.run(DISCORD_BOT_TOKEN)
