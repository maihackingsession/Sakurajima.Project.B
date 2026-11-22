import { jsonRoute, PromptError, requireText, runPrompt, type RouteContext } from "@/lib/claude";
import type { Settings } from "@/lib/settings";
import { LETTER_TYPES, type LetterType, type RouterResult } from "@/lib/types";

export const maxDuration = 60;

/** Router output (prompts/router.xml v3): one strict enum, "keine" = no notice. */
const ROUTER_TYPES = [...LETTER_TYPES, "keine"] as const;
type RouterType = (typeof ROUTER_TYPES)[number];
type RouterReply = { type: RouterType; confidence?: unknown; reason?: unknown; language?: unknown; facts?: unknown };

/** Sample/project facts that must never appear in a reason unless the input says them (FIX_PROMPT_ROUTER 2.3). */
const LEAK_WORDS = [/bodenplatte/i, /bewehrungspl[aä]n/i, /kraus/i, /lindner/i, /berger/i, /jagtap/i, /schneider/i];

function leakedWords(reason: string, input: string) {
  return LEAK_WORDS.filter((re) => re.test(reason) && !re.test(input)).map((re) => re.source);
}

function validate(reply: unknown) {
  const r = reply as Partial<RouterReply> | null;
  if (!r || typeof r !== "object") return "Deine Antwort war kein JSON-Objekt.";
  if (!ROUTER_TYPES.includes(r.type as RouterType)) return `"type" muss genau einer dieser Werte sein: ${ROUTER_TYPES.join(", ")}.`;
  return null;
}

// Minimal project meta only: no participant names, no schedule, no samples.
const projectMeta = (s: Settings) => `Projekt: ${s.projekt.bezeichnung}. "Wir" = Auftragnehmer (Bauunternehmen des Bauleiters). "Auftraggeber"/"Bauherr" = unser Vertragspartner; Architekt/Planer gehören zum Auftraggeber. "Nachunternehmer"/"Subunternehmer" = von uns beauftragte Firmen.`;

// Demo-Modus only (no API key): crude keyword guess, no prepared facts.
function guess(text: string): RouterReply {
  const t = text.toLowerCase();
  const language = /[ąćęłńśźż]|\bnie\b/.test(t) ? "pl" : "de";
  const r = (type: RouterType, reason: string): RouterReply => ({ type, reason, confidence: 0.5, language, facts: {} });
  if (/\b(?:lv|vertragsmenge)\b\D{0,6}\d/.test(t) && /tatsächlich|aufmaß|ausgeführt|voraussichtlich|werden es/.test(t) && !/angeordnet/.test(t))
    return r("mengenaenderung", "Die Menge einer LV-Position weicht ohne Anordnung deutlich von der Vertragsmenge ab.");
  if (/unser(?:e|en|em)? (?:eigene[rn]? )?(?:kran|bagger|kolonne|leute|polier)|selbst falsch|krank/.test(t)) return r("keine", "Ursache im eigenen Bereich – keine Anzeige an den Auftraggeber.");
  if (/nachunternehmer|subunternehmer/.test(t) && /mangel|mängel|schief|hohl|offen|riss|fehlerhaft|nicht ordentlich/.test(t)) return r("maengel", "Unser Nachunternehmer hat mangelhaft gearbeitet.");
  if (/angeordnet|zusätzlich|statt|nicht im lv|nachtrag|not in our contract|will .* jetzt/.test(t)) return r("mehrkosten", "Der Auftraggeber verlangt eine zusätzliche oder geänderte Leistung.");
  if (/bedenken|ungeeignet|zu flach|zu feucht|feuchte|widersprechen|halten wir/.test(t)) return r("bedenken", "Bedenken gegen die vorgesehene Ausführung.");
  if (/nicht fertig|gesperrt|nicht geliefert|fehlen|können nicht|kann nicht|nie przekazał|nie dotarły|stoi|warten/.test(t)) return r("behinderung", "Die Arbeit kann aus Gründen außerhalb unseres Bereichs nicht wie geplant laufen.");
  return r("keine", "Normaler Baufortschritt – keine Anzeige nötig.");
}

async function ask(input: string, date: string, ctx: RouteContext, retryNote: string) {
  return runPrompt<RouterReply>(
    "router",
    { user_input: input, entry_date: date || "unbekannt", project_meta: projectMeta(ctx.settings), retry_note: retryNote },
    { effort: "low", fast: true, maxTokens: 1000, mock: ctx.mock, validate, mockTransform: () => guess(input) },
  );
}

export const POST = jsonRoute<{ input?: unknown; date?: unknown }>(async (body, ctx) => {
  const input = requireText(body.input, "eine Beschreibung");
  const date = typeof body.date === "string" ? body.date.slice(0, 20) : "";
  let reply = await ask(input, date, ctx, "");
  if (validate(reply)) throw new PromptError("Die Antwort der KI war ungültig. Bitte erneut versuchen.");

  // Leakage check: a reason naming sample facts that are not in the input → one retry, then a warning.
  if (leakedWords(String(reply.reason ?? ""), input).length) {
    console.warn("[ki] route=router wiederholung=fremde_fakten");
    const again = await ask(input, date, ctx, "- Nenne nur Fakten aus der Eingabe.");
    if (!validate(again)) reply = again;
    const still = leakedWords(String(reply.reason ?? ""), input);
    if (still.length) console.warn(`[ki] route=router warnung=fremde_fakten woerter=${still.join(",")}`);
  }

  const isNotice = reply.type !== "keine";
  const facts = reply.facts && typeof reply.facts === "object" && !Array.isArray(reply.facts) ? (reply.facts as Record<string, unknown>) : {};
  const confidence = Number(reply.confidence);
  return {
    intent: "letter",
    letter_type: isNotice ? (reply.type as LetterType) : null,
    outcome: isNotice ? "anzeige" : "keine_anzeige",
    facts: isNotice ? facts : {},
    reason: typeof reply.reason === "string" ? reply.reason : "",
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
    language: typeof reply.language === "string" ? reply.language : "",
  } satisfies RouterResult;
});
