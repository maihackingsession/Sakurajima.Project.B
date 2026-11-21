"use client";

import { useSyncExternalStore } from "react";
import { parseGermanDate } from "@/lib/dates";
import { isBeispiel } from "./api";
import { countdown, exampleEntries, getVerlauf, getVerlaufServer, subscribeVerlauf, type VerlaufEntry } from "./verlauf";

const noop = () => () => {};
let examples: VerlaufEntry[] | null = null;

/** Saved letters; demo entries only in Beispielmodus while nothing is saved. */
export function useVerlaufEntries() {
  const saved = useSyncExternalStore(subscribeVerlauf, getVerlauf, getVerlaufServer);
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
