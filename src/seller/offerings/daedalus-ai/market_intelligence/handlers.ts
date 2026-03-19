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
      "X-Title": "Daedalus AI Market Intelligence",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response.");
  
  return content;
}

function buildPrompt(topic: string, questions?: string): string {
  return `You are Daedalus AI — Elite Crypto Intelligence Analyst.
Report requested for: **${topic}**
Specific inquiries: ${questions || "Full market deep-dive."}

Provide a high-fidelity intelligence report. Format:
# 🏛️ Market Intelligence: ${topic}
**Executive Summary**

## 🗺️ Ecosystem & Market Landscape
Analyze the project/ticker position, liquidity depth, and narrative fit.

## 🕵️ On-Chain Intelligence
Track Smart Money flows, holder distribution, and recent whale activity.

## 🛡️ Risk & Security Audit
Analyze potential vulnerabilities, developer history, and contract robustness.

## 🏛️ Architect's Conclusion
Final verdict on the project's long-term sustainability vs. short-term momentum.

⚠️ Disclaimer: Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const topic = request.topic || "Base Ecosystem";
  const questions = request.specific_questions;

  console.log(`[market_intelligence] Analyzing ${topic}`);

  try {
    const deliverable = await callOpenRouter(buildPrompt(topic, questions));
    return { deliverable };
  } catch (err: any) {
    console.error(`[market_intelligence] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic) return { valid: false, reason: "A topic or token symbol is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Generating premium intelligence report for ${request.topic}...`;
}
