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
      "X-Title": "Daedalus AI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Higher precision for analysis
    }),
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response.");
  
  return content;
}

function buildPrompt(asset: string, risk: string, minLiq: number): string {
  return `You are Daedalus AI — DeFi strategist for Base. Analyze: **${asset}** (Risk: ${risk}, Min Liq: $${minLiq.toLocaleString()}).

Format:
# 💎 Yield Analysis: ${asset} (Base)
**Strategy Profile:** ${risk.toUpperCase()} Risk

## 📈 Top Yield Opportunities
List 3-5 opportunities (Aerodrome, Moonwell, Uniswap V3, Aave V3, etc.).
Include: Protocol, Pool/Strategy, APY (breakdown), TVL, Risk Score (1-10).

## 🛡️ Risk Assessment
Analyze Smart Contract, IL, and Liquidity risks.

## 🎯 Optimal Allocation
Recommended split for ${risk} risk profile.

## 💡 Pro Tips
2-3 tips for rebalancing/managing positions.

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const asset = (request.asset || "USDC").toUpperCase();
  const risk = request.risk_tolerance || "medium";
  const minLiq = request.min_liquidity || 1000000;

  console.log(`[yield_analysis] Analyzing yields for ${asset} | risk=${risk}`);

  try {
    const deliverable = await callOpenRouter(buildPrompt(asset, risk, minLiq));
    return { deliverable };
  } catch (err: any) {
    console.error(`[yield_analysis] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}\n\nPlease check your API key or model availability.` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  const asset = (request.asset || "").toUpperCase();
  if (asset && asset !== "USDC" && asset !== "CBBTC") {
    return { valid: false, reason: "Supported: USDC, cbBTC on Base." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Performing yield analysis for ${request.asset || "USDC"}...`;
}
