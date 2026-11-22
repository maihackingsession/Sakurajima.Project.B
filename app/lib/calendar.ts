"use client";

// Calendar data for Fristen & Verlauf and the week strip on „Heute“: one list of items per day
// from the existing sources (entries, events, approved letters with deadlines). No new storage.
import { formatDate, parseGermanDate } from "@/lib/dates";
import { LETTER_LABELS } from "@/lib/types";
import { clock, dayDate, isoDay, KIND_LABEL, useEntries, type Entry } from "./store";
import { issueTitle, shortType } from "./ui";
import { useVerlaufEntries } from "./useVerlauf";
import type { VerlaufEntry } from "./verlauf";

/** red = deadline due that day, blue = letter or event, black = diary entry. */
export type Mark = "frist" | "schreiben" | "eintrag";

export type DayItem = {
  key: string;
  day: string;
  time: string;
  mark: Mark;
  kicker: string;
  title: string;
  entry?: Entry;
  letter?: VerlaufEntry;
};

const firstLine = (s: string) => s.split("\n")[0].trim();

export function useCalendarItems() {
  const { entries: letters } = useVerlaufEntries();
  const events = useEntries();
  const items: DayItem[] = [];
  for (const e of events) {
    const diary = e.kind === "eintrag" || e.kind === "zusammenfassung";
    items.push({
      key: e.id,
      day: e.date,
      time: e.time,
      mark: diary ? "eintrag" : "schreiben",
      kicker: diary ? "Tagesbericht" : KIND_LABEL[e.kind],
      title: e.title || firstLine(e.text),
      entry: e,
    });
    if (e.kind === "frist" && e.due) items.push({ key: `${e.id}-due`, day: e.due, time: "", mark: "frist", kicker: "Frist fällig", title: e.title || firstLine(e.text), entry: e });
  }
  for (const l of letters) {
    const at = new Date(l.approvedAt);
    const title = issueTitle(l.subject, shortType(LETTER_LABELS[l.type]));
    items.push({ key: l.id, day: isoDay(at), time: clock(at), mark: "schreiben", kicker: shortType(LETTER_LABELS[l.type]), title, letter: l });
    const due = parseGermanDate(l.deadline);
    if (due) items.push({ key: `${l.id}-due`, day: isoDay(due), time: "", mark: "frist", kicker: "Frist fällig", title: `${shortType(LETTER_LABELS[l.type])}: ${title}`, letter: l });
  }
  items.sort((a, b) => `${a.day} ${a.time || "00:00"}`.localeCompare(`${b.day} ${b.time || "00:00"}`));
  const byDay = new Map<string, DayItem[]>();
  for (const i of items) byDay.set(i.day, [...(byDay.get(i.day) ?? []), i]);
  return byDay;
}

/** Markers of a day: deadlines first, then letters/events, then diary entries. */
export function marksOf(items: DayItem[] = []): Mark[] {
  const order: Mark[] = ["frist", "schreiben", "eintrag"];
  return [...items].map((i) => i.mark).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** „Samstag, 21. November, 1 Frist fällig, 2 Einträge“ for screen readers. */
export function dayLabel(day: string, items: DayItem[] = []) {
  const head = dayDate(day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const fristen = items.filter((i) => i.mark === "frist").length;
  const letters = items.filter((i) => i.mark !== "frist" && i.letter).length;
  const entries = items.filter((i) => i.mark !== "frist" && i.entry).length;
  const parts = [
    fristen && `${fristen} ${fristen === 1 ? "Frist" : "Fristen"} fällig`,
    letters && `${letters} Schreiben`,
    entries && `${entries} ${entries === 1 ? "Eintrag" : "Einträge"}`,
  ].filter(Boolean);
  return [head, ...parts].join(", ");
}

export const MARK_COLOR: Record<Mark, string> = { frist: "var(--urgent)", schreiben: "var(--accent)", eintrag: "var(--ink)" };

/** Monday of the week of `day`. */
export function weekStart(day: string) {
  const d = dayDate(day);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}

export const shortDay = (day: string) => formatDate(dayDate(day), true);
