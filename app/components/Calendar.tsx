"use client";

import { useRef, useState } from "react";
import { dayLabel, marksOf, MARK_COLOR, type DayItem } from "../lib/calendar";
import { dayDate, isoDay, shiftDay } from "../lib/store";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Small 6×6 squares under the day number: at most 3, then „+2“. */
export function Marks({ items }: { items?: DayItem[] }) {
  const marks = marksOf(items);
  if (!marks.length) return null;
  return (
    <span aria-hidden className="mt-1 flex items-center gap-[3px]">
      {marks.slice(0, 3).map((m, i) => (
        <span key={i} className="cal-mark inline-block h-[6px] w-[6px]" style={{ background: MARK_COLOR[m], animationDelay: `${i * 60}ms` }} />
      ))}
      {marks.length > 3 && <span className="font-sans text-[10px] leading-none text-[var(--grey)]">+{marks.length - 3}</span>}
    </span>
  );
}

type Props = {
  today: string;
  selected: string;
  onSelect: (day: string) => void;
  byDay: Map<string, DayItem[]>;
};

/** Month calendar in the Zeitung design: 7 columns, only 1px hairlines, square selection. Arrow keys move the day. */
export default function Calendar({ today, selected, onSelect, byDay }: Props) {
  const sel = dayDate(selected);
  const [month, setMonth] = useState(() => new Date(sel.getFullYear(), sel.getMonth(), 1));
  const [dir, setDir] = useState<"" | "next" | "prev">("");
  const grid = useRef<HTMLDivElement>(null);

  // A day selected outside the shown month (keyboard, „Heute“, week strip) shows its month.
  if (sel.getFullYear() !== month.getFullYear() || sel.getMonth() !== month.getMonth()) {
    const next = new Date(sel.getFullYear(), sel.getMonth(), 1);
    setDir(next > month ? "next" : "prev");
    setMonth(next);
  }

  function shift(n: number) {
    const m = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setDir(n > 0 ? "next" : "prev");
    setMonth(m);
    // Keep the selection inside the shown month: same day number, or the last day.
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    onSelect(isoDay(new Date(m.getFullYear(), m.getMonth(), Math.min(sel.getDate(), last))));
  }

  // 6 weeks from the Monday on or before the 1st.
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => isoDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7)).filter((w, i) => i < 5 || dayDate(w[0]).getMonth() === month.getMonth());

  function onKey(e: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = shiftDay(selected, step);
    onSelect(next);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  }

  const title = month.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const arrow = "inline-flex min-h-11 min-w-11 items-center justify-center font-serif text-[26px] leading-none text-[var(--ink)] hover:text-[var(--accent)]";

  return (
    <section aria-label="Kalender" className="mt-10">
      <div className="flex items-center justify-between border-t-2 border-[var(--ink)] pt-2">
        <div className="flex items-center">
          <button className={arrow} onClick={() => shift(-1)} aria-label="Voriger Monat">‹</button>
          <h2 className="min-w-[170px] text-center font-serif text-[22px] font-semibold" aria-live="polite">{title}</h2>
          <button className={arrow} onClick={() => shift(1)} aria-label="Nächster Monat">›</button>
        </div>
        <button className="min-h-11 font-sans text-[14px] underline underline-offset-[3px] hover:text-[var(--accent)]" onClick={() => onSelect(today)}>Heute</button>
      </div>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-[var(--rule)] pb-1 font-sans text-[11px] font-semibold tracking-[.06em] text-[var(--grey)] uppercase" aria-hidden>
        {WEEKDAYS.map((d) => <span key={d} className="px-1 min-[600px]:px-2">{d}</span>)}
      </div>

      <div
        key={title}
        ref={grid}
        role="grid"
        aria-label={title}
        onKeyDown={onKey}
        className={`cal-grid ${dir === "next" ? "cal-next" : dir === "prev" ? "cal-prev" : ""} border-l border-[var(--rule)]`}
      >
        {weeks.map((w) => (
          <div role="row" key={w[0]} className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
            {w.map((day, i) => {
              const d = dayDate(day);
              const other = d.getMonth() !== month.getMonth();
              const isToday = day === today;
              const isSel = day === selected;
              const weekend = i >= 5;
              const items = byDay.get(day);
              return (
                <div role="gridcell" key={day} aria-selected={isSel} className="border-r border-b border-[var(--rule)]">
                  <button
                    data-day={day}
                    tabIndex={isSel ? 0 : -1}
                    onClick={() => onSelect(day)}
                    aria-label={dayLabel(day, items)}
                    aria-current={isToday ? "date" : undefined}
                    className="flex h-12 w-full flex-col items-start px-1 pt-1 text-left min-[600px]:h-[72px] min-[600px]:px-2"
                  >
                    <span
                      className={`inline-block px-[3px] font-serif text-[16px] leading-[1.25] ${isSel ? "bg-[var(--ink)] text-white" : other ? "text-[var(--line)]" : weekend ? "text-[var(--grey)]" : "text-[var(--ink)]"} ${isToday ? "border-b-2 border-[var(--accent)] font-bold" : "border-b-2 border-transparent"}`}
                    >
                      {d.getDate()}
                    </span>
                    <Marks items={items} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
