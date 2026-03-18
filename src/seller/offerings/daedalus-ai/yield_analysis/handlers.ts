import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

function buildPrompt(asset: string, risk: string, minLiq: number): string {
  return `You are Daedalus AI — an elite DeFi yield strategist specializing in the Base ecosystem.

Analyze current yield opportunities for: **${asset}**
Risk Tolerance: **${risk}**
Minimum Liquidity: **$${minLiq.toLocaleString()}**

Provide a comprehensive yield and strategy analysis in the following format:

# 💎 Yield Analysis: ${asset} (Base Network)
**Strategy Profile:** ${risk.toUpperCase()} Risk

## 📈 Top Yield Opportunities
List the top 3-5 current opportunities on Base (e.g., Aerodrome, Uniswap V3, Moonwell, Morpho, Aave V3). 
For each, include:
- **Protocol**: Protocol name
- **Pool/Strategy**: e.g., USDC/WETH LP or cbBTC Lending
- **Current APY**: Estimated % (include breakdown: base + rewards)
- **TVL/Liquidity**: Current depth
- **Risk Score**: 1-10 with reasoning

## 🛡️ Risk Assessment
Analyze the risks for the suggested strategies (Smart Contract risk, IL, Liquidity risk).

## 🎯 Optimal Allocation Insight
Provide a recommended split (e.g., 50% Moonwell, 30% Aerodrome, 20% Uniswap) to optimize for the requested risk profile.

## 💡 Pro Tips
2-3 tips for managing these positions (rebalancing, compounding, etc.).

---
⚠️ Disclaimer: Not financial advice. Always DYOR.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const asset = (request.asset || "USDC").toUpperCase();
  const risk = request.risk_tolerance || "medium";
  const minLiq = request.min_liquidity || 1000000;

  console.log(`[yield_analysis] Analyzing yields for ${asset} | risk=${risk}`);

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
        "X-Title": "Daedalus AI Yield Analysis",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildPrompt(asset, risk, minLiq) }],
      }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating analysis." };
  } catch (err: any) {
    return { deliverable: `Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  const asset = (request.asset || "").toUpperCase();
  if (asset && asset !== "USDC" && asset !== "CBBTC") {
    return { valid: false, reason: "Currently only USDC and cbBTC are supported for yield analysis on Base." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Daedalus AI will perform deep yield analysis for ${request.asset || "USDC"} on Base.`;
}
