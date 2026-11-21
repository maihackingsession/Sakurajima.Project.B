"use client";

import { useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import DeviationTab from "./components/DeviationTab";
import LetterFlow, { type DraftSource, type LetterFlowHandle } from "./components/LetterFlow";
import Header from "./components/Header";
import SummaryTab from "./components/SummaryTab";

type Tab = "bericht" | "situation" | "zusammenfassen";

const ICONS: Record<Tab, React.ReactNode> = {
  bericht: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /><path d="m14.5 16.5 1.5 1.5 3-3" /></>,
  situation: <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  zusammenfassen: <><path d="M4 6h16M4 10h16M4 14h10M4 18h7" /></>,
};

const TABS: { id: Tab; label: string }[] = [
  { id: "situation", label: "Situation melden" },
  { id: "bericht", label: "Tagesbericht prüfen" },
  { id: "zusammenfassen", label: "Zusammenfassen" },
];

function Icon({ tab }: { tab: Tab }) {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      {/* Desktop: tabs inside the header bar. */}
      <Header>
      <nav className="hidden self-stretch md:block" aria-label="Bereiche">
        <div className="flex h-full gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex h-full min-h-12 items-center gap-2 border-b-[3px] px-2 text-base font-semibold whitespace-nowrap lg:px-4 ${
                tab === t.id ? "border-[var(--navy)] text-[var(--navy)]" : "border-transparent text-[var(--muted)] hover:text-[var(--navy)]"
              }`}
            >
              <Icon tab={t.id} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      </Header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 md:pb-12">
        {/* Tabs stay mounted (hidden) so switching does not lose input. */}
        <div hidden={tab !== "situation"}>
          <LetterFlow ref={letterFlow} onRedirect={redirect} />
        </div>
        <div hidden={tab !== "bericht"}>
          <DeviationTab key={handed("bericht")?.id ?? "bericht"} initialText={handed("bericht")?.text} onDraft={draftFromDeviation} />
        </div>
        <div hidden={tab !== "zusammenfassen"}>
          <SummaryTab key={handed("zusammenfassen")?.id ?? "zusammenfassen"} initialText={handed("zusammenfassen")?.text} />
        </div>
      </main>

      {/* Mobile: bottom tab bar. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--border)] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Bereiche"
      >
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[14px] font-semibold leading-tight ${
                tab === t.id ? "text-[var(--navy)]" : "text-[var(--muted)]"
              }`}
            >
              <span className={`rounded-full px-4 py-0.5 ${tab === t.id ? "bg-[var(--info-bg)]" : ""}`}><Icon tab={t.id} /></span>
              {t.id === "bericht" ? "Tagesbericht" : t.id === "situation" ? "Situation" : "Zusammenfassen"}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
