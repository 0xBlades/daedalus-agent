import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function getDexScreenerData(token: string) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${token}`);
    const data = await res.json() as any;
    return data.pairs?.[0] || null;
  } catch (e) {
    return null;
  }
}

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
      "X-Title": "Daedalus AI Trade Suggestion",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response.");
  
  return content;
}

function buildAnalysisPrompt(pair: any): string {
  return `You are Daedalus AI — Elite Technical Analyst.
Token: ${pair.baseToken.name} (${pair.baseToken.symbol}) on ${pair.chainId.toUpperCase()}
Price: $${pair.priceUsd}
24h Vol: $${pair.volume.h24}
24h Price Change: ${pair.priceChange.h24}%

Analyze the current setup. Format:
# 📉 Trade Suggestion: ${pair.baseToken.symbol}
**Market Setup:** (Bullish/Bearish/Neutral)

## 📊 Technical Analysis
Analyze Price Action, Volume, and Trend Velocity.

## 🎯 Proposed Trade Setups
1. **Entry Range**: Specific price levels.
2. **Targets**: T1, T2 (conservative & aggressive).
3. **Stop Loss**: Mandatory invalidation level.

## 💡 Strategist Notes
Reasoning behind the setup.

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const token = request.token;
  console.log(`[analysis_trade_suggestion] Analyzing ${token}`);

  try {
    const pair = await getDexScreenerData(token);
    if (!pair) {
      return { deliverable: `Error: Token "${token}" not found on DexScreener.` };
    }

    const deliverable = await callOpenRouter(buildAnalysisPrompt(pair));
    return { deliverable };
  } catch (err: any) {
    console.error(`[analysis_trade_suggestion] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.token) return { valid: false, reason: "A token symbol or address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Generating trade setup for ${request.token}...`;
}
