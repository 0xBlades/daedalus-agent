import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku";

  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://virtuals.io",
      "X-Title": "Daedalus AI Narrative Score",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response.");
  
  return content;
}

function buildPrompt(topic: string, period: string): string {
  return `You are Daedalus AI — Sentiment Analyst.
Topic/Ticker: **${topic}** | Period: **${period}**

Analyze the social velocity and market narrative. Format:
# 🌊 Narrative Momentum: ${topic}
**Momentum Score: [0-100]** (Velocity/Strength)

## 💹 Sentiment Breakdown
Analyze Bullish vs. Bearish social signals.

## 🚀 Viral Catalysts
Identify upcoming triggers (news, partnerships, tech upgrades).

## 📊 Momentum Trend
Is the narrative Peaking, Emerging, or Fading?

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const topic = request.topic;
  const period = request.period || "24h";

  console.log(`[narrative_momentum_score] Analyzing ${topic}`);

  try {
    const deliverable = await callOpenRouter(buildPrompt(topic, period));
    return { deliverable };
  } catch (err: any) {
    console.error(`[narrative_momentum_score] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic) return { valid: false, reason: "A topic or token symbol is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scoring momentum for ${request.topic}...`;
}
