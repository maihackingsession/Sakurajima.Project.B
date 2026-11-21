import { jsonRoute, requireText, runPrompt } from "@/lib/claude";
import { isLetterType, OUTCOMES, type Outcome, type RouterResult } from "@/lib/types";

export const maxDuration = 60;

// Demo-Modus only: crude keyword guess so the mock answer fits the typed situation.
function guess(text: string): Pick<RouterResult, "intent" | "letter_type"> & { outcome?: Outcome; reason?: string } {
  const t = text.toLowerCase();
  if (/unser(?:e|en|em)? (?:eigene[rn]? )?(?:kran|bagger|kolonne|leute|polier)|eigene[rn]? (?:kran|bagger|kolonne|leute)|krank/.test(t))
    return { intent: "letter", letter_type: "behinderung", outcome: "eigener_bereich", reason: "Eigenes Gerät oder eigenes Personal – die Ursache liegt möglicherweise in Ihrem eigenen Bereich." };
  if (/keine auswirkung|ohne auswirkung|im plan|puffer|kein verzug/.test(t))
    return { intent: "letter", letter_type: "behinderung", outcome: "keine_anzeige", reason: "Laut Beschreibung keine Auswirkung auf Termine oder Kosten." };
  if (/tagesbericht|bautagebuch|wetter:|anwesend/.test(t)) return { intent: "deviation", letter_type: null };
  if (/protokoll|top \d|^von:|^betreff:|zusammenfass/m.test(t)) return { intent: "summary", letter_type: null };
  if (/mangel|mängel|riss|undicht|nacharbeit|beseitigung|falsch verlegt|nicht ordentlich|nicht bestanden|hinterfüllt|fehlerhaft/.test(t)) return { intent: "letter", letter_type: "maengel" };
  if (/bedenken|ungeeignet|nicht ausreichend|zu gering|zu wenig|passt nicht|nicht geeignet|zweifel/.test(t)) return { intent: "letter", letter_type: "bedenken" };
  if (/zusätzlich|mehrkosten|nachtrag|angeordnet|angewiesen|änderung|will jetzt|andere|nicht im lv/.test(t)) return { intent: "letter", letter_type: "mehrkosten" };
  return { intent: "letter", letter_type: "behinderung" };
}

export const POST = jsonRoute<{ input?: unknown }>(async (body, ctx) => {
  const input = requireText(body.input, "eine Beschreibung");
  const result = await runPrompt<RouterResult>(
    "router",
    { user_input: input },
    {
      effort: "low",
      fast: true,
      mock: ctx.mock,
      mockTransform: (m) => {
        const g = guess(input);
        const mock = m as RouterResult;
        // The prepared facts belong to the demo story (Behinderung); other types start without facts.
        const facts = g.letter_type === "behinderung" && !g.outcome ? mock.facts : {};
        return { ...mock, outcome: "anzeige", ...g, facts };
      },
    },
  );
  const intent = ["letter", "deviation", "summary"].includes(result.intent) ? result.intent : "letter";
  return {
    intent,
    letter_type: isLetterType(result.letter_type) ? result.letter_type : null,
    outcome: OUTCOMES.includes(result.outcome) ? result.outcome : "anzeige",
    facts: result.facts && typeof result.facts === "object" ? result.facts : {},
    reason: typeof result.reason === "string" ? result.reason : "",
  } satisfies RouterResult;
});
