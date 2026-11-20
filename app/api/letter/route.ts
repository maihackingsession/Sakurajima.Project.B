import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LETTER_SCHEMA, LETTER_TYPES, type Letter } from "@/app/lib/letter";

// HANDOVER §4: default a Sonnet model; override via env if credits differ.
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: { input?: unknown; letterType?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("Ungültige Anfrage.", 400);
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const letterType = body.letterType;
  if (!input) return fail("Bitte beschreiben Sie die Situation.", 400);
  if (input.length > 8000) return fail("Text ist zu lang (max. 8000 Zeichen).", 400);
  if (typeof letterType !== "string" || !(LETTER_TYPES as readonly string[]).includes(letterType)) {
    return fail("Bitte wählen Sie eine Schreibenart.", 400);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("Kein API-Schlüssel konfiguriert (ANTHROPIC_API_KEY).", 500);
  }

  const template = await readFile(path.join(process.cwd(), "prompts", "letter.xml"), "utf8");
  const prompt = template
    .replaceAll("{letter_type}", letterType)
    .replaceAll("{user_input}", input);

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: LETTER_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return fail("Die Anfrage wurde abgelehnt. Bitte Eingabe umformulieren.", 422);
    }
    if (response.stop_reason === "max_tokens") {
      return fail("Antwort wurde abgeschnitten. Bitte erneut versuchen.", 502);
    }

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const letter = JSON.parse(text) as Letter;
    return Response.json(letter);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return fail("API-Schlüssel ungültig.", 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail("Zu viele Anfragen. Bitte kurz warten.", 429);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      return fail("Fehler bei der KI-Anfrage. Bitte erneut versuchen.", 502);
    }
    if (error instanceof SyntaxError) {
      return fail("Antwort der KI war kein gültiges JSON.", 502);
    }
    throw error;
  }
}
