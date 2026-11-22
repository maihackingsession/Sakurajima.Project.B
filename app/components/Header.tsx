"use client";

import { useEffect, useState } from "react";
import { dayDate, endBeispiel, useBeispiel, useSettings, useToday } from "../lib/store";
import { useDueItems } from "../lib/useVerlauf";
import CraneMark from "./CraneMark";

export type Tab = "heute" | "berichte" | "verlauf" | "zusammenfassen";

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "heute", label: "Heute", short: "Heute" },
  { id: "berichte", label: "Tagesbericht", short: "Bericht" },
  { id: "verlauf", label: "Fristen & Verlauf", short: "Fristen" },
  { id: "zusammenfassen", label: "Unterlagen", short: "Unterlagen" },
];

const longDate = (day: string) => dayDate(day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = (day: string) => {
  const d = dayDate(day);
  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return `${wd}, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

type Props = { tab: Tab; onTab: (t: Tab) => void; onSettings: () => void; compact?: boolean };

/**
 * Newspaper masthead: 4px accent line, crane mark + date (+ „2 fällig“), Einstellungen, centered nameplate,
 * project line, double-ruled nav. The date is the browser's today (same source as „Heute · …“).
 */
export default function Header({ tab, onTab, onSettings, compact = false }: Props) {
  const [serverMock, setServerMock] = useState(false);
  const beispiel = useBeispiel();
  const today = useToday();
  const settings = useSettings();
  const due = useDueItems().filter((d) => d.urgent).length;

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setServerMock(!!d.mock))
      .catch(() => {});
  }, []);

  // No API key on the server → Demo-Modus (cannot be switched off here); ?beispiel=1 → Beispielmodus.
  const label = serverMock ? "Demo-Modus" : beispiel ? "Beispielmodus" : "";

  return (
    <header className="masthead">
      <div aria-hidden className="h-1 bg-[var(--accent)]" />
      <div className="mx-auto max-w-[1120px] px-[18px] pt-3 min-[600px]:px-6 min-[600px]:pt-[14px]">
        <div className="flex min-h-[34px] items-center justify-between gap-4 font-sans text-[13px]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="min-[600px]:hidden"><CraneMark size="sm" /></span>
            <span className="hidden min-[600px]:inline-flex"><CraneMark size="lg" drop /></span>
            {today && <span className="hidden leading-none font-semibold min-[600px]:inline">{longDate(today)}</span>}
            {due > 0 && (
              <button onClick={() => onTab("verlauf")} className="min-h-11 font-bold whitespace-nowrap text-[var(--urgent)] underline-offset-[3px] hover:underline">
                {due} fällig
              </button>
            )}
          </div>
          <div className="flex items-center gap-x-4">
            {label && (
              <span className="hidden font-semibold tracking-[.04em] whitespace-nowrap text-[var(--grey)] uppercase min-[600px]:inline">
                {label} – Beispielantworten
              </span>
            )}
            {beispiel && (
              <button onClick={endBeispiel} className="min-h-11 whitespace-nowrap text-[var(--ink)] underline underline-offset-[3px] hover:text-[var(--accent)]">
                Beispielmodus beenden
              </button>
            )}
            <button onClick={onSettings} className="min-h-11 whitespace-nowrap text-[var(--ink)] underline underline-offset-[3px] hover:text-[var(--accent)]">
              Einstellungen
            </button>
          </div>
        </div>
        {label && <p className="font-sans text-[11px] font-semibold tracking-[.04em] text-[var(--grey)] uppercase min-[600px]:hidden">{label} – Beispielantworten</p>}
        <div className="mt-1 text-center">
          <p className={`font-serif leading-none font-extrabold tracking-[-.03em] ${compact ? "text-[44px] min-[600px]:text-[clamp(44px,5.5vw,64px)]" : "text-[44px] min-[600px]:text-[clamp(52px,7vw,86px)]"}`}>Baufrist</p>
          <p className="mt-[6px] truncate font-sans text-[12px] text-[var(--grey)] min-[600px]:mt-[10px] min-[600px]:text-[13px]">
            {today && <span className="min-[600px]:hidden">{shortDate(today)} · </span>}{settings.projekt.bezeichnung}
          </p>
        </div>
        <nav aria-label="Bereiche" className="mt-3 border-t border-b-4 border-t-[var(--rule)] border-b-[var(--ink)] [border-bottom-style:double] py-[2px] min-[600px]:mt-[18px]">
          <ul className="tab-list flex justify-between min-[600px]:flex-wrap min-[600px]:justify-center min-[600px]:gap-x-8">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={`tab min-h-11 border-b-2 font-sans text-[13px] text-[var(--ink)] min-[600px]:text-[15px] ${active ? "border-[var(--accent)] font-bold" : "border-transparent font-medium hover:border-[var(--rule)]"}`}
                  >
                    <span className="min-[600px]:hidden">{t.short}</span>
                    <span className="hidden min-[600px]:inline">{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
