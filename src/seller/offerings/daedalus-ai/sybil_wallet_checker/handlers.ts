import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

interface ChainConfig { name: string; apiUrl: string; explorerUrl: string; }
const CHAINS: Record<string, ChainConfig> = {
  ethereum: { name: "Ethereum", apiUrl: "https://api.etherscan.io/api", explorerUrl: "https://etherscan.io" },
  base: { name: "Base", apiUrl: "https://api.basescan.org/api", explorerUrl: "https://basescan.org" },
  arbitrum: { name: "Arbitrum", apiUrl: "https://api.arbiscan.io/api", explorerUrl: "https://arbiscan.io" },
  optimism: { name: "Optimism", apiUrl: "https://api-optimistic.etherscan.io/api", explorerUrl: "https://optimistic.etherscan.io" },
  polygon: { name: "Polygon", apiUrl: "https://api.polygonscan.com/api", explorerUrl: "https://polygonscan.com" },
  bsc: { name: "BNB Chain", apiUrl: "https://api.bscscan.com/api", explorerUrl: "https://bscscan.com" },
};

async function fetchTransactions(wallet: string, chain: ChainConfig, apiKey: string, limit: number) {
  const url = `${chain.apiUrl}?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json() as any;
  return data.status === "1" ? data.result : [];
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const wallet = request.wallet.trim();
  const chainKey = (request.chain || "ethereum").toLowerCase();
  const depth = request.depth === "deep" ? 200 : 50;
  const chain = CHAINS[chainKey] || CHAINS.ethereum;
  const apiKey = process.env.ETHERSCAN_API_KEY;

  if (!apiKey) return { deliverable: "Error: ETHERSCAN_API_KEY not set." };

  try {
    const txs = await fetchTransactions(wallet, chain, apiKey, depth);
    if (txs.length === 0) return { deliverable: `No transactions found for ${wallet} on ${chain.name}.` };

    const prompt = `You are a cybersecurity expert analyzing the following wallet for sybil behavior: ${wallet}. On-chain activity (last ${txs.length} txs) indicates specific behavioral patterns. Provide a 0-100 risk score and detailed reasoning.`;

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openrouterApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json() as any;
    return { deliverable: data.choices?.[0]?.message?.content || "Error generating analysis." };
  } catch (err: any) { return { deliverable: `Error: ${err.message}` }; }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.wallet) return { valid: false, reason: "A 'wallet' address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Analyzing sybil risk for ${request.wallet}...`;
}
