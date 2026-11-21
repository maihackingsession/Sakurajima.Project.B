"use client";

import { useSyncExternalStore } from "react";
import { formatDate, parseGermanDate } from "@/lib/dates";
import { LETTER_LABELS } from "@/lib/types";
import { dayDate, useEntries } from "./store";
import { issueTitle, shortType } from "./ui";
import { isBeispiel } from "./api";
import { countdown, exampleEntries, useSavedLetters, type VerlaufEntry } from "./verlauf";

const noop = () => () => {};
let examples: VerlaufEntry[] | null = null;

/** Saved letters; demo entries only in Beispielmodus while nothing is saved. */
export function useVerlaufEntries() {
  const saved = useSavedLetters();
  const beispiel = useSyncExternalStore(noop, isBeispiel, () => false);
  const showExamples = saved.length === 0 && beispiel;
  examples ??= showExamples ? exampleEntries() : null;
  return { saved, beispiel, showExamples, entries: showExamples ? (examples ?? []) : saved };
}

const time = (d: string) => parseGermanDate(d)?.getTime() ?? 0;

/** Letters with a deadline, most urgent first. */
export function withDeadlines(entries: VerlaufEntry[]) {
  return entries.filter((e) => countdown(e.deadline)).sort((a, b) => time(a.deadline) - time(b.deadline));
}

/** Deadlines due within 2 days or overdue. */
export function urgentCount(entries: VerlaufEntry[]) {
  return entries.filter((e) => {
    const c = countdown(e.deadline);
    return c && c.tone !== "ok";
  }).length;
}

/** Status of a deadline: „heute fällig“, „überfällig seit …“ or „Mo 23.11. · noch 2 Tage“. */
export function deadlineStatus(deadline: string) {
  const c = countdown(deadline);
  const d = parseGermanDate(deadline);
  if (!c || !d) return deadline;
  if (c.tone === "late" || c.text === "heute fällig") return c.text;
  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return `${wd} ${formatDate(d, true)} · ${c.text}`;
}

export type DueItem = { id: string; title: string; status: string; urgent: boolean; deadline: string };

/** Open deadlines from approved letters and „Frist“ events, most urgent first. */
export function useDueItems(): DueItem[] {
  const { entries } = useVerlaufEntries();
  const events = useEntries();
  const item = (id: string, title: string, deadline: string): DueItem => {
    const c = countdown(deadline);
    return { id, title, deadline, status: deadlineStatus(deadline), urgent: !!c && (c.tone === "late" || c.text === "heute fällig") };
  };
  const letters = withDeadlines(entries).map((e) =>
    item(e.id, `${shortType(LETTER_LABELS[e.type])}: ${issueTitle(e.subject, e.deadline)}${e.example ? " (Beispiel)" : ""}`, e.deadline),
  );
  const fristen = events
    .filter((e) => e.kind === "frist" && e.due)
    .map((e) => item(e.id, e.title || e.text, formatDate(dayDate(e.due as string))));
  return [...letters, ...fristen].sort((a, b) => time(a.deadline) - time(b.deadline));
}
