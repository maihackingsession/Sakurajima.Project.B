"use client";

import { useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import DeviationTab from "./components/DeviationTab";
import LetterFlow, { type DraftSource, type LetterFlowHandle } from "./components/LetterFlow";
import Header from "./components/Header";
import SummaryTab from "./components/SummaryTab";
import VerlaufTab from "./components/VerlaufTab";

type Tab = "situation" | "bericht" | "verlauf" | "zusammenfassen";

const ICONS: Record<Tab, React.ReactNode> = {
  situation: <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  bericht: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /><path d="m14.5 16.5 1.5 1.5 3-3" /></>,
  verlauf: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M12 12.5v3l2 1.2" /></>,
  zusammenfassen: <><path d="M4 6h16M4 10h16M4 14h10M4 18h7" /></>,
};

const TABS: { id: Tab; label: string; short?: string }[] = [
  { id: "situation", label: "Neuer Eintrag" },
  { id: "bericht", label: "Tagesbericht", short: "Tages­bericht" },
  { id: "verlauf", label: "Fristen & Verlauf" },
  { id: "zusammenfassen", label: "Zusammenfassen", short: "Zusammen­fassen" },
];

function Icon({ tab }: { tab: Tab }) {
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[tab]}
    </svg>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("situation");
  const letterFlow = useRef<LetterFlowHandle>(null);
  // Text handed over from the router; the key remounts the target tab with it.
  const [incoming, setIncoming] = useState<{ tab: Tab; text: string; id: number } | null>(null);

  function go(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  function redirect(target: "bericht" | "zusammenfassen", text: string) {
    setIncoming({ tab: target, text, id: Date.now() });
    go(target);
  }

  function draftFromDeviation(text: string, letterType: LetterType, source: DraftSource) {
    go("situation");
    letterFlow.current?.start(text, letterType, source);
  }

  const handed = (t: Tab) => (incoming?.tab === t ? incoming : null);

  return (
    <>
      <Header>
        {/* Tabs as large tiles: one row under the name on phones, inside the header on laptops. No hamburger. */}
        <nav aria-label="Bereiche" className="-mx-1 lg:mx-0">
          <div className="grid grid-cols-4 gap-1.5 lg:flex lg:gap-2">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-t-xl px-1 pt-2 pb-1.5 text-center text-[13px] leading-tight font-semibold text-[var(--ink)] lg:min-h-14 lg:flex-row lg:gap-2 lg:px-4 lg:text-base lg:whitespace-nowrap ${
                    active ? "bg-[var(--background)] font-bold" : "bg-white/30 hover:bg-white/55"
                  }`}
                >
                  <Icon tab={t.id} />
                  <span className="hyphens-manual lg:hidden">{t.short ?? t.label}</span>
                  <span className="hidden lg:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </Header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-12">
        {/* Tabs stay mounted (hidden) so switching does not lose input. */}
        <div hidden={tab !== "situation"}>
          <LetterFlow ref={letterFlow} onRedirect={redirect} />
        </div>
        <div hidden={tab !== "bericht"}>
          <DeviationTab key={handed("bericht")?.id ?? "bericht"} initialText={handed("bericht")?.text} onDraft={draftFromDeviation} />
        </div>
        <div hidden={tab !== "verlauf"}>
          <VerlaufTab />
        </div>
        <div hidden={tab !== "zusammenfassen"}>
          <SummaryTab key={handed("zusammenfassen")?.id ?? "zusammenfassen"} initialText={handed("zusammenfassen")?.text} />
        </div>
      </main>
    </>
  );
}
