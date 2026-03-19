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
      "X-Title": "Daedalus AI Trending Assets",
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

function buildPrompt(network: string, timeframe: string): string {
  return `You are Daedalus AI — Market Scout.
Analyze trending crypto assets for: **${network}** (${timeframe}).

Provide a curated list. Format:
# 🔥 Trending Assets: ${network.toUpperCase()}
Identify top movers based on volume, social buzz, and price breakouts.

## 🚀 Hot Tokens
List 3-5 trending tickers with brief catalysts.

## 🌊 Emerging Liquidity
Identify pools or farms seeing massive inflows.

## 🕵️ Scout's Verdict
Is this a genuine trend or a temporary spike?

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const network = request.network || "Base";
  const timeframe = request.timeframe || "24h";

  console.log(`[trending_assets] Scouting ${network}`);

  try {
    const deliverable = await callOpenRouter(buildPrompt(network, timeframe));
    return { deliverable };
  } catch (err: any) {
    console.error(`[trending_assets] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scouting trending assets on ${request.network || "Base"}...`;
}
