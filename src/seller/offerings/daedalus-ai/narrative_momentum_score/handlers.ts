import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

function buildPrompt(topic: string, period: string): string {
  return `You are Daedalus AI — an expert in market narratives and social velocity.

Score the narrative momentum for: **${topic.toUpperCase()}**
Period: **${period}**

Provide a detailed narrative momentum report in the following format:

# 📊 Narrative Momentum: ${topic.toUpperCase()}
**Period:** ${period}

## 🚀 Momentum Score: [X]/100
- **Trend Velocity**: (Score 1-10) How fast interest is growing.
- **Sentiment Quality**: (Score 1-10) Bulls vs Bears, FUD vs Hype.
- **On-Chain Correlation**: (Score 1-10) Is volume following the hype?

## 🔎 Analysis
- **Dominant Sentiment**: Describe the current market mood around this topic.
- **Social Presence**: Note any key influencers or communities driving the narrative.
- **On-Chain Signal**: Analyze if the narrative is backed by real money movements.

## 🎯 Momentum Status
- **Phase**: Stealth / Early / FOMO / Peak / Cooling Down.
- **Price Outlook**: Short-term expectation.

## 💡 Strategist's Playbook
3 specific actionable tips for trading this narrative.

---
⚠️ Disclaimer: Not financial advice. Narrative momentum can shift instantly due to news or market events.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const topic = request.topic || "Crypto";
  const period = request.period || "24h";

  console.log(`[narrative_momentum_score] Scoring momentum for "${topic}" | period=${period}`);

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";

  if (!apiKey) return { deliverable: "Error: OPENROUTER_API_KEY not set." };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://virtuals.io",
        "X-Title": "Daedalus AI Narrative Momentum",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(topic, period) }],
      }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating momentum report." };
  } catch (err: any) {
    return { deliverable: `Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic) return { valid: false, reason: "A 'topic' or 'token' is required to score narrative momentum." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scoring narrative momentum for ${request.topic}...`;
}
