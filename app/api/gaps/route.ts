import { jsonRoute, PromptError, readData, runPrompt } from "@/lib/claude";
import { isLetterType, UNKNOWN, type GapsResult } from "@/lib/types";

export const maxDuration = 60;

type Body = { letter_type?: unknown; input?: unknown; facts?: unknown; language?: unknown };

const short = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const POST = jsonRoute<Body>(async (body, ctx) => {
  if (!isLetterType(body.letter_type)) throw new PromptError("Bitte eine Schreibenart wählen.", 400);
  const required = await readData<Record<string, string[]>>("required_fields.json");
  const input = typeof body.input === "string" ? body.input.slice(0, 12000) : "";
  // Demo-Modus: a Polish input gets the prepared Polish questions (only exists for Behinderung).
  const polish = /[ąćęłńśźż]/i.test(input);
  // Language of the input: from the router (ISO code), else Polish letters, else the model decides.
  const given = typeof body.language === "string" && /^[a-z]{2,3}$/.test(body.language) ? body.language : "";
  const inputLanguage = given || (polish ? "pl" : "");
  const result = await runPrompt<GapsResult>(
    "gaps",
    {
      letter_type: body.letter_type,
      user_input: input,
      facts: body.facts ?? {},
      required_fields: required[body.letter_type] ?? [],
      input_language: inputLanguage
        ? `${inputLanguage} (ISO-Code). Schreibe "question", "example", "intro" und "unknown_label" in DIESER Sprache${inputLanguage === "de" ? "" : " – NICHT auf Deutsch"}.`
        : "Erkenne die Sprache der Situationsbeschreibung und schreibe \"question\", \"example\", \"intro\" und \"unknown_label\" in dieser Sprache.",
    },
    {
      mockVariant: polish && body.letter_type === "behinderung" ? "behinderung-pl" : body.letter_type,
      effort: "low",
      fast: true,
      mock: ctx.mock, settings: ctx.settings,
      // Questions in German although the input is not → one retry with a clear note.
      validate: (r) =>
        inputLanguage && inputLanguage !== "de" && (r as Partial<GapsResult>)?.language === "de"
          ? `Die Eingabe ist auf "${inputLanguage}". Schreibe "question", "example", "intro" und "unknown_label" in dieser Sprache, nicht auf Deutsch; setze "language" auf "${inputLanguage}".`
          : null,
    },
  );
  const questions = Array.isArray(result.questions) ? result.questions.slice(0, 6) : [];
  return {
    complete: questions.length === 0,
    questions: questions.map((q) => ({
      field: String(q?.field ?? ""),
      question: String(q?.question ?? ""),
      example: String(q?.example ?? ""),
    })),
    // Rückfragen page in the language of the input (teil3 Teil 1); German defaults.
    language: short(result.language, 8) || inputLanguage || "de",
    intro: short(result.intro, 200),
    unknown_label: short(result.unknown_label, 40) || UNKNOWN,
  } satisfies GapsResult;
});
