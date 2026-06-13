/**
 * Optional LLM reading. Works if ANTHROPIC_API_KEY is set (preferred,
 * official SDK) or OPENAI_API_KEY (fallback, plain fetch). With neither,
 * returns 503 and the UI degrades gracefully — the template is fully
 * functional charts-only.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "../../../lib/prompt";
import type { Chart } from "caelus";

export async function POST(req: Request): Promise<Response> {
  let chart: Chart;
  try {
    ({ chart } = await req.json());
    if (!chart?.bodies?.sun) throw new Error();
  } catch {
    return Response.json({ error: "POST a JSON body: { chart }" }, { status: 400 });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const msg = await client.messages.create({
        // haiku: chosen for cost — a 250-word reading doesn't need a frontier
        // model. Swap for a bigger model if you extend the prompt.
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(chart) }],
      });
      const text = msg.content.find((b) => b.type === "text");
      return Response.json({ reading: text?.text ?? "", provider: "anthropic" });
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        return Response.json({ error: `Reading failed (${e.status})` }, { status: 502 });
      }
      throw e;
    }
  }

  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(chart) },
        ],
      }),
    });
    if (!res.ok) return Response.json({ error: `Reading failed (${res.status})` }, { status: 502 });
    const data = await res.json();
    return Response.json({ reading: data.choices?.[0]?.message?.content ?? "", provider: "openai" });
  }

  return Response.json(
    { error: "No API key configured — set ANTHROPIC_API_KEY (or OPENAI_API_KEY) to enable readings." },
    { status: 503 },
  );
}
