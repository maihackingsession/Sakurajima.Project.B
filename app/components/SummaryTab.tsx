"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, greyLink, h1, kicker, linkBtn, sectionLabel } from "../lib/ui";
import { addEntry, clock, dayDate, isoDay, useBeispiel } from "../lib/store";
import { formatDate } from "@/lib/dates";
import CraneLoader, { atLeast } from "./CraneLoader";
import { ErrorBox } from "./Status";
import VoiceField from "./VoiceField";

const STEPS = ["Lese die Einträge", "Finde offene Punkte", "Schreibe die Zusammenfassung"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className={sectionLabel}>{title}</h2>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** The summary as plain text for the Tagesbericht entry. */
function summaryText(r: SummaryResult) {
  const list = (title: string, items: string[]) => (items.length ? `${title}:\n${items.map((i) => `– ${i}`).join("\n")}` : "");
  return [
    r.summary,
    list("Fristen und Termine", r.deadlines.map((d) => `${d.date}: ${d.what}`)),
    list("Entscheidungen", r.decisions),
    list("Offene Punkte", r.open_items.map((o) => [o.task, o.owner, o.due].filter(Boolean).join(" · "))),
    list("Risiken", r.risks),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function SummaryTab({ initialText = "", onOpenDay }: { initialText?: string; onOpenDay?: (day: string) => void }) {
  const beispiel = useBeispiel();
  const [saveDay, setSaveDay] = useState("");
  const [savedDay, setSavedDay] = useState("");
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
      setSavedDay("");
      setSaveDay(isoDay());
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
      <section>
        <p className={kicker}>Protokolle · E-Mails</p>
        <h1 className={h1}>Unterlagen</h1>
        <div>
          <VoiceField
            id="docs"
            label="Text zum Zusammenfassen"
            multiline
            className={`line-field overflow-y-auto ${result ? "min-h-28 max-h-40" : "min-h-40 max-h-[45vh]"}`}
            placeholder="Text hier einfügen …"
            value={text}
            onChange={setText}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {text.trim() && (result ? <button className={linkBtn} onClick={summarise}>Neu zusammenfassen</button> : <button className={`${btnPrimary} open-in`} onClick={summarise}>Zusammenfassen</button>)}
            {beispiel && <button className={greyLink} onClick={() => load("protokoll")}>Beispiel laden: Protokoll</button>}
            {beispiel && <button className={greyLink} onClick={() => load("email")}>Beispiel laden: E-Mails</button>}
          </div>
          {error && <div className="mt-8"><ErrorBox message={error} onRetry={summarise} /></div>}
        </div>
      </section>

      {result && (
        <section className="fade-in mt-14">
          <div className="flex flex-col gap-12">
            {result.deadlines.length > 0 && (
              <Section title="Fristen und Termine">
                <ul>
                  {result.deadlines.map((d, i) => (
                    <li key={i} className={`${row} flex flex-col gap-x-6 sm:flex-row sm:items-baseline`}>
                      <span className="shrink-0 font-serif text-[20px] font-bold whitespace-nowrap text-[var(--urgent)] sm:w-36">{d.date}</span>
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

          <div className="mt-12 border-t border-[var(--ink)] pt-4">
            {savedDay ? (
              <p role="status" className="flex flex-wrap items-center gap-x-4">
                <span className={kicker}>Im Tagesbericht vom {formatDate(dayDate(savedDay), true)} gespeichert</span>
                {onOpenDay && <button className={linkBtn} onClick={() => onOpenDay(savedDay)}>Zum Tagesbericht →</button>}
              </p>
            ) : (
              <form
                className="flex flex-wrap items-end gap-x-5 gap-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!saveDay) return;
                  addEntry({ kind: "zusammenfassung", date: saveDay, time: clock(), title: "Zusammenfassung", text: summaryText(result) });
                  setSavedDay(saveDay);
                }}
              >
                <div>
                  <label htmlFor="sum-day" className="block font-sans text-[12px] font-bold tracking-[.06em] text-[var(--grey)] uppercase">Datum</label>
                  <input id="sum-day" type="date" className="min-h-11 border-0 border-b border-[var(--ink)] bg-transparent font-sans text-[16px]" value={saveDay} onChange={(e) => setSaveDay(e.target.value)} required />
                </div>
                <button type="submit" className={`${btnPrimary} w-full min-[600px]:w-auto`}>Als Tagesbericht speichern</button>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
