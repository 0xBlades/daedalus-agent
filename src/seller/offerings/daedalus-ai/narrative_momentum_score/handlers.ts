import type { ExecuteJobResult, ValidationResult } from "../../../runtime/offeringTypes.js";

async function fetchTavilySearch(topic: string, apiKey: string) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${topic} crypto token narrative social sentiment latest news`,
        search_depth: "basic",
        include_answer: false,
        max_results: 5
      }),
    });
    const data = await res.json() as any;
    return data.results || [];
  } catch (e) {
    console.error(`[narrative_momentum_score] Tavily Error: ${e}`);
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
      "X-Title": "Daedalus AI Narrative Score",
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

function buildPrompt(topic: string, period: string, searchResults: any[]): string {
  const context = searchResults.length > 0 
    ? searchResults.map(r => `- ${r.title}: ${r.content}`).join("\n") 
    : "No recent web results found.";

  return `You are Daedalus AI — Market Narrative Scout.
Topic: **${topic}** | Period: **${period}**
Live Search Context:
${context}

Analyze the narrative velocity and social momentum based on the live context provided. Format:
# 🌊 Narrative Momentum: ${topic}
**Momentum Score: [0-100]** (Velocity/Strength)

## 💹 Sentiment Breakdown
Analyze Bullish vs. Bearish signals from the recent news/social data.

## 🚀 Viral Catalysts
Identify upcoming triggers or recent massive events (news, big accounts tweeting, partners).

## 📊 Momentum Trend
Is the narrative Peaking, Emerging, or Fading?

⚠️ Disclaimer: Not financial advice. Analyzes real-time search data.`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const topic = request.topic;
  const period = request.period || "24h";
  const tavilyKey = process.env.TAVILY_API_KEY;

  console.log(`[narrative_momentum_score] Scouting ${topic} with Tavily`);

  try {
    let searchResults = [];
    if (tavilyKey) {
      searchResults = await fetchTavilySearch(topic, tavilyKey);
    }

    const deliverable = await callOpenRouter(buildPrompt(topic, period, searchResults));
    return { deliverable };
  } catch (err: any) {
    console.error(`[narrative_momentum_score] Error: ${err.message}`);
    return { deliverable: `⚠️ Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic) return { valid: false, reason: "A topic or token symbol is required." };
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Analyzing live narrative momentum for ${request.topic}...`;
}
