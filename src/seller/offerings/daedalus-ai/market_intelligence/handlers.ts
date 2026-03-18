import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

function buildPrompt(topic: string, questions?: string): string {
  return `You are Daedalus AI — the world's most advanced crypto intelligence analyst.

Your task is to provide a MASTER-LEVEL Market Intelligence Report on: **${topic.toUpperCase()}**
${questions ? `Special Focus Areas: ${questions}` : ""}

Structure your report into these deep-dive sections:

---

# 🛸 Market Intelligence Report: ${topic.toUpperCase()}
*Final Assessment Status: COMPLETED*

## 🏛️ Ecosystem High-Level Overview
A strategic summary of the project/narrative, its standing in the current cycle, and its core value proposition.

## 📊 Deep On-Chain Intelligence
- **Whale & Smart Money Tracking**: Recent notable wallet movements.
- **Liquidity Depth & Health**: Concentration risks and venue distribution.
- **Supply Analysis**: Vesting schedules, emissions, and holder distribution.

## 📉 Quantitative Analysis (Technical & Price)
- **Macro Trend**: Higher timeframe price action overview.
- **Momentum Strength**: Volume/Price correlation.
- **Trade Setups**: Optimal accumulation zones and exit targets.

## 💭 Narrative & Sentiment Intelligence
- **Mindshare Ranking**: How loud is the social chatter?
- **Community Health**: Sentiment trends on X/Telegram.
- **Narrative Catalysts**: Upcoming events or news that will drive movement.

## 🛡️ Due Diligence & Security Score
- **Contract Safety**: Brief highlight of technical risks.
- **Reputation**: Team/Founder/Deployer track record.

## 🎯 Daedalus Final Alpha Verdict
- **Intelligence Score**: [X]/100
- **Primary Catalyst**: The single biggest reason for upside.
- **Primary Risk**: The single biggest reason for downside.
- **Recommendation**: Institutional-grade summary (Accumulate / Hold / Reduce / Avoid).

## 💡 Strategic Action Plan
3-5 specific, high-conviction moves for a portfolio manager.

---
⚠️ Disclaimer: Not financial advice. Intelligence is based on complex data patterns and AI inference. Trade responsibly.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const topic = request.topic || "Unknown";
  const questions = request.custom_questions;

  console.log(`[market_intelligence] Generating master intelligence for "${topic}"`);

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
        "X-Title": "Daedalus AI Market Intelligence",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(topic, questions) }],
        max_tokens: 3000,
      }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating intelligence report." };
  } catch (err: any) {
    return { deliverable: `Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic) return { valid: false, reason: "A 'topic', 'token', or 'narrative' is required for the full intelligence report." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Generating full Daedalus Market Intelligence for ${request.topic}... This may take 30-60 seconds.`;
}
