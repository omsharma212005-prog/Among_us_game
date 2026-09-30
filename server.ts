import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with user-agent telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health & status check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(geminiApiKey),
    time: new Date().toISOString(),
  });
});

interface BotInfo {
  id: number;
  name: string;
  color: string;
  alive: boolean;
  role: 'Crew' | 'Impostor';
  personality: string;
  room: string;
  suspicionOn?: string;
  lastSeenNear?: string;
}

// 1. Initial statements when Emergency Meeting or Body is reported
app.post('/api/meeting/statements', async (req: Request, res: Response) => {
  const { reason, reporterName, deadBodyLocation, deadPlayerName, bots, player } = req.body;

  const aliveBots: BotInfo[] = (bots || []).filter((b: BotInfo) => b.alive);
  if (aliveBots.length === 0) {
    return res.json({ statements: [] });
  }

  // If Gemini API is available, ask Gemini to generate personalized statements
  if (ai) {
    try {
      const botsDescription = aliveBots
        .map(
          (b) =>
            `- Name: ${b.name} (${b.color}). Secret Role: ${b.role}. Personality: "${b.personality}". Current Room: ${b.room || 'Corridor'}. Last seen: ${b.lastSeenNear || 'alone'}.`
        )
        .join('\n');

      const systemPrompt = `You are the game master for an authentic "Among Us" social deduction emergency meeting aboard the Skeld-9 space station.
Your job is to generate dialogue lines for each surviving bot crewmate.

Situation:
- Meeting Trigger: ${reason}
- Called By: ${reporterName}
${deadPlayerName ? `- Dead Crewmate: ${deadPlayerName}, found in: ${deadBodyLocation}` : '- Emergency button was pressed.'}
- Player: ${player?.name || 'Cyan'} (Role: ${player?.role || 'Crewmate'}, currently in ${player?.room || 'Cafeteria'})

Living Bots:
${botsDescription}

Rules for responses:
1. Each bot MUST speak in 1 to 2 short, tense, colloquial lines (just like real Among Us players).
2. If bot is an Impostor, they MUST pretend to be innocent, fake a task alibi in their room, deflect blame, or question the reporter. NEVER admit to being an Impostor!
3. If bot is Crew, they should state where they were, what task they were doing, and who they suspect or saw.
4. Keep the distinct tone of their personality (e.g. Red is aggressive and defensive; Green is analytical and watches logs; Yellow is timid and easily spooked; Purple is a sharp detective; Pink is friendly but suspicious; Orange is hyper-paranoid).

Output MUST be a valid JSON array of objects with exactly two properties:
"botId" (number): id of the bot
"statement" (string): the dialogue line
Do not include markdown or backticks in the response. Return JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Generate the opening meeting statements now.',
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.8,
        },
      });

      const text = response.text?.trim() || '[]';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ statements: parsed });
      }
    } catch (error) {
      console.error('Gemini statement generation error, using fallback:', error);
    }
  }

  // Smart heuristic fallback if API fails or key is missing
  const fallbackStatements = aliveBots.map((bot) => {
    let text = '';
    if (bot.role === 'Impostor') {
      const excuses = [
        `I was doing download in ${bot.room || 'Admin'}, wasn't anywhere near there!`,
        `Why are you looking at me? Who was the last person seen with ${deadPlayerName || 'them'}?`,
        `I swear I was calibrating the ${bot.room || 'Electrical'} circuit the whole time!`,
        `Self-report? ${reporterName} seems way too eager to blame people!`,
      ];
      text = excuses[bot.id % excuses.length];
    } else {
      const crewRemarks = [
        `I was in ${bot.room || 'MedBay'} finishing my scans. Anyone else can vouch?`,
        `Wait, ${reporterName}, where exactly did you see the body? Did you see anyone venting?`,
        `I'm terrified... I was in ${bot.room || 'Reactor'} and heard something strange.`,
        `Let's stick to the facts. Who was near ${deadBodyLocation || 'the crime scene'} recently?`,
        `I walked past ${deadBodyLocation || 'the corridors'} a minute ago and didn't see anything!`,
      ];
      text = crewRemarks[(bot.id + 2) % crewRemarks.length];
    }
    return {
      botId: bot.id,
      statement: text,
    };
  });

  return res.json({ statements: fallbackStatements });
});

// 2. Interrogation & Player Cross-examination
app.post('/api/meeting/interrogate', async (req: Request, res: Response) => {
  const { userMessage, targetBotId, bots, player, meetingHistory } = req.body;

  const targetBot: BotInfo | undefined = (bots || []).find((b: BotInfo) => b.id === targetBotId);
  const otherAliveBots: BotInfo[] = (bots || []).filter((b: BotInfo) => b.alive && b.id !== targetBotId);

  if (!targetBot) {
    // If no specific target, pick a random alive bot
    const responder = otherAliveBots[Math.floor(Math.random() * otherAliveBots.length)];
    if (!responder) return res.json({ response: 'The room remains eerily silent...' });
  }

  const activeBot = targetBot || otherAliveBots[0];

  if (ai && activeBot) {
    try {
      const historyContext = (meetingHistory || [])
        .slice(-5)
        .map((h: { speaker: string; text: string }) => `${h.speaker}: "${h.text}"`)
        .join('\n');

      const systemPrompt = `You are playing Among Us as "${activeBot.name}" (${activeBot.color}).
Your secret role is: ${activeBot.role}.
Your personality is: ${activeBot.personality}.
Current room you were found in: ${activeBot.room}.
${activeBot.role === 'Impostor' ? 'CRITICAL: You are an Impostor! Never confess. Blame others, provide fake task alibis, or question their evidence.' : 'You are a Crewmate trying to survive and deduce who the killer is.'}

Recent meeting transcript:
${historyContext || '(Meeting just started)'}

Player ${player?.name || 'Cyan'} asks/accuses: "${userMessage}"

Respond in 1 or 2 concise, snappy sentences. Speak with emotional urgency, defensiveness, or logic appropriate to your personality.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Respond as ${activeBot.name} to the player's statement: "${userMessage}"`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.85,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return res.json({
          responderId: activeBot.id,
          responderName: activeBot.name,
          responderColor: activeBot.color,
          response: reply,
        });
      }
    } catch (err) {
      console.error('Gemini interrogate error:', err);
    }
  }

  // Fallback response
  const fallbackReplies = [
    `Why are you pointing at me? I literally have visual tasks in MedBay!`,
    `I was nowhere near that room! Check the station logs if you don't believe me.`,
    `You're acting super suspicious right now by throwing random accusations.`,
    `I told you, I was with Yellow before the alarm went off! Ask them!`,
    `Don't vote me! If you eject me you're throwing the game!`,
  ];
  const chosen = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

  return res.json({
    responderId: activeBot ? activeBot.id : 1,
    responderName: activeBot ? activeBot.name : 'Crewmate',
    responderColor: activeBot ? activeBot.color : '#ef4444',
    response: chosen,
  });
});

// 3. Bot Voting Decision
app.post('/api/meeting/votes', async (req: Request, res: Response) => {
  const { bots, discussionSummary, candidates } = req.body;
  const aliveBots: BotInfo[] = (bots || []).filter((b: BotInfo) => b.alive);

  if (ai) {
    try {
      const candidatesList = (candidates || []).map((c: { id: number; name: string }) => `${c.id}: ${c.name}`).join(', ');

      const prompt = `You are simulating the ejection vote in Among Us.
Available candidates to vote for: ${candidatesList}, or "skip".
Discussion recap: "${discussionSummary || 'Suspicion is scattered'}"

Living bots voting:
${aliveBots.map((b) => `- Bot ID ${b.id} (${b.name}, Role: ${b.role}, Personality: ${b.personality})`).join('\n')}

For each living bot, decide who they vote for (candidate ID or "skip") and a 5-10 word reason.
Impostors will vote against innocents or vote skip to sow discord.
Crewmates will vote for the most suspicious suspect based on the discussion or skip if unsure.

Output JSON object with keys as bot IDs:
{
  "[botId]": {
    "target": number or "skip",
    "reason": "short explanation"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json({ votes: parsed });
    } catch (err) {
      console.error('Gemini vote decision error:', err);
    }
  }

  // Fallback voting logic
  const votes: Record<number, { target: number | 'skip'; reason: string }> = {};
  aliveBots.forEach((b) => {
    // 25% chance to skip if inconclusive
    const shouldSkip = Math.random() < 0.25;
    if (shouldSkip) {
      votes[b.id] = { target: 'skip', reason: 'Not enough clear proof, skipping.' };
    } else {
      const validTargets = (candidates || []).filter((c: { id: number }) => c.id !== b.id);
      const chosen = validTargets[Math.floor(Math.random() * validTargets.length)];
      votes[b.id] = {
        target: chosen ? chosen.id : 'skip',
        reason: chosen ? `Voting ${chosen.name}, their alibi felt fake!` : 'Skipping.',
      };
    }
  });

  return res.json({ votes });
});

// Setup Vite in Dev mode or Static server in Production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Station server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
