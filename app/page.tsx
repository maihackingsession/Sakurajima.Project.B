"use client";

import { useState } from "react";
import { LETTER_TYPES, type Letter, type LetterType } from "./lib/letter";
import { exportDocx, exportPdf } from "./lib/export";

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30";
const label = "mb-1 block text-sm font-medium";
const bigButton =
  "w-full rounded-lg px-4 py-4 text-lg font-semibold disabled:opacity-50";

export default function Home() {
  const [input, setInput] = useState("");
  const [letterType, setLetterType] = useState<LetterType>(LETTER_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Letter | null>(null);
  const [exporting, setExporting] = useState<"" | "docx" | "pdf">("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, letterType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unbekannter Fehler.");
      setDraft(data as Letter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function runExport(kind: "docx" | "pdf") {
    if (!draft) return;
    setExporting(kind);
    setError("");
    try {
      await (kind === "docx" ? exportDocx(draft) : exportPdf(draft));
    } catch {
      setError("Export fehlgeschlagen.");
    } finally {
      setExporting("");
    }
  }

  const update = (key: keyof Omit<Letter, "missing" | "typ">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Bauleiter-Assistent</h1>

      {!draft ? (
        <section className="flex flex-col gap-4">
          <div>
            <label htmlFor="type" className={label}>Art des Schreibens</label>
            <select
              id="type"
              className={field}
              value={letterType}
              onChange={(e) => setLetterType(e.target.value as LetterType)}
            >
              {LETTER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="input" className={label}>Situation auf der Baustelle</label>
            <textarea
              id="input"
              className={`${field} min-h-48`}
              placeholder="z. B. Bagger ausgefallen, Baustelle steht seit Dienstag, Erdarbeiten BA 2 verzögern sich …"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button
            className={`${bigButton} bg-blue-600 text-white`}
            onClick={generate}
            disabled={loading || !input.trim()}
          >
            {loading ? "Schreiben wird erstellt …" : "Schreiben erstellen"}
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{draft.typ}</h2>
            <span className="rounded-md bg-amber-500 px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
              Entwurf
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            Bitte prüfen und bearbeiten Sie den Entwurf vor der Verwendung.
            Es wird nichts automatisch versendet.
          </p>

          {draft.missing.length > 0 && (
            <div className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-900">
              <p className="mb-2 font-semibold">Fehlende Angaben – bitte ergänzen:</p>
              <ul className="list-disc pl-5">
                {draft.missing.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          <div>
            <label htmlFor="empfaenger" className={label}>Empfänger</label>
            <textarea id="empfaenger" rows={3} className={field} value={draft.empfaenger} onChange={update("empfaenger")} />
          </div>
          <div>
            <label htmlFor="betreff" className={label}>Betreff</label>
            <input id="betreff" className={field} value={draft.betreff} onChange={update("betreff")} />
          </div>
          <div>
            <label htmlFor="anrede" className={label}>Anrede</label>
            <input id="anrede" className={field} value={draft.anrede} onChange={update("anrede")} />
          </div>
          <div>
            <label htmlFor="text" className={label}>Text</label>
            <textarea id="text" className={`${field} min-h-80`} value={draft.text} onChange={update("text")} />
          </div>
          <div>
            <label htmlFor="gruss" className={label}>Grußformel</label>
            <textarea id="gruss" rows={2} className={field} value={draft.grussformel} onChange={update("grussformel")} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button className={`${bigButton} bg-blue-600 text-white`} onClick={() => runExport("docx")} disabled={!!exporting}>
              {exporting === "docx" ? "Wird erstellt …" : "Als Word (.docx)"}
            </button>
            <button className={`${bigButton} bg-blue-600 text-white`} onClick={() => runExport("pdf")} disabled={!!exporting}>
              {exporting === "pdf" ? "Wird erstellt …" : "Als PDF"}
            </button>
          </div>
          <button
            className={`${bigButton} border border-neutral-300`}
            onClick={() => setDraft(null)}
          >
            Zurück zur Eingabe
          </button>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>
      )}
    </main>
  );
}
