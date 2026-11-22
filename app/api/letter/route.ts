import { jsonRoute, PromptError, runPrompt } from "@/lib/claude";
import { signer } from "@/lib/settings";
import { mengenBlocker, mengenCalc, mengenPromptBlock } from "@/lib/mengen";
import { stripDraftLines, stripDraftSubject, stripSignoff } from "@/lib/text";
import { isLetterType, UNKNOWN, type Letter } from "@/lib/types";

export const maxDuration = 60;

type Body = { letter_type?: unknown; input?: unknown; facts?: unknown; answers?: unknown };

export const POST = jsonRoute<Body>(async (body, ctx) => {
  if (!isLetterType(body.letter_type)) throw new PromptError("Bitte eine Schreibenart wählen.", 400);
  const input = typeof body.input === "string" ? body.input.trim().slice(0, 12000) : "";
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  // Mengenänderung: the code calculates; the AI only gets the fixed numbers (and no letter at <= 10 % or without unit prices).
  let mengen = "";
  if (body.letter_type === "mengenaenderung") {
    const calc = mengenCalc(input, obj(body.facts), obj(body.answers));
    const blocked = mengenBlocker(calc);
    if (blocked) throw new PromptError(blocked, 400);
    mengen = mengenPromptBlock(calc);
  }
  const letter = await runPrompt<Partial<Letter>>(
    "letter",
    {
      letter_type: body.letter_type,
      user_input: input || "(keine Beschreibung)",
      facts: body.facts ?? {},
      answers: body.answers ?? {},
      mengen,
    },
    {
      mockVariant: body.letter_type,
      effort: "medium",
      mock: ctx.mock, settings: ctx.settings,
      // Beispielmodus: the typed deadline answer goes into the prepared letter.
      mockTransform: (m) => {
        const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
        const frist = String(answers["Frist zur Abhilfe"] ?? Object.values(answers)[0] ?? "").trim();
        const letter = m as Letter;
        // Unknown deadline: the sentence is rephrased without a date (never a [placeholder]).
        const known = frist && frist !== UNKNOWN;
        const text = known ? letter.body.replace("{FRIST}", frist) : letter.body.replace(" bis spätestens {FRIST}", " umgehend").replace("{FRIST}", "umgehend");
        return { ...letter, body: text };
      },
    },
  );
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    // The UI shows the draft status itself (banner, watermark); markers in the text are removed.
    subject: stripDraftSubject(str(letter.subject)),
    recipient: str(letter.recipient),
    salutation: str(letter.salutation) || "Sehr geehrte Damen und Herren,",
    // The template adds closing + signature; remove any the model wrote into the body.
    body: stripSignoff(stripDraftLines(str(letter.body)), [ctx.settings.absender.firma, signer(ctx.settings).name, signer(ctx.settings).funktion].filter(Boolean)),
    closing: str(letter.closing) || "Mit freundlichen Grüßen",
    legal_basis: str(letter.legal_basis),
    deadline_hint: str(letter.deadline_hint),
    missing: Array.isArray(letter.missing) ? letter.missing.map(String) : [],
  } satisfies Letter;
});
