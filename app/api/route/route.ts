import { jsonRoute, requireText, runPrompt } from "@/lib/claude";
import { isLetterType, type RouterResult } from "@/lib/types";

export const maxDuration = 60;

// Demo-Modus only: crude keyword guess so the mock answer fits the typed situation.
function guess(text: string): Pick<RouterResult, "intent" | "letter_type"> {
  const t = text.toLowerCase();
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
      mockTransform: (m) => ({ ...(m as RouterResult), ...guess(input) }),
    },
  );
  const intent = ["letter", "deviation", "summary"].includes(result.intent) ? result.intent : "letter";
  return {
    intent,
    letter_type: isLetterType(result.letter_type) ? result.letter_type : null,
    facts: result.facts && typeof result.facts === "object" ? result.facts : {},
    reason: typeof result.reason === "string" ? result.reason : "",
  } satisfies RouterResult;
});
