import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fillDates, formatDate, today } from "./dates";

// One helper for every specialist prompt (HANDOVER §4: plain functions, no frameworks).
// Without ANTHROPIC_API_KEY it returns mocks from data/mocks/ (Demo-Modus).

const ROOT = process.cwd();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// Router and gaps run on the fast model (short JSON answers); letters stay on MODEL.
const FAST_MODEL = process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-5-5";

export class PromptError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export function isMockMode() {
  return !process.env.ANTHROPIC_API_KEY;
}

/** Reads data/<rel> and fills relative demo dates ({T}, {T+1} …, see lib/dates.ts). */
export async function readData<T = unknown>(rel: string): Promise<T> {
  return JSON.parse(fillDates(await readFile(path.join(ROOT, "data", rel), "utf8"))) as T;
}

async function exists(file: string) {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

function stringify(v: unknown) {
  return typeof v === "string" ? v : JSON.stringify(v, null, 2);
}

/** Pulls the first JSON object out of a reply, tolerating ```json fences and stray prose. */
export function parseJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new SyntaxError("no json");
  }
}

type Options = {
  /** Mock variant: tries data/mocks/<name>-<variant>.json first, then <name>.json. */
  mockVariant?: string;
  /** Lets a route tweak the mock (e.g. router keyword detection in demo mode). */
  mockTransform?: (mock: unknown) => unknown;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Use ANTHROPIC_FAST_MODEL (router, gaps). */
  fast?: boolean;
  /** Beispielmodus (?beispiel=1): prepared answers instead of Claude, even with an API key. */
  mock?: boolean;
  /** Checks the parsed reply; a returned message triggers the one retry with that message, then an error. */
  validate?: (reply: unknown) => string | null;
};

/** Server log for a failed AI call: route and error type only (never the key, never the user text). */
function logAiError(name: string, kind: string, status?: number) {
  console.error(`[ki] route=${name} fehler=${kind}${status ? ` status=${status}` : ""}`);
}

/**
 * Loads prompts/<name>.xml, fills {placeholders} and returns the parsed JSON reply.
 * Placeholders: {project_context} and {today} are filled automatically; every key in
 * `input` fills {key} (objects are inserted as JSON).
 */
export async function runPrompt<T>(
  name: string,
  input: Record<string, unknown>,
  opts: Options = {},
): Promise<T> {
  if (opts.mock || isMockMode()) {
    await new Promise((r) => setTimeout(r, 900));
    const variant = opts.mockVariant && path.join(ROOT, "data", "mocks", `${name}-${opts.mockVariant}.json`);
    const file = variant && (await exists(variant)) ? variant : path.join(ROOT, "data", "mocks", `${name}.json`);
    const mock = JSON.parse(fillDates(await readFile(file, "utf8")));
    return (opts.mockTransform ? opts.mockTransform(mock) : mock) as T;
  }

  const template = await readFile(path.join(ROOT, "prompts", `${name}.xml`), "utf8");
  const values: Record<string, unknown> = {
    project_context: await readData("project.json"),
    today: formatDate(today()),
    ...input,
  };
  const prompt = template.replace(/\{([a-z_]+)\}/g, (match, key: string) =>
    key in values ? stringify(values[key]) : match,
  );

  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

  const model = opts.fast ? FAST_MODEL : MODEL;
  // Server-side refusal fallback exists for Sonnet/Opus/Fable, not for Haiku.
  // No temperature: current models reject non-default sampling values (400).
  const fallback = /haiku/i.test(model)
    ? {}
    : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      const response = await client.beta.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 8000,
        ...fallback,
        output_config: { effort: opts.effort ?? "medium" },
        messages,
      });
      if (response.stop_reason === "refusal") {
        throw new PromptError("Die KI hat die Anfrage abgelehnt. Bitte Eingabe umformulieren.", 422);
      }
      if (response.stop_reason === "max_tokens") {
        throw new PromptError("Die Antwort der KI war zu lang und wurde abgeschnitten. Bitte erneut versuchen.");
      }
      text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } catch (error) {
      if (error instanceof PromptError) {
        logAiError(name, error.status === 422 ? "refusal" : "max_tokens");
        throw error;
      }
      if (error instanceof Anthropic.AuthenticationError) {
        logAiError(name, "auth", 401);
        throw new PromptError("API-Schlüssel ungültig.", 500);
      }
      if (error instanceof Anthropic.RateLimitError) {
        logAiError(name, "rate_limit", 429);
        throw new PromptError("Zu viele Anfragen. Bitte kurz warten.", 429);
      }
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        logAiError(name, "timeout");
        throw new PromptError("Die KI hat zu lange gebraucht. Bitte erneut versuchen.", 504);
      }
      if (error instanceof Anthropic.APIError) {
        logAiError(name, "api_error", error.status);
        throw new PromptError("Fehler bei der KI-Anfrage. Bitte erneut versuchen.");
      }
      logAiError(name, "connection");
      throw error;
    }

    // Invalid JSON or a reply that fails `validate`: one retry with the reason, then an error.
    let problem: string | null;
    try {
      const reply = parseJson(text);
      problem = opts.validate?.(reply) ?? null;
      if (!problem) return reply as T;
    } catch {
      problem = "Deine Antwort war kein gültiges JSON.";
    }
    if (attempt === 0) console.warn(`[ki] route=${name} wiederholung=ungueltige_antwort`);
    messages.push(
      { role: "assistant", content: text || "(leer)" },
      { role: "user", content: `${problem} Antworte jetzt ausschließlich mit dem JSON-Objekt im verlangten Format, ohne weiteren Text.` },
    );
  }
  logAiError(name, "invalid_json");
  throw new PromptError("Die Antwort der KI war kein gültiges JSON. Bitte erneut versuchen.");
}

/** Wraps a POST handler: JSON in, JSON out, always `{error}` in German on failure. */
export type RouteContext = { mock: boolean };

export function jsonRoute<B>(handler: (body: B, ctx: RouteContext) => Promise<unknown>) {
  return async (request: Request) => {
    const ctx = { mock: request.headers.get("x-beispiel") === "1" };
    let body: B;
    try {
      body = (await request.json()) as B;
    } catch {
      return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    try {
      return Response.json(await handler(body, ctx));
    } catch (error) {
      if (error instanceof PromptError) return Response.json({ error: error.message }, { status: error.status });
      console.error(error);
      return Response.json({ error: "Unerwarteter Fehler. Bitte erneut versuchen." }, { status: 500 });
    }
  };
}

export function requireText(v: unknown, what = "Text", max = 12000): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new PromptError(`Bitte ${what} eingeben.`, 400);
  if (s.length > max) throw new PromptError(`Text ist zu lang (max. ${max} Zeichen).`, 400);
  return s;
}
