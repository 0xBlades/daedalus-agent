import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchDeployments(address: string, chain: string, apiKey: string) {
  // Etherscan API V2 uses a unified endpoint
  const v2BaseUrl = "https://api.etherscan.io/v2/api";
  
  const chainIdMap: Record<string, string> = {
    "ethereum": "1",
    "base": "8453",
    "bsc": "56"
  };

  const chainId = chainIdMap[chain.toLowerCase()] || "8453";
  
  try {
    const url = `${v2BaseUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    if (data.status !== "1") return [];
    
    // Filter for contract creations (to is empty or null)
    return data.result.filter((tx: any) => !tx.to || tx.to === "");
  } catch (e) { return []; }
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const address = request.address.trim().toLowerCase();
  const chain = request.chain || "base";
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || process.env.EXPLORER_API_KEY;

  if (!apiKey) return { deliverable: "Error: Explorer API Key (ETHERSCAN_API_KEY) not set in .env." };

  console.log(`[deployer_checker] Checking reputation for ${address} on ${chain} (V2 API)`);

  const deployments = await fetchDeployments(address, chain, apiKey);
  const deployCount = deployments.length;
  
  let trustScore = 100;
  if (deployCount === 0) trustScore = 50; 
  else if (deployCount > 10) trustScore -= 20; 
  
  const deliverable = `
# 🕵️ Deployer Report: ${address.slice(0, 10)}...
**Chain:** ${chain.toUpperCase()}

## 📊 Trust Profile
- **Trust Score**: ${trustScore}/100
- **Total Deployments Detected**: ${deployCount} (last 100 txs)

## 🔎 Deployment History
${deployCount > 0 ? deployments.slice(0, 5).map((d: any, i: number) => `- **Contract ${i+1}**: \`${d.contractAddress || "N/A"}\` (Date: ${new Date(d.timeStamp * 1000).toDateString()})`).join("\n") : "- No contract deployments found in recent history."}

## 🎯 Verdict
${trustScore >= 80 ? "✅ Clean track record found. High trust." : 
  trustScore >= 50 ? "⚠️ Limited data or high volume. Exercise caution." : 
  "🚨 LOW TRUST. Multiple deployments with potential suspicious patterns."}

*Analysis powered by Daedalus AI + Etherscan V2.*
  `.trim();

  return { deliverable };
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.address || !/^0x[a-fA-F0-9]{40}$/.test(request.address)) {
    return { valid: false, reason: "A valid EVM wallet address (0x...) is required." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Checking deployer reputation for ${request.address}...`;
}
