import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchTxHistory(address: string, chain: string, apiKey: string) {
  const baseUrl = chain === "base" ? "https://api.basescan.org/api" : 
                  chain === "bsc" ? "https://api.bscscan.com/api" : 
                  "https://api.etherscan.io/api";
  
  try {
    const res = await fetch(`${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`);
    const data = await res.json() as any;
    if (data.status !== "1") return [];
    return data.result || [];
  } catch (e) { return []; }
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
      "X-Title": "Daedalus AI Sybil Forensic",
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
  const txSummary = txs.length > 0 ? txs.map(t => ({
    method: t.functionName || "transfer",
    to: t.to,
    value: (parseInt(t.value) / 1e18).toFixed(4),
    time: new Date(t.timeStamp * 1000).toISOString()
  })).slice(0, 30) : "No transactions found.";

  return `You are Daedalus AI — On-Chain Forensic Analyst.
Wallet: **${address}** on **${chain}**
Recent Data: ${JSON.stringify(txSummary)}

Perform a deep forensic analysis for Sybil or Bot behavior:
- Look for repetitive timing between transactions.
- Check for "fund and discard" patterns.
- Look for air-drop farming signatures.
- Analyze contract interactions.

Format:
# 🕵️ Sybil Forensic: ${address.slice(0, 10)}...
**Risk Score: [0-100]** (0=Human, 100=Bot/Cluster)

## 📊 Behavioral Patterns
Analyze the transaction timing, types, and fund flows.

## 🔗 Transaction Evidence
Highlight specific transactions that look automated or suspicious.

## 🏛️ Forensic Verdict
Final decision: Is this a human user or a sybil bot?

⚠️ Disclaimer: Not financial advice. Always verify with multiple tools.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const address = (request.address || request.wallet).trim().toLowerCase();
  const chain = request.chain || "base";
  const explorerKey = process.env.ETHERSCAN_API_KEY;

  console.log(`[sybil_wallet_checker] Deep forensic for ${address} on ${chain}`);

  try {
    let txs = [];
    if (explorerKey) {
      txs = await fetchTxHistory(address, chain, explorerKey);
    }

    const deliverable = await callOpenRouter(buildPrompt(address, chain, txs));
    return { deliverable };
  } catch (err: any) {
    console.error(`[sybil_wallet_checker] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  const address = request.address || request.wallet;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, reason: "A valid EVM wallet address (0x...) is required." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Performing deep on-chain forensic check for ${request.address || request.wallet}...`;
}
