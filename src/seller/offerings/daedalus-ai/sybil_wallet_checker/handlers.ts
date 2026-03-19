import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchTxHistory(address: string, chain: string, apiKey: string) {
  const v2BaseUrl = "https://api.etherscan.io/v2/api";
  
  const chainIdMap: Record<string, string> = {
    "ethereum": "1",
    "base": "8453",
    "bsc": "56",
    "arbitrum": "42161",
    "optimism": "10",
    "polygon": "137",
    "avalanche": "43114",
    "linea": "59144",
    "scroll": "534352",
    "zksync": "324"
  };

  const chainId = chainIdMap[chain.toLowerCase()] || "8453"; // Default to Base since user is testing there
  
  try {
    const url = `${v2BaseUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;
    
    console.log(`[sybil_wallet_checker] Debug - Requesting URL: ${url.replace(apiKey, "REDACTED")}`);
    
    const res = await fetch(url);
    const data = await res.json() as any;
    
    console.log(`[sybil_wallet_checker] Debug - Response Status: ${data.status}, Message: ${data.message}`);
    
    if (data.status !== "1") {
      console.error(`[sybil_wallet_checker] V2 API Error Detail: ${JSON.stringify(data)}`);
      return [];
    }
    
    const txs = data.result || [];
    console.log(`[sybil_wallet_checker] Debug - Successfully found ${txs.length} transactions.`);
    return txs;
  } catch (e: any) { 
    console.error(`[sybil_wallet_checker] V2 Fetch Critical Exception: ${e.message}`);
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
  return data.choices?.[0]?.message?.content || "No AI response.";
}

function buildPrompt(address: string, chain: string, txs: any[]): string {
  if (txs.length === 0) {
    return `You are Daedalus AI — On-Chain Forensic Analyst.
Wallet: **${address}** on **${chain}**
Status: **ERROR - DATA RELAY FAILURE**

The internal tool failed to retrieve transaction data from the explorer API. 

State clearly that:
1. You cannot perform the analysis because the data retrieval failed (TECHNICAL ERROR).
2. It's not necessarily because the wallet is empty, but because the API returned no results.
3. Suggest the user check if their API Key is valid for the V2 endpoint.`;
  }

  const txSummary = txs.map(t => ({
    method: t.functionName ? t.functionName.split("(")[0] : (t.input === "0x" ? "transfer" : "contract_call"),
    to: t.to,
    value: (parseInt(t.value) || 0) / 1e18,
    time: new Date(t.timeStamp * 1000).toISOString()
  })).slice(0, 30);

  return `You are Daedalus AI — On-Chain Forensic Analyst.
Wallet: **${address}** on **${chain}**
Recent Activity Data: ${JSON.stringify(txSummary)}

Perform a deep forensic analysis for Sybil/Bot behavior. Format:
# 🕵️ Sybil Forensic: ${address}
**Risk Score: [0-100]** (0=Human, 100=Bot/Cluster)

## 📊 Behavioral Patterns
Analyze the transaction timing, types, and fund flows.

## 🏛️ Forensic Verdict
Is this a human user or a sybil bot? provide reasoning.

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const address = (request.address || request.wallet || "").trim().toLowerCase();
  const chain = request.chain || "base";
  const explorerKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || process.env.EXPLORER_API_KEY;

  console.log(`[sybil_wallet_checker] Job started for ${address} on ${chain}`);

  try {
    if (!address) {
      return { deliverable: "⚠️ Error: Wallet address is missing." };
    }
    if (!explorerKey) {
      return { deliverable: "⚠️ Error: Explorer API Key is missing in .env." };
    }

    const txs = await fetchTxHistory(address, chain, explorerKey);
    const deliverable = await callOpenRouter(buildPrompt(address, chain, txs));
    return { deliverable };
  } catch (err: any) {
    console.error(`[sybil_wallet_checker] Fatal Error: ${err.message}`);
    return { deliverable: `⚠️ Critical Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  const address = request.address || request.wallet;
  if (!address) return { valid: false, reason: "A wallet address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Analyzing sybil risk for ${request.address || request.wallet}...`;
}
