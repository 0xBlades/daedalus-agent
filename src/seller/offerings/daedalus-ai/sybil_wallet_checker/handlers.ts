import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchTxHistory(address: string, chain: string, apiKey: string) {
  const baseUrl = chain === "base" ? "https://api.basescan.org/api" : 
                  chain === "bsc" ? "https://api.bscscan.com/api" : 
                  "https://api.etherscan.io/api";
  
  try {
    const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    
    if (data.status !== "1") {
      console.error(`[sybil_wallet_checker] Explorer API Error: ${data.message} | Result: ${data.result}`);
      return [];
    }
    
    return data.result || [];
  } catch (e: any) { 
    console.error(`[sybil_wallet_checker] Fetch Exception: ${e.message}`);
    return []; 
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
    method: t.functionName ? t.functionName.split("(")[0] : (t.input === "0x" ? "transfer" : "contract_call"),
    to: t.to,
    value: (parseInt(t.value) / 1e18).toFixed(4),
    time: new Date(t.timeStamp * 1000).toISOString()
  })).slice(0, 30) : "No transactions found in this specific search.";

  return `You are Daedalus AI — On-Chain Forensic Analyst.
Wallet: **${address}** on **${chain}**
Recent Activity Data (last 30 txs): ${txs.length > 0 ? JSON.stringify(txSummary) : "No data provided."}

Analyze for Sybil/Bot behavior:
- Check for repetitive timing.
- Look for multi-swap patterns (Uniswap, OKX, etc.).
- Analyze if the wallet interacts with known infrastructure (Relay, Zerion, etc.).
- Determine if the user is a Human, a Power User, or a Sybil Cluster.

Format:
# 🕵️ Sybil Forensic: ${address}
**Risk Score: [0-100]** (0=Human, 100=Bot/Cluster)

## 📊 Behavioral Patterns
Analyze the transaction timing, types, and fund flows.

## 🔗 Forensic Findings
Highlight key interactions (e.g., Uniswap swaps, protocol usage).

## 🏛️ Verdict
Detailed reasoning on whether this is a genuine user or a sybil bot.

⚠️ Disclaimer: Not financial advice. Analyzes recent on-chain activity.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const address = (request.address || request.wallet).trim().toLowerCase();
  const chain = request.chain || "base";
  
  // Try multiple common Env names for the explorer key
  const explorerKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || process.env.EXPLORER_API_KEY;

  console.log(`[sybil_wallet_checker] Deep forensic for ${address} on ${chain}`);
  if (!explorerKey) {
    console.warn("[sybil_wallet_checker] Warning: No Explorer API Key found in ENV.");
  }

  try {
    let txs = [];
    if (explorerKey) {
      txs = await fetchTxHistory(address, chain, explorerKey);
      console.log(`[sybil_wallet_checker] Fetched ${txs.length} transactions for ${address}`);
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
