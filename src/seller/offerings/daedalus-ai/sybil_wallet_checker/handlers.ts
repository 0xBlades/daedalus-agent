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
      "X-Title": "Daedalus AI Sybil Check",
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

function buildPrompt(address: string, chain: string, txs: any[]): string {
  return `You are Daedalus AI — On-Chain Forensic Analyst.
Wallet: **${address}** on **${chain}**
Recent Transactions: ${JSON.stringify(txs)}

Analyze for Sybil/Bot behavior. Format:
# 🕵️ Sybil Check: ${address.slice(0, 8)}...
**Risk Score: [0-100]** (0 = Human, 100 = Bot/Sybil)

## 📊 Pattern Analysis
Describe the behavior (AirDrop farming patterns, repetitive txs, etc.).

## 🔗 Connection Graph
Any links to known sybil clusters or funding patterns?

## 🏛️ Forensic Verdict
Is this a genuine user or a programmed sybil?

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const address = request.address;
  const chain = request.chain || "ethereum";

  console.log(`[sybil_wallet_checker] Checking ${address}`);

  try {
    // In a real scenario, we'd fetch actual tx data here. 
    // For now, we use the address to simulate the AI check.
    const deliverable = await callOpenRouter(buildPrompt(address, chain, []));
    return { deliverable };
  } catch (err: any) {
    console.error(`[sybil_wallet_checker] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.address) return { valid: false, reason: "A wallet address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Running sybil forensic check for ${request.address}...`;
}
