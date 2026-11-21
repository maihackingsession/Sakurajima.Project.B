"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, greyLink, h1, kicker } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import { ErrorBox } from "./Status";

const STEPS = ["Lese die Einträge", "Finde offene Punkte", "Schreibe die Zusammenfassung"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t-2 border-[var(--ink)] pt-3">
      <h2 className={kicker}>{title}</h2>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function SummaryTab({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(kind: "protokoll" | "email") {
    setError("");
    try {
      const { documents } = await loadSamples();
      const picked = documents.filter((d) => d.name.startsWith(kind));
      setText(picked.map((d) => d.text.trim()).join("\n\n---\n\n"));
      setResult(null);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function summarise() {
    setBusy(true);
    setError("");
    try {
      setResult(await atLeast(900, postJson<SummaryResult>("/api/summary", { input: text })));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (busy) return <CraneLoader label="Wird zusammengefasst" steps={STEPS} />;

  const row = "border-b border-[var(--rule)] py-3";

  return (
    <div className="fade-in">
      <section className="wrap pt-16 pb-10">
        <p className={`${kicker} text-[var(--navy)]`}>Protokoll · Bautagebuch · E-Mails</p>
        <h1 className={`${h1} mt-3 mb-8`}>Zusammenfassen</h1>
        <div className="max-w-[760px]">
          <textarea
            id="docs"
            aria-label="Text zum Zusammenfassen"
            className={`line-field font-serif text-[18px] leading-[1.6] ${result ? "min-h-28" : "min-h-56"}`}
            placeholder="Text hier einfügen – mehrere Einträge oder E-Mails sind möglich …"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <button className={btnPrimary} onClick={summarise} disabled={!text.trim()}>Zusammenfassen</button>
            <button className={greyLink} onClick={() => load("protokoll")}>Beispiel laden: Protokoll</button>
            <button className={greyLink} onClick={() => load("email")}>Beispiel laden: E-Mails</button>
          </div>
          {error && <div className="mt-8"><ErrorBox message={error} onRetry={summarise} /></div>}
        </div>
      </section>

      {result && (
        <section className="wrap fade-in flex max-w-[1180px] flex-col gap-10 pb-10">
          <div className="flex max-w-[860px] flex-col gap-10">
            {result.deadlines.length > 0 && (
              <Section title="Fristen und Termine">
                <ul>
                  {result.deadlines.map((d, i) => (
                    <li key={i} className={`${row} flex flex-col gap-x-6 sm:flex-row sm:items-baseline`}>
                      <span className="shrink-0 font-serif text-[20px] font-bold whitespace-nowrap text-[var(--red)] sm:w-36">{d.date}</span>
                      <span>{d.what}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title="Zusammenfassung">
              <p className="text-[20px] leading-[1.55]">{result.summary}</p>
            </Section>
            {result.decisions.length > 0 && (
              <Section title="Entscheidungen">
                <ul>{result.decisions.map((d, i) => <li key={i} className={row}>{d}</li>)}</ul>
              </Section>
            )}
            {result.open_items.length > 0 && (
              <Section title="Offene Punkte">
                <ul>
                  {result.open_items.map((o, i) => (
                    <li key={i} className={`${row} flex flex-wrap items-baseline justify-between gap-x-6`}>
                      <span className="min-w-0 flex-1">{o.task}</span>
                      <span className="text-right font-sans text-[14px]">
                        <span className="block text-[var(--grey)]">{o.owner || "offen"}</span>
                        <span className={`block font-bold ${o.due && o.due !== "offen" ? "text-[var(--ink)]" : "text-[var(--grey)]"}`}>{o.due || "offen"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {result.risks.length > 0 && (
              <Section title="Risiken">
                <ul>{result.risks.map((r, i) => <li key={i} className={row}>{r}</li>)}</ul>
              </Section>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
