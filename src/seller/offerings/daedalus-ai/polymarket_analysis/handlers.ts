import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchSearchData(topic: string, apiKey: string) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${topic} latest news updates expert predictions probability`,
        search_depth: "basic",
        max_results: 5
      }),
    });
    const data = await res.json() as any;
    return data.results || [];
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
      "X-Title": "Daedalus AI Polymarket Analysis",
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

function buildPrompt(event: string, odds: string, results: any[]): string {
  const context = results.map(r => `- ${r.title}: ${r.content}`).join("\n");

  return `You are Daedalus AI — Prediction Market Architect.
Event: **${event}** | Current Odds: **${odds}**
Real-world Context:
${context}

Analyze if the market odds correctly reflect reality. Be detailed but concise (save tokens). 
Format:
# 🎲 Polymarket Analysis: ${event}
**Verdict:** [🚨 AVOID / 🟡 NEUTRAL / 🟢 BUY 'YES']

## 📊 Alpha Thesis
Concise reasoning for the verdict based on current news vs market odds.

## ⚖️ Mispricing Score
[0-100] (How far off is the market?)

## 🎯 Target Probability
Suggested real-world probability (%)

⚠️ Disclaimer: Prediction markets carry high risk. Not financial advice.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const event = request.event_name;
  const odds = request.current_odds;
  const tavilyKey = process.env.TAVILY_API_KEY;

  console.log(`[polymarket_analysis] Analyzing "${event}" | Odds: ${odds}`);

  try {
    let context = [];
    if (tavilyKey) {
      context = await fetchSearchData(event, tavilyKey);
    }

    const deliverable = await callOpenRouter(buildPrompt(event, odds, context));
    return { deliverable };
  } catch (err: any) {
    console.error(`[polymarket_analysis] Error: ${err.message}`);
    return { deliverable: `⚠️ Analysis Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.event_name || !request.current_odds) {
    return { valid: false, reason: "Event name and current market odds are required." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Building alpha thesis for "${request.event_name}"...`;
}
