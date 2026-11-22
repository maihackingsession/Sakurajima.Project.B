"use client";

// „Heute“ below the input and today's entries: key figures, Als Nächstes, Diese Woche, Zuletzt freigegeben.
// Every block only shows when it has data. No AI, no new storage.
import plan from "@/data/plan.json";
import { fillDates, parseGermanDate } from "@/lib/dates";
import { LETTER_LABELS } from "@/lib/types";
import { shortDay, useCalendarItems, weekStart } from "../lib/calendar";
import { euro } from "../lib/checks";
import { dayDate, isoDay, shiftDay } from "../lib/store";
import { issueTitle, linkBtn, sectionLabel, shortType } from "../lib/ui";
import { useDueItems, useVerlaufEntries } from "../lib/useVerlauf";
import { Marks } from "./Calendar";

const label = "font-sans text-[12px] text-[var(--grey)]";
const weekday = (d: Date) => d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");

/** Open deadlines, notices approved this week, standstill so far (from approved letters). */
export function KeyFigures({ today }: { today: string }) {
  const due = useDueItems();
  const { saved } = useVerlaufEntries();
  const monday = weekStart(today);
  const week = saved.filter((l) => isoDay(new Date(l.approvedAt)) >= monday).length;
  const standstill = saved.reduce((sum, l) => sum + (l.stillstand ?? 0), 0);
  const figures = [
    { n: String(due.length), label: "Offene Fristen", show: true },
    { n: String(week), label: "Anzeigen diese Woche", show: true },
    { n: euro(standstill), label: "Stillstand bisher", show: standstill > 0 },
  ].filter((f) => f.show);
  if (!due.length && !week && !standstill) return null;
  return (
    <section aria-label="Kennzahlen" className="fade-in mt-12 border-t-2 border-[var(--ink)] pt-3">
      <dl className="flex">
        {figures.map((f, i) => (
          <div key={f.label} className={`min-w-0 flex-1 ${i > 0 ? "border-l border-[var(--rule)] pl-4" : ""} pr-3`}>
            <dd className="font-serif text-[32px] leading-[1.1] font-bold tabular-nums">{f.n}</dd>
            <dt className={label}>{f.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

type PlanItem = { id: number; vorgang: string; start: string; ende: string };

/** The next 3 schedule items (Vorgang, weekday, date). */
export function NextUp({ today }: { today: string }) {
  const items = (JSON.parse(fillDates(JSON.stringify(plan.vorgaenge))) as PlanItem[])
    .map((v) => ({ ...v, date: parseGermanDate(v.start) }))
    .filter((v): v is PlanItem & { date: Date } => !!v.date && isoDay(v.date) >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);
  if (!items.length) return null;
  return (
    <section aria-labelledby="h-next" className="fade-in mt-12">
      <h2 id="h-next" className={sectionLabel}>Als Nächstes</h2>
      <ul>
        {items.map((v) => (
          <li key={v.id} className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-3">
            <span className="min-w-0 font-serif text-[18px] leading-[1.3] font-semibold">{v.vorgang}</span>
            <span className="shrink-0 font-sans text-[13px] text-[var(--grey)] tabular-nums">{weekday(v.date)} {shortDay(isoDay(v.date))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One-row week strip Mo–So with the calendar markers; a click opens Fristen & Verlauf on that day. */
export function ThisWeek({ today, onDay }: { today: string; onDay: (day: string) => void }) {
  const byDay = useCalendarItems();
  const monday = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  if (!days.some((d) => byDay.get(d)?.length)) return null;
  return (
    <section aria-labelledby="h-week" className="fade-in mt-12">
      <h2 id="h-week" className={sectionLabel}>Diese Woche</h2>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-l border-[var(--rule)]">
        {days.map((d, i) => {
          const date = dayDate(d);
          return (
            <button
              key={d}
              onClick={() => onDay(d)}
              aria-label={`${date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })} in Fristen & Verlauf öffnen`}
              className="flex h-[64px] flex-col items-start border-r border-[var(--rule)] px-1 pt-1 text-left hover:bg-transparent min-[600px]:px-2"
            >
              <span className={`font-sans text-[11px] tracking-[.06em] uppercase ${i >= 5 ? "text-[var(--grey)]" : "text-[var(--grey)]"}`}>{weekday(date)}</span>
              <span className={`font-serif text-[16px] leading-[1.2] ${d === today ? "border-b-2 border-[var(--accent)] font-bold" : i >= 5 ? "text-[var(--grey)]" : ""}`}>{date.getDate()}</span>
              <Marks items={byDay.get(d)} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The last 3 approved letters (type kicker, title, date) with „Öffnen“. */
export function LastApproved({ onOpen }: { onOpen: (id: string) => void }) {
  const { saved } = useVerlaufEntries();
  const last = [...saved].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt)).slice(0, 3);
  if (!last.length) return null;
  return (
    <section aria-labelledby="h-last" className="fade-in mt-12">
      <h2 id="h-last" className={sectionLabel}>Zuletzt freigegeben</h2>
      <ul>
        {last.map((l) => (
          <li key={l.id} className="border-b border-[var(--rule)] py-3">
            <p className="font-sans text-[12px] font-bold tracking-[.06em] text-[var(--accent)] uppercase">{shortType(LETTER_LABELS[l.type])}</p>
            <p className="mt-1 font-serif text-[19px] leading-[1.3] font-semibold">{issueTitle(l.subject, shortType(LETTER_LABELS[l.type]))}</p>
            <p className="flex flex-wrap items-center gap-x-4">
              <span className={label}>{shortDay(isoDay(new Date(l.approvedAt)))}</span>
              <button className={`${linkBtn} text-[13px]`} onClick={() => onOpen(l.id)}>Öffnen</button>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
