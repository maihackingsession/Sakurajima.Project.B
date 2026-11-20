"use client";

import { useRef, useState } from "react";
import type { LetterType } from "@/lib/types";
import DeviationTab from "./components/DeviationTab";
import LetterFlow, { type LetterFlowHandle } from "./components/LetterFlow";
import SummaryTab from "./components/SummaryTab";

type Tab = "situation" | "bericht" | "zusammenfassen";

const TABS: { id: Tab; label: string }[] = [
  { id: "situation", label: "Situation" },
  { id: "bericht", label: "Tagesbericht prüfen" },
  { id: "zusammenfassen", label: "Zusammen­fassen" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("situation");
  const letterFlow = useRef<LetterFlowHandle>(null);
  // Text handed over from the router; the key remounts the target tab with it.
  const [incoming, setIncoming] = useState<{ tab: Tab; text: string; id: number } | null>(null);

  function redirect(target: "bericht" | "zusammenfassen", text: string) {
    setIncoming({ tab: target, text, id: Date.now() });
    setTab(target);
    window.scrollTo({ top: 0 });
  }

  function draftFromDeviation(text: string, letterType: LetterType) {
    setTab("situation");
    window.scrollTo({ top: 0 });
    letterFlow.current?.start(text, letterType);
  }

  const handed = (t: Tab) => (incoming?.tab === t ? incoming : null);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-4">
      <nav className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-200 p-1" aria-label="Bereiche">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`min-h-12 rounded-lg px-1 text-sm break-words font-semibold leading-tight sm:text-base ${
              tab === t.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tabs stay mounted (hidden) so switching does not lose input. */}
      <div hidden={tab !== "situation"}>
        <LetterFlow ref={letterFlow} onRedirect={redirect} />
      </div>
      <div hidden={tab !== "bericht"}>
        <DeviationTab
          key={handed("bericht")?.id ?? "bericht"}
          initialText={handed("bericht")?.text}
          onDraft={draftFromDeviation}
        />
      </div>
      <div hidden={tab !== "zusammenfassen"}>
        <SummaryTab key={handed("zusammenfassen")?.id ?? "zusammenfassen"} initialText={handed("zusammenfassen")?.text} />
      </div>
    </main>
  );
}
