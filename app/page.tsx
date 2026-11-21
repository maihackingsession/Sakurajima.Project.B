"use client";

import { useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import DeviationTab from "./components/DeviationTab";
import Header, { type Tab } from "./components/Header";
import LetterFlow, { type DraftSource, type LetterFlowHandle } from "./components/LetterFlow";
import SummaryTab from "./components/SummaryTab";
import VerlaufTab from "./components/VerlaufTab";

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
      <Header tab={tab} onTab={go} />

      <main className="w-full flex-1 pb-10">
        {/* Tabs stay mounted (hidden) so switching does not lose input. */}
        <div hidden={tab !== "situation"}>
          <LetterFlow ref={letterFlow} onRedirect={redirect} onTab={go} />
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

      <footer className="wrap border-t border-[var(--rule)] py-5">
        <p className="font-sans text-[13px] text-[var(--grey)]">Es wird nichts automatisch versendet.</p>
      </footer>
    </>
  );
}
