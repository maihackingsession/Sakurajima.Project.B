import { jsonRoute, PromptError, runPrompt } from "@/lib/claude";
import { isLetterType, type Letter } from "@/lib/types";

export const maxDuration = 60;

type Body = { letter_type?: unknown; input?: unknown; facts?: unknown; answers?: unknown };

export const POST = jsonRoute<Body>(async (body) => {
  if (!isLetterType(body.letter_type)) throw new PromptError("Bitte eine Schreibenart wählen.", 400);
  const input = typeof body.input === "string" ? body.input.trim().slice(0, 12000) : "";
  const letter = await runPrompt<Partial<Letter>>(
    "letter",
    {
      letter_type: body.letter_type,
      user_input: input || "(keine Beschreibung)",
      facts: body.facts ?? {},
      answers: body.answers ?? {},
    },
    { mockVariant: body.letter_type, effort: "medium" },
  );
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    subject: str(letter.subject),
    recipient: str(letter.recipient),
    salutation: str(letter.salutation) || "Sehr geehrte Damen und Herren,",
    body: str(letter.body),
    closing: str(letter.closing) || "Mit freundlichen Grüßen",
    legal_basis: str(letter.legal_basis),
    deadline_hint: str(letter.deadline_hint),
    missing: Array.isArray(letter.missing) ? letter.missing.map(String) : [],
  } satisfies Letter;
});
