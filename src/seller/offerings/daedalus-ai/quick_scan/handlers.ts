import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function getGoPlusData(token: string, chain: string) {
  // Map common names to numeric IDs for GoPlus
  const chainIdMap: Record<string, string> = {
    "ethereum": "1",
    "eth": "1",
    "1": "1",
    "bsc": "56",
    "56": "56",
    "base": "8453",
    "8453": "8453",
    "arbitrum": "42161",
    "42161": "42161",
    "optimism": "10",
    "10": "10",
    "polygon": "137",
    "137": "137",
    "avalanche": "43114",
    "43114": "43114",
    "linea": "59144",
    "59144": "59144",
    "solana": "solana",
    "sol": "solana"
  };

  const chainId = chainIdMap[chain.toLowerCase()] || chain;
  
  try {
    const url = `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${token}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    
    console.log(`[quick_scan] GoPlus API Log - Status: ${data.code}, Message: ${data.message}`);
    
    if (data.code !== 1) {
      console.error(`[quick_scan] GoPlus Error: ${data.message}`);
      return null;
    }
    
    return data.result?.[token.toLowerCase()] || data.result?.[token] || null;
  } catch (e: any) { 
    console.error(`[quick_scan] GoPlus Fetch Exception: ${e.message}`);
    return null; 
  }
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const token = (request.token || "").trim().toLowerCase();
  const chain = request.chain || "8453";

  console.log(`[quick_scan] Scanning token ${token} on chain ${chain}`);

  try {
    const security = await getGoPlusData(token, chain);
    
    if (!security) {
      return { deliverable: `⚠️ Error: Could not retrieve security data for ${token}. Either the contract address is invalid on the specified chain (${chain}) or the GoPlus API is down.` };
    }

    // Calculate Risk Score (simplified heuristic)
    let score = 0;
    const flags: string[] = [];
    
    if (security.is_honeypot === "1") { score += 100; flags.push("🚨 HONEYPOT DETECTED"); }
    if (security.is_blacklisted === "1") { score += 50; flags.push("🚩 Blacklist function found"); }
    if (security.is_mintable === "1") { score += 20; flags.push("⚠️ Mintable contract"); }
    if (security.is_proxy === "1") { score += 15; flags.push("⚠️ Proxy/Upgradable contract"); }
    if (security.hidden_owner === "1") { score += 30; flags.push("🚩 Hidden owner found"); }
    if (security.can_take_back_ownership === "1") { score += 25; flags.push("🚩 Ownership can be taken back"); }
    if (security.cannot_sell_all === "1") { score += 40; flags.push("🚩 Selling limit detected"); }
    
    const buyTax = parseFloat(security.buy_tax || "0") * 100;
    const sellTax = parseFloat(security.sell_tax || "0") * 100;
    if (buyTax > 10) { score += 15; flags.push(`⚠️ High Buy Tax (${buyTax.toFixed(1)}%)`); }
    if (sellTax > 10) { score += 15; flags.push(`⚠️ High Sell Tax (${sellTax.toFixed(1)}%)`); }

    const riskScore = Math.min(100, score);
    const riskLevel = riskScore > 70 ? "CRITICAL" : riskScore > 40 ? "HIGH" : riskScore > 15 ? "MEDIUM" : "LOW";

    const deliverable = `
# 🛡️ Quick Scan: ${security.token_name || "Unknown"} (${security.token_symbol || "???"})
**Address:** \`${token}\`

## 📊 Safety Report
- **Risk Score**: ${riskScore}/100
- **Risk Level**: **${riskLevel}**

## 🚩 Security Flags
${flags.length > 0 ? flags.map(f => `- ${f}`).join("\n") : "- ✅ No major risks detected"}

## 🔎 Technical Details
- **Creator Address**: \`${security.creator_address || "N/A"}\`
- **Owner Address**: \`${security.owner_address || "None/Renounced"}\`
- **Buy Tax**: ${buyTax.toFixed(1)}%
- **Sell Tax**: ${sellTax.toFixed(1)}%
- **Is Open Source**: ${security.is_open_source === "1" ? "✅ Yes" : "❌ No"}
- **Is Honeypot**: ${security.is_honeypot === "1" ? "🚨 YES" : "✅ No"}

## 🎯 Verdict
${riskLevel === "LOW" ? "✅ Looks safe for basic interactions, but selalu DYOR." : 
  riskLevel === "MEDIUM" ? "⚠️ Gunakan dengan hati-hati. Ada beberapa indikator mencurigakan." : 
  "🚨 WASPADA. Risiko tinggi indikasi rugpull atau honeypot."}

*Scan powered by Daedalus AI + GoPlus Security.*
    `.trim();

    return { deliverable };
  } catch (err: any) {
    console.error(`[quick_scan] Fatal Job Error: ${err.message}`);
    return { deliverable: `⚠️ Critical Scan Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.token) return { valid: false, reason: "A token contract address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scanning security for token ${request.token}...`;
}
