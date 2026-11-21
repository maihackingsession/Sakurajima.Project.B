"use client";

import { useState } from "react";
import { urgency } from "@/lib/dates";
import { LETTER_LABELS, type Deviation, type DeviationResult, type LetterType } from "@/lib/types";
import type { DraftSource } from "./LetterFlow";
import { errorText, postJson } from "../lib/api";
import { loadSamples } from "../lib/samples";
import { btnPrimary, btnSecondary, card, field, h1, h2, hint, linkBtn } from "../lib/ui";
import Chip from "./Chip";
import { ErrorBox, Loading } from "./Status";

type Props = {
  initialText?: string;
  onDraft: (text: string, letterType: LetterType, source: DraftSource) => void;
};

/** Text handed to the letter flow: what happened, per the report and the plan. */
function draftText(d: Deviation) {
  return [`${d.activity}: ${d.actual}`, `Geplant laut Bauzeitenplan: ${d.planned}`, d.explanation].filter(Boolean).join("\n");
}

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
      // Sample 1 is the demo story (today's report), then the calm report from yesterday.
      setText(reports[sampleIndex % reports.length]?.text ?? "");
      setSampleIndex((i) => i + 1);
      setResult(null);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function check() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await postJson<DeviationResult>("/api/deviation", { input: text }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // Notices first, then by severity.
  const rank = { hoch: 0, mittel: 1, niedrig: 2 } as const;
  const deviations = [...(result?.deviations ?? [])].sort(
    (a, b) => Number(!a.suggested_letter) - Number(!b.suggested_letter) || rank[a.severity] - rank[b.severity],
  );
  const hasNotice = deviations.some((d) => d.suggested_letter);

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <label htmlFor="report" className={h1}>Tagesbericht prüfen</label>
      <p className="-mt-2 text-[var(--muted)]">Bautagesbericht einfügen – Baufrist gleicht ihn mit dem Bauzeitenplan ab und erkennt, wann eine Anzeige nötig ist.</p>
      {!text.trim() && !result && (
        <div className={`${card} flex flex-col items-start gap-1 bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between`}>
          <p>Noch kein Bericht eingefügt.</p>
          <button className={linkBtn} onClick={loadExample}>Beispiel laden</button>
        </div>
      )}
      <textarea
        id="report"
        className={`${field} ${result ? "min-h-28" : "min-h-64"} font-mono text-[15px]`}
        placeholder="Bautagesbericht hier einfügen …"
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button className={result && hasNotice ? btnSecondary : btnPrimary} onClick={check} disabled={busy || !text.trim()}>
          Bericht prüfen
        </button>
        {text.trim() && <button className={linkBtn} onClick={loadExample} disabled={busy}>Anderes Beispiel laden</button>}
      </div>
      {busy && <Loading text="Tagesbericht wird geprüft …" />}
      {error && <ErrorBox message={error} onRetry={check} />}

      {result && (
        <div className="mt-2 flex flex-col gap-4">
          {deviations.length === 0 && (
            <div className={`${card} bg-[var(--surface)]`}>
              <Chip kind="keine" />
              <p className={`${h2} mt-2`}>Keine Abweichung vom Bauzeitenplan gefunden.</p>
              {result.summary && <p className="mt-1 text-[var(--muted)]">{result.summary}</p>}
            </div>
          )}
          {deviations.map((d, i) =>
            d.suggested_letter ? (
              <NoticeCard key={i} d={d} onDraft={() => onDraft(draftText(d), d.suggested_letter as LetterType, { facts: d.facts, eventDate: d.event_date, report: text })} />
            ) : (
              <article key={i} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`${h2} min-w-0 break-words`}>{d.activity}</h3>
                  <Chip kind="keine" />
                </div>
                <p className="mt-1">{d.actual}</p>
                {d.explanation && <p className={`${hint} mt-1`}>{d.explanation}</p>}
              </article>
            ),
          )}
          {deviations.length > 0 && result.summary && <p className={hint}>{result.summary}</p>}
        </div>
      )}
    </section>
  );
}

/** The most prominent element: a deviation that needs a formal notice. */
function NoticeCard({ d, onDraft }: { d: Deviation; onDraft: () => void }) {
  const u = urgency(d.event_date);
  const kind = LETTER_LABELS[d.suggested_letter as LetterType];
  return (
    <article className="rounded-xl border-2 border-[var(--accent)] bg-white p-5 shadow-[0_2px_10px_rgba(232,113,10,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip kind="pruefung">{kind.split(" (")[0]} empfohlen</Chip>
        <span className={`text-base font-bold ${u.late ? "text-[var(--error-text)]" : "text-[var(--accent-hover)]"}`}>
          ⏱ {u.text}
        </span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold text-[var(--navy)]">{d.activity}</h3>
      {d.reason && <p className="mt-1 text-lg font-semibold text-[var(--navy)]">{d.reason}</p>}
      <dl className="mt-3 grid gap-1 text-[15px] sm:grid-cols-[110px_1fr]">
        <dt className="font-semibold text-[var(--muted)]">Geplant</dt>
        <dd>{d.planned}</dd>
        <dt className="font-semibold text-[var(--muted)]">Tatsächlich</dt>
        <dd>{d.actual}</dd>
      </dl>
      {d.explanation && <p className={`${hint} mt-2`}>{d.explanation}</p>}
      <button className={`${btnPrimary} mt-4`} onClick={onDraft}>Anzeige entwerfen</button>
    </article>
  );
}
