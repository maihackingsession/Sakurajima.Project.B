"use client";

import { useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import BerichteTab from "./components/BerichteTab";
import Header, { type Tab } from "./components/Header";
import LetterFlow, { type DraftSource, type LetterFlowHandle } from "./components/LetterFlow";
import SummaryTab from "./components/SummaryTab";
import VerlaufTab from "./components/VerlaufTab";

export default function Home() {
  const [tab, setTab] = useState<Tab>("heute");
  // Start screen uses the big nameplate; every other screen the smaller one.
  const [onStart, setOnStart] = useState(true);
  const letterFlow = useRef<LetterFlowHandle>(null);

  function go(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  /** „Anzeige entwerfen“ / „Schreiben entwerfen“ from another tab: Rückfragen → Schreiben on „Heute“. */
  function draft(text: string, letterType: LetterType, source: DraftSource) {
    go("heute");
    letterFlow.current?.start(text, letterType, source);
  }

  return (
    <>
      <Header tab={tab} onTab={go} compact={tab !== "heute" || !onStart} />

      <main className="mx-auto box-border w-full max-w-[720px] px-6 pt-10 pb-14 min-[600px]:pt-12">
        {/* Tabs stay mounted (hidden) so switching does not lose input. */}
        <div hidden={tab !== "heute"}>
          <LetterFlow ref={letterFlow} onTab={go} onStartScreen={setOnStart} />
        </div>
        <div hidden={tab !== "berichte"}>
          <BerichteTab onDraft={draft} />
        </div>
        <div hidden={tab !== "verlauf"}>
          <VerlaufTab />
        </div>
        <div hidden={tab !== "zusammenfassen"}>
          <SummaryTab />
        </div>

        <footer className="mt-12 border-t border-[var(--ink)] pt-3 text-center font-sans text-[13px] text-[var(--grey)]">
          Es wird nichts automatisch versendet.
        </footer>
      </main>
    </>
  );
}
