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
      "X-Title": "Daedalus AI Content Architect",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: "You are Daedalus AI — The Content Architect. You specialize in high-signal, professional, and viral crypto content." }, { role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await response.json() as any;
  if (data.error) throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No AI response.";
}

function buildPrompt(topic: string, style: string, context?: string, audience?: string): string {
  return `Construct a high-quality tweet about: **${topic}**
Style: **${style}**
${context ? `Additional Context: ${context}` : ""}
${audience ? `Target Audience: ${audience}` : ""}

Requirements:
- Character limit: Under 280 characters.
- Maintain the persona of 'Daedalus AI' — sophisticated, data-driven, and slightly mysterious.
- Include 1-2 relevant hashtags.
- Include a specific 'Optimal Posting Recommendation' (Hour/Time) based on the target audience and style.

Format:
# ✍️ Content Architecture: ${topic}
[Tweet Content Here]

---
📅 **Posting Recommendation:**
[Suggested Time/Hour + Reasoning]`;
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { topic, style, context, target_audience } = request;

  console.log(`[tweet_generator] Architecting content for topic: ${topic} (${style})`);

  try {
    const deliverable = await callOpenRouter(buildPrompt(topic, style, context, target_audience));
    return { deliverable };
  } catch (err: any) {
    console.error(`[tweet_generator] Error: ${err.message}`);
    return { deliverable: `⚠️ Architecture Error: ${err.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.topic || !request.style) {
    return { valid: false, reason: "Topic and Style are required fields." };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Architecting your ${request.style} tweet about ${request.topic}...`;
}
