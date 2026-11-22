"use client";

import { useCallback, useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import BerichteTab, { type OpenDay } from "./components/BerichteTab";
import Einstellungen from "./components/Einstellungen";
import { FocusBar, FocusProvider, type FocusEntry } from "./components/Focus";
import Header, { type Tab } from "./components/Header";
import LetterFlow, { type DraftSource, type LetterFlowHandle } from "./components/LetterFlow";
import SummaryTab from "./components/SummaryTab";
import VerlaufTab from "./components/VerlaufTab";
import { isoDay } from "./lib/store";

export default function Home() {
  const [tab, setTab] = useState<Tab>("heute");
  // Start screen uses the big nameplate; every other screen the smaller one.
  const [onStart, setOnStart] = useState(true);
  const letterFlow = useRef<LetterFlowHandle>(null);
  const [openDay, setOpenDay] = useState<OpenDay>(null);
  const [settings, setSettings] = useState(false);
  const [saved, setSaved] = useState(0);
  // Open tasks per screen (focus mode): the visible one replaces the masthead with the slim bar.
  const [tasks, setTasks] = useState<Record<string, FocusEntry>>({});
  const register = useCallback((id: string, f: FocusEntry | null) => {
    setTasks((old) => {
      if (!f) {
        if (!(id in old)) return old;
        const next = { ...old };
        delete next[id];
        return next;
      }
      const o = old[id];
      if (o && o.area === f.area && o.title === f.title && o.status === f.status) return old;
      return { ...old, [id]: f };
    });
  }, []);

  /** Opens the Tagesbericht of a day (from Fristen & Verlauf or Unterlagen). */
  function showDay(day: string) {
    setOpenDay({ day, n: Date.now() });
    setSettings(false);
    setTab("berichte");
    window.scrollTo({ top: 0 });
  }

  function go(t: Tab) {
    setSettings(false);
    // The tab „Tagesbericht“ opens today's report; older days via „Frühere Tage“.
    if (t === "berichte") setOpenDay({ day: isoDay(), n: Date.now() });
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  /** „Schreiben entwerfen“ from another tab: Rückfragen → Schreiben on „Heute“. */
  function draft(text: string, letterType: LetterType, source: DraftSource) {
    go("heute");
    letterFlow.current?.start(text, letterType, source);
  }

  function openSettings() {
    setSettings(true);
    setSaved(0);
    window.scrollTo({ top: 0 });
  }

  const settingsFocus: FocusEntry = {
    area: "einstellungen",
    title: "Einstellungen",
    status: saved ? "Gespeichert ✓" : "",
    onBack: () => setSettings(false),
  };
  const focus = settings ? settingsFocus : Object.values(tasks).find((f) => f.area === tab);

  function onSaved() {
    const n = Date.now();
    setSaved(n);
    setTimeout(() => setSaved((v) => (v === n ? 0 : v)), 2000);
  }

  return (
    <FocusProvider value={register}>
      {focus ? <FocusBar key="bar" focus={focus} /> : <Header key="head" tab={tab} onTab={go} onSettings={openSettings} compact={tab !== "heute" || !onStart} />}

      <main className="mx-auto box-border w-full max-w-[720px] px-6 pt-10 pb-14 min-[600px]:pt-12">
        {settings && <Einstellungen onSaved={onSaved} />}
        {/* Tabs stay mounted (hidden) so switching does not lose input. */}
        <div hidden={settings || tab !== "heute"}>
          <LetterFlow ref={letterFlow} onTab={go} onSettings={openSettings} onStartScreen={setOnStart} />
        </div>
        <div hidden={settings || tab !== "berichte"}>
          <BerichteTab onDraft={draft} openDay={openDay} />
        </div>
        <div hidden={settings || tab !== "verlauf"}>
          <VerlaufTab onOpenDay={showDay} />
        </div>
        <div hidden={settings || tab !== "zusammenfassen"}>
          <SummaryTab onOpenDay={showDay} />
        </div>

        <footer className="mt-12 border-t border-[var(--ink)] pt-3 text-center font-sans text-[13px] text-[var(--grey)]">
          Es wird nichts automatisch versendet.
        </footer>
      </main>
    </FocusProvider>
  );
}
