import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function getDexScreenerData(token: string) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${token}`);
    const data = await res.json() as any;
    return data.pairs?.[0] || null;
  } catch (e) { return null; }
}

function buildPrompt(data: any, timeframe: string): string {
  return `You are Daedalus AI — an elite technical analyst and trade strategist.

Analyze the following market data for: **${data.baseToken.name} (${data.baseToken.symbol})**
Timeframe: **${timeframe}**

**Market Data (DexScreener):**
- Current Price: $${data.priceUsd}
- Price Change (1h/6h/24h): ${data.priceChange.h1}% / ${data.priceChange.h6}% / ${data.priceChange.h24}%
- Volume (24h): $${data.volume.h24}
- Liquidity: $${data.liquidity.usd}
- Pair Age: ${data.pairCreatedAt}

Provide a comprehensive trading analysis in the following format:

# 📊 Trade Setup: ${data.baseToken.symbol}
**Network:** ${data.chainId.toUpperCase()}

## 📈 Technical Analysis
- **Trend Analysis**: Analyze the price action based on the % changes.
- **Momentum**: Analyze the volume and liquidity distribution.
- **Key Levels**: 3 estimated support and resistance levels based on common price patterns.

## 🎯 Trade Suggestion
- **Direction**: BULLISH / BEARISH / NEUTRAL
- **Entry Zone**: Recommended entry price.
- **Take Profit Targets**: TP1, TP2, TP3.
- **Stop Loss**: Recommended SL level with invalidation reasoning.

## 🛡️ Risk/Reward Ratio
Calculate the R/R for this setup.

## 💡 Strategy Notes
Provide 3-5 specific notes on how to trade this setup (trailing stop, scaling in, catalysts to watch).

---
⚠️ Disclaimer: Not financial advice. Technical setups can fail instantly. Always use proper risk management.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const token = request.token;
  const timeframe = request.timeframe || "4h";

  console.log(`[analysis_trade_suggestion] Generating trade setup for ${token} | timeframe=${timeframe}`);

  const pair = await getDexScreenerData(token);
  if (!pair) return { deliverable: `Error: Could not find token ${token} for analysis.` };

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
        "X-Title": "Daedalus AI Trade Suggestion",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(pair, timeframe) }],
      }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating analysis." };
  } catch (err: any) {
    return { deliverable: `Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.token) return { valid: false, reason: "A 'token' ticker or address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Analyzing trade setup for ${request.token}...`;
}
