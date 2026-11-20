import { jsonRoute, PromptError, readData, runPrompt } from "@/lib/claude";
import { isLetterType, type GapsResult } from "@/lib/types";

export const maxDuration = 60;

type Body = { letter_type?: unknown; input?: unknown; facts?: unknown };

export const POST = jsonRoute<Body>(async (body) => {
  if (!isLetterType(body.letter_type)) throw new PromptError("Bitte eine Schreibenart wählen.", 400);
  const required = await readData<Record<string, string[]>>("required_fields.json");
  const result = await runPrompt<GapsResult>(
    "gaps",
    {
      letter_type: body.letter_type,
      user_input: typeof body.input === "string" ? body.input.slice(0, 12000) : "",
      facts: body.facts ?? {},
      required_fields: required[body.letter_type] ?? [],
    },
    { mockVariant: body.letter_type, effort: "low" },
  );
  const questions = Array.isArray(result.questions) ? result.questions.slice(0, 4) : [];
  return {
    complete: questions.length === 0,
    questions: questions.map((q) => ({
      field: String(q?.field ?? ""),
      question: String(q?.question ?? ""),
      example: String(q?.example ?? ""),
    })),
  } satisfies GapsResult;
});
