"use client";

import { useEffect, useState } from "react";
import project from "@/data/project.json";
import { LETTER_LABELS } from "@/lib/types";
import { countdown } from "../lib/verlauf";
import { issueTitle, shortType } from "../lib/ui";
import { urgentCount, useVerlaufEntries, withDeadlines } from "../lib/useVerlauf";
import { Logo } from "./Status";

export type Tab = "situation" | "bericht" | "verlauf" | "zusammenfassen";

const TABS: { id: Tab; label: string }[] = [
  { id: "situation", label: "Neuer Eintrag" },
  { id: "bericht", label: "Tagesbericht" },
  { id: "verlauf", label: "Fristen & Verlauf" },
  { id: "zusammenfassen", label: "Zusammenfassen" },
];

/** Navy masthead with the I-beam logo and the tabs, plus the yellow deadline band below it. */
export default function Header({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const [serverMock, setServerMock] = useState(false);
  const { entries, beispiel } = useVerlaufEntries();
  const urgent = urgentCount(entries);
  const next = withDeadlines(entries)[0];
  const c = next ? countdown(next.deadline) : null;

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setServerMock(!!d.mock))
      .catch(() => {});
  }, []);

  return (
    <header>
      <div className="on-dark bg-[var(--navy)] text-white">
        <div className="wrap flex min-h-[76px] flex-col gap-x-8 gap-y-1 py-3 min-[600px]:flex-row min-[600px]:flex-wrap min-[600px]:items-center min-[600px]:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size={36} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-serif text-[26px] leading-none font-extrabold tracking-[-.03em] min-[600px]:text-[34px]">Baufrist</span>
                {(beispiel || serverMock) && (
                  <span className="font-sans text-[13px] font-bold tracking-[.06em] text-[var(--yellow)] uppercase">Beispielmodus</span>
                )}
              </p>
              <p className="mt-1 truncate font-sans text-[13px] text-[var(--navy-muted)]">{project.bauvorhaben}</p>
            </div>
          </div>
          <nav aria-label="Bereiche" className="-mx-6 overflow-x-auto px-6 min-[600px]:mx-0 min-[600px]:px-0">
            <ul className="flex gap-x-6 whitespace-nowrap">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => onTab(t.id)}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center gap-2 border-b-[3px] font-sans text-[15px] text-white ${active ? "border-[var(--yellow)] font-bold" : "border-transparent font-medium hover:border-white/40"}`}
                    >
                      {t.label}
                      {t.id === "verlauf" && urgent > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center bg-[var(--yellow)] px-1 text-[13px] font-extrabold text-[var(--ink)]" aria-label={`${urgent} dringende Fristen`}>
                          {urgent}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {next && c && (
        <div className="border-b border-[var(--ink)] bg-[var(--yellow)] text-[var(--ink)]">
          <div className="wrap flex min-h-10 flex-wrap items-center justify-between gap-x-6 py-1.5">
            <p className="min-w-0 font-sans text-[14px] font-bold">
              <span className="uppercase">{c.text}</span>
              <span aria-hidden className="mx-2 inline-block h-2.5 w-2.5 bg-[var(--ink)] align-middle" />
              {shortType(LETTER_LABELS[next.type])} · {issueTitle(next.subject, next.deadline)}
            </p>
            <button className="inline-flex min-h-11 items-center font-sans text-[14px] font-semibold underline underline-offset-[3px]" onClick={() => onTab("verlauf")}>
              Alle Fristen
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
