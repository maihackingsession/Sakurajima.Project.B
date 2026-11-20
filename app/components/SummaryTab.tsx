"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, card, field, linkBtn } from "../lib/ui";

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
    <section className="flex flex-col gap-3">
      <label htmlFor="docs" className="text-lg font-bold">Bautagebuch, Protokoll oder E-Mails</label>
      <textarea
        id="docs"
        className={`${field} min-h-56`}
        placeholder="Text hier einfügen – mehrere Einträge oder E-Mails sind möglich …"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-x-4">
        <button className={linkBtn} onClick={() => load("protokoll")}>Beispiel laden: Protokoll</button>
        <button className={linkBtn} onClick={() => load("email")}>Beispiel laden: E-Mails</button>
      </div>
      <button className={btnPrimary} onClick={summarise} disabled={busy || !text.trim()}>
        {busy ? "Wird zusammengefasst …" : "Zusammenfassen"}
      </button>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      {result && (
        <div className="mt-2 flex flex-col gap-3">
          {result.deadlines.length > 0 && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4">
              <h3 className="text-lg font-bold text-red-900">Fristen und Termine</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {result.deadlines.map((d, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:gap-3">
                    <span className="shrink-0 font-bold text-red-900">{d.date}</span>
                    <span>{d.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={card}>
            <h3 className="text-lg font-bold">Zusammenfassung</h3>
            <p className="mt-1">{result.summary}</p>
          </div>

          {result.decisions.length > 0 && (
            <div className={card}>
              <h3 className="text-lg font-bold">Entscheidungen</h3>
              <ul className="mt-1 list-disc pl-5">
                {result.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {result.open_items.length > 0 && (
            <div className={card}>
              <h3 className="text-lg font-bold">Offene Punkte</h3>
              <table className="mt-2 w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th className="py-2 pr-2">Aufgabe</th>
                    <th className="w-[40%] py-2">Wer / bis wann</th>
                  </tr>
                </thead>
                <tbody>
                  {result.open_items.map((o, i) => (
                    <tr key={i} className="border-b border-neutral-100 align-top">
                      <td className="break-words py-2 pr-2">{o.task}</td>
                      <td className="break-words py-2">
                        <span className="block">{o.owner || "offen"}</span>
                        <span className={`block font-semibold ${o.due && o.due !== "offen" ? "text-red-800" : "text-neutral-500"}`}>
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
            <div className="rounded-xl border border-amber-400 bg-amber-50 p-4">
              <h3 className="text-lg font-bold text-amber-950">Risiken</h3>
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
