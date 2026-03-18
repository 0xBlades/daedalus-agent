import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function getGoPlusData(token: string, chainId: string) {
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${token}`);
    const data = await res.json() as any;
    return data.result?.[token.toLowerCase()] || data.result?.[token] || null;
  } catch (e) { return null; }
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const token = request.token;
  const chain = request.chain || "8453"; // Default base

  console.log(`[quick_scan] Scanning token ${token} on chain ${chain}`);

  const security = await getGoPlusData(token, chain);
  
  if (!security) {
    return { deliverable: `Error: Could not retrieve security data for ${token}. Either the contract address is invalid or the GoPlus API is down.` };
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
${riskLevel === "LOW" ? "✅ Looks safe for basic interactions, but always DYOR." : 
  riskLevel === "MEDIUM" ? "⚠️ Exercise caution. Some suspicious flags detected." : 
  "🚨 BEWARE. High risk of rugpull or honeypot."}

*Scan powered by Daedalus AI + GoPlus Security.*
  `.trim();

  return { deliverable };
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.token) return { valid: false, reason: "A token contract address is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Scanning security for token ${request.token}...`;
}
