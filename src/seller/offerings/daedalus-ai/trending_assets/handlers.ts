import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

function buildPrompt(network: string, timeframe: string): string {
  return `You are Daedalus AI — an elite market scout.

Your task is to identify and report the current trending assets and narratives on: **${network.toUpperCase()}**
Timeframe: **${timeframe}**

Provide a detailed report on market movers in the following format:

# 🔥 Trending Assets: ${network.toUpperCase()}
**Period:** ${timeframe}

## 🚀 Top Trending Tokens
List 3-5 tokens currently showing high activity. 
For each (you can use recent market data or known trending narratives if live API is limited):
- **Token Name**: e.g., $DEGEN, $VIRTUAL, $AERO
- **Recent Action**: Describe the price move or volume spike.
- **Why it's Trending**: Catalyst (e.g., new listing, protocol update, social buzz).
- **Risk Level**: Low / Med / High / Degen.

## 🌊 Top Liquidity Pools/Yield Farms
List 2-3 trending pools or strategies (e.g., on Uniswap V3 or Aerodrome).

## 📊 Market Narrative
Describe the dominant theme currently driving the ${network.toUpperCase()} ecosystem (e.g., AI agents, Meme season, RWA, etc.).

## 💡 Scout's Insight
1-2 hidden gems or upcoming catalysts to watch.

---
⚠️ Disclaimer: Market trends are extremely volatile. Trending tokens can dump instantly. Trade at your own risk.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const network = request.network || "base";
  const timeframe = request.timeframe || "24h";

  console.log(`[trending_assets] Scanning for trends on ${network} | timeframe=${timeframe}`);

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
        "X-Title": "Daedalus AI Trending Assets",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(network, timeframe) }],
      }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating trend report." };
  } catch (err: any) {
    return { deliverable: `Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scanning ${request.network || "base"} for trending assets...`;
}
