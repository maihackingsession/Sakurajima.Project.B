// "Fristen & Verlauf": approved letters, kept ONLY in this browser (localStorage). Plain code, no AI.
// Stored per letter: type, recipient, subject, approval time, approver, deadline, letter text. Nothing else.
import behinderung from "@/data/mocks/letter-behinderung.json";
import maengel from "@/data/mocks/letter-maengel.json";
import { addDays, daysBetween, fillDates, formatDate, parseGermanDate, today } from "@/lib/dates";
import { stripSignoff } from "@/lib/text";
import type { Letter, LetterType } from "@/lib/types";
import { letterCollection } from "./store";

export type VerlaufEntry = {
  id: string;
  type: LetterType;
  recipient: string;
  subject: string;
  /** ISO time of the approval. */
  approvedAt: string;
  approvedBy: string;
  /** Abhilfe-/Beseitigungsfrist from the letter (dd.mm.yyyy), "" if none. */
  deadline: string;
  text: { salutation: string; body: string; closing: string };
  /** Standstill estimate in € at approval (Behinderung only; never in the letter). */
  stillstand?: number;
  /** Only for the examples in Beispielmodus; never stored. */
  example?: boolean;
};

// Storage lives in store.ts (one place for all browser storage).
const letters = letterCollection<VerlaufEntry>();
export const getVerlauf = letters.get;
export const useSavedLetters = letters.use;
const write = letters.set;

/** Saves an approved letter. Re-approving the same draft replaces its entry. */
export function saveToVerlauf(entry: Omit<VerlaufEntry, "example">) {
  const clean: VerlaufEntry = {
    id: entry.id,
    type: entry.type,
    recipient: entry.recipient,
    subject: entry.subject,
    approvedAt: entry.approvedAt,
    approvedBy: entry.approvedBy,
    deadline: entry.deadline,
    text: { salutation: entry.text.salutation, body: entry.text.body, closing: entry.text.closing },
    ...(entry.stillstand ? { stillstand: Math.round(entry.stillstand) } : {}),
  };
  write([clean, ...getVerlauf().filter((e) => e.id !== entry.id)]);
}

export function clearVerlauf() {
  write([]);
}

/** The deadline the letter sets ("… bis spätestens 23.11.2026 …" in a request paragraph). */
export function deadlineOf(body: string) {
  for (const p of body.split(/\n\s*\n/)) {
    if (!/bitten|fordern|frist|übergeben|beseitig|abhilfe|nachzuholen/i.test(p)) continue;
    const m = /bis\s+(?:spätestens\s+)?(?:zum\s+)?(?:[A-Za-zäöü]+,\s*)?(?:den\s+)?(\d{1,2}\.\d{1,2}\.\d{4})/i.exec(p);
    if (m && parseGermanDate(m[1])) return m[1];
  }
  return "";
}

export const DEADLINE_LABEL: Record<LetterType, string> = {
  behinderung: "Frist zur Abhilfe",
  mehrkosten: "Frist",
  bedenken: "Frist",
  maengel: "Frist zur Mängelbeseitigung",
  mengenaenderung: "Frist",
};

/** Countdown for a deadline: "noch 3 Tage" (green), ≤ 2 days amber, past red "überfällig". */
export function countdown(deadline: string): { text: string; tone: "ok" | "soon" | "late" } | null {
  const d = parseGermanDate(deadline);
  if (!d) return null;
  const days = daysBetween(today(), d);
  if (days < 0) return { text: days === -1 ? "überfällig seit 1 Tag" : `überfällig seit ${-days} Tagen`, tone: "late" };
  if (days === 0) return { text: "heute fällig", tone: "soon" };
  return { text: days === 1 ? "noch 1 Tag" : `noch ${days} Tage`, tone: days <= 2 ? "soon" : "ok" };
}

/** Full letter for the read-only view and the export. */
export function letterOf(e: VerlaufEntry): Letter {
  return { subject: e.subject, recipient: e.recipient, ...e.text, legal_basis: "", deadline_hint: "", missing: [] };
}

/** Date line of a saved letter: the approval day. */
export function letterDateOf(e: VerlaufEntry) {
  return formatDate(new Date(e.approvedAt));
}

/** Two examples from the demo story, shown only in Beispielmodus while nothing is saved. */
export function exampleEntries(): VerlaufEntry[] {
  const at = (days: number, h: number, m: number) => {
    const d = addDays(today(), days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const fill = (s: string) => fillDates(s);
  return [
    {
      id: "beispiel-behinderung",
      type: "behinderung",
      recipient: behinderung.recipient,
      subject: fill(behinderung.subject),
      approvedAt: at(0, 9, 40),
      approvedBy: "Yuzhi Shao",
      deadline: fill("{T+2}"),
      text: { salutation: behinderung.salutation, body: fill(behinderung.body.replace("{FRIST}", "{T+2}, 12:00 Uhr")), closing: behinderung.closing },
      example: true,
    },
    {
      id: "beispiel-maengel",
      type: "maengel",
      recipient: maengel.recipient,
      subject: fill(maengel.subject),
      approvedAt: at(-2, 16, 15),
      approvedBy: "Yuzhi Shao",
      deadline: fill("{T+5}"),
      text: { salutation: maengel.salutation, body: fill(stripSignoff(maengel.body)), closing: maengel.closing },
      example: true,
    },
  ];
}
