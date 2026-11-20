"use client";

import { useState } from "react";
import { LETTER_LABELS, type DeviationResult, type LetterType } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, card, field, linkBtn } from "../lib/ui";

const SEVERITY_STYLE = {
  hoch: "border-red-400 bg-red-50",
  mittel: "border-amber-400 bg-amber-50",
  niedrig: "border-neutral-300 bg-white",
} as const;
const SEVERITY_BADGE = {
  hoch: "bg-red-600 text-white",
  mittel: "bg-amber-500 text-amber-950",
  niedrig: "bg-neutral-200 text-neutral-800",
} as const;

type Props = {
  initialText?: string;
  onDraft: (text: string, letterType: LetterType) => void;
};

export default function DeviationTab({ initialText = "", onDraft }: Props) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<DeviationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sampleIndex, setSampleIndex] = useState(0);

  async function loadExample() {
    setError("");
    try {
      const { reports } = await loadSamples();
      // Rotate through the sample reports; the ones with deviations come first.
      const order = [...reports].sort((a, b) => b.name.localeCompare(a.name));
      setText(order[sampleIndex % order.length]?.text ?? "");
      setSampleIndex((i) => i + 1);
      setResult(null);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function check() {
    setBusy(true);
    setError("");
    try {
      setResult(await postJson<DeviationResult>("/api/deviation", { input: text }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <label htmlFor="report" className="text-lg font-bold">Tagesbericht</label>
      <textarea
        id="report"
        className={`${field} min-h-56`}
        placeholder="Bautagesbericht hier einfügen oder diktieren …"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>
        <button className={linkBtn} onClick={loadExample}>Beispiel-Bericht laden</button>
      </div>
      <button className={btnPrimary} onClick={check} disabled={busy || !text.trim()}>
        {busy ? "Wird abgeglichen …" : "Mit Bauzeitenplan abgleichen"}
      </button>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      {result && (
        <div className="mt-2 flex flex-col gap-3">
          {result.summary && <p className={card}>{result.summary}</p>}
          {result.deviations.length === 0 && (
            <p className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-900">
              Keine Abweichungen vom Bauzeitenplan gefunden.
            </p>
          )}
          {result.deviations.map((d, i) => (
            <article key={i} className={`rounded-xl border-2 p-4 ${SEVERITY_STYLE[d.severity]}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 break-words text-lg font-bold">{d.activity}</h3>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-sm font-bold ${SEVERITY_BADGE[d.severity]}`}>
                  {d.severity}
                </span>
              </div>
              <dl className="mt-2 grid gap-1 text-sm">
                <div><dt className="inline font-semibold">Geplant: </dt><dd className="inline">{d.planned}</dd></div>
                <div><dt className="inline font-semibold">Tatsächlich: </dt><dd className="inline">{d.actual}</dd></div>
              </dl>
              {d.explanation && <p className="mt-2">{d.explanation}</p>}
              {d.suggested_letter && (
                <button
                  className={`${btnPrimary} mt-3`}
                  onClick={() =>
                    onDraft(
                      `${d.activity}: ${d.actual}\nGeplant laut Bauzeitenplan: ${d.planned}\n${d.explanation}`,
                      d.suggested_letter as LetterType,
                    )
                  }
                >
                  Anzeige entwerfen: {LETTER_LABELS[d.suggested_letter]}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
