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

/** Router verdict for a letter situation: notice needed, no notice needed, or cause possibly in our own area. */
export const OUTCOMES = ["anzeige", "keine_anzeige", "eigener_bereich"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export type RouterResult = {
  intent: "letter" | "deviation" | "summary";
  letter_type: LetterType | null;
  outcome: Outcome;
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
  /** One line: why this notice (e.g. "Ursache im Bereich des Auftraggebers: fehlende Ausführungspläne"). */
  reason: string;
  /** Date the deviation started (dd.mm.yyyy), used for urgency + letter date. */
  event_date: string;
  /** Facts from the report, passed into the draft flow so only 1–2 questions remain. */
  facts: Record<string, unknown>;
};
export type DeviationResult = { deviations: Deviation[]; summary: string };

export type SummaryResult = {
  summary: string;
  decisions: string[];
  open_items: { task: string; owner: string; due: string }[];
  deadlines: { date: string; what: string }[];
  risks: string[];
};

/** Answer value for a Rückfrage marked „Weiß ich nicht“ (the letter prompt rephrases around it). */
export const UNKNOWN = "Weiß ich nicht";

/** Fields of a Bautagesbericht (route /api/daily-report, prompts/daily-report.xml). */
export const DAILY_REPORT_KEYS = ["personal", "geraete", "arbeiten", "lieferungen", "anordnungen", "behinderungen", "sonstiges"] as const;
export type DailyReportResult = Record<(typeof DAILY_REPORT_KEYS)[number], string>;
