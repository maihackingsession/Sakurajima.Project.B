// Fixed output keys of prompts/letter.xml. Change together with the prompt.
export type Letter = {
  typ: string;
  betreff: string;
  empfaenger: string;
  anrede: string;
  text: string;
  grussformel: string;
  missing: string[];
};

export const LETTER_TYPES = [
  "Behinderungsanzeige",
  "Mehrkostenanzeige",
  "Bedenkenanzeige/Mängelanzeige",
] as const;

export type LetterType = (typeof LETTER_TYPES)[number];

export const LETTER_SCHEMA = {
  type: "object",
  properties: {
    typ: { type: "string" },
    betreff: { type: "string" },
    empfaenger: { type: "string" },
    anrede: { type: "string" },
    text: { type: "string" },
    grussformel: { type: "string" },
    missing: { type: "array", items: { type: "string" } },
  },
  required: ["typ", "betreff", "empfaenger", "anrede", "text", "grussformel", "missing"],
  additionalProperties: false,
} as const;
