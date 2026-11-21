"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, btnSecondary, card, field, h1, h2, linkBtn } from "../lib/ui";
import { ErrorBox, Loading } from "./Status";

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
      setResult(await postJson<SummaryResult>("/api/summary", { input: text }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <label htmlFor="docs" className={h1}>Zusammenfassen</label>
      <p className="-mt-2 text-[var(--muted)]">Bautagebuch, Protokoll oder E-Mails einfügen – Sie erhalten Fristen, Entscheidungen, offene Punkte und Risiken.</p>
      {!text.trim() && !result && (
        <div className={`${card} bg-[var(--surface)]`}>
          <p>Noch kein Text eingefügt. Laden Sie ein Beispiel:</p>
          <div className="flex flex-wrap gap-x-6">
            <button className={linkBtn} onClick={() => load("protokoll")}>Beispiel laden: Protokoll</button>
            <button className={linkBtn} onClick={() => load("email")}>Beispiel laden: E-Mails</button>
          </div>
        </div>
      )}
      <textarea
        id="docs"
        className={`${field} ${result ? "min-h-28" : "min-h-56"}`}
        placeholder="Text hier einfügen – mehrere Einträge oder E-Mails sind möglich …"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button className={result ? btnSecondary : btnPrimary} onClick={summarise} disabled={busy || !text.trim()}>Zusammenfassen</button>
      </div>
      {busy && <Loading text="Text wird zusammengefasst …" />}
      {error && <ErrorBox message={error} onRetry={summarise} />}

      {result && (
        <div className="mt-2 flex flex-col gap-4">
          {result.deadlines.length > 0 && (
            <div className={`${card} border-[var(--warning-border)]`}>
              <h3 className={h2}>Fristen und Termine</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {result.deadlines.map((d, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:gap-3">
                    <span className="shrink-0 rounded-md bg-[var(--warning-bg)] px-2 font-bold text-[var(--warning-text)]">{d.date}</span>
                    <span>{d.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={card}>
            <h3 className={h2}>Zusammenfassung</h3>
            <p className="mt-1">{result.summary}</p>
          </div>

          {result.decisions.length > 0 && (
            <div className={card}>
              <h3 className={h2}>Entscheidungen</h3>
              <ul className="mt-1 list-disc pl-5">
                {result.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {result.open_items.length > 0 && (
            <div className={card}>
              <h3 className={h2}>Offene Punkte</h3>
              <table className="mt-2 w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2 pr-2">Aufgabe</th>
                    <th className="w-[40%] py-2">Wer / bis wann</th>
                  </tr>
                </thead>
                <tbody>
                  {result.open_items.map((o, i) => (
                    <tr key={i} className="border-b border-[var(--border)] align-top last:border-0">
                      <td className="break-words py-2 pr-2">{o.task}</td>
                      <td className="break-words py-2">
                        <span className="block">{o.owner || "offen"}</span>
                        <span className={`block font-semibold ${o.due && o.due !== "offen" ? "text-[var(--warning-text)]" : "text-[var(--muted)]"}`}>
                          {o.due || "offen"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.risks.length > 0 && (
            <div className={card}>
              <h3 className={h2}>Risiken</h3>
              <ul className="mt-1 list-disc pl-5">
                {result.risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
