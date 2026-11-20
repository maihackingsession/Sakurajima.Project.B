// Shared types and labels. Output keys must match the prompts in /prompts.

export const LETTER_TYPES = ["behinderung", "mehrkosten", "bedenken", "maengel"] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export const LETTER_LABELS: Record<LetterType, string> = {
  behinderung: "Behinderungsanzeige",
  mehrkosten: "Mehrkostenanzeige",
  bedenken: "Bedenkenanzeige",
  maengel: "Mängelanzeige (an Nachunternehmer)",
};

export function isLetterType(v: unknown): v is LetterType {
  return typeof v === "string" && (LETTER_TYPES as readonly string[]).includes(v);
}

export type Letter = {
  subject: string;
  recipient: string;
  salutation: string;
  body: string;
  closing: string;
  legal_basis: string;
  deadline_hint: string;
  missing: string[];
};

export type RouterResult = {
  intent: "letter" | "deviation" | "summary";
  letter_type: LetterType | null;
  facts: Record<string, unknown>;
  reason: string;
};

export type GapQuestion = { field: string; question: string; example: string };
export type GapsResult = { complete: boolean; questions: GapQuestion[] };

export type Deviation = {
  activity: string;
  planned: string;
  actual: string;
  severity: "niedrig" | "mittel" | "hoch";
  suggested_letter: LetterType | null;
  explanation: string;
};
export type DeviationResult = { deviations: Deviation[]; summary: string };

export type SummaryResult = {
  summary: string;
  decisions: string[];
  open_items: { task: string; owner: string; due: string }[];
  deadlines: { date: string; what: string }[];
  risks: string[];
};
