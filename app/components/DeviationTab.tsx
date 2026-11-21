"use client";

import { useState } from "react";
import project from "@/data/project.json";
import { urgency } from "@/lib/dates";
import { LETTER_LABELS, type Deviation, type DeviationResult, type LetterType } from "@/lib/types";
import type { DraftSource } from "./LetterFlow";
import { errorText, postJson } from "../lib/api";
import { euro, numberFact } from "../lib/checks";
import { loadSamples } from "../lib/samples";
import { btnPrimary, greyLink, h1, itemHead, kicker, meta, shortType } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import { ErrorBox, TypeSquare } from "./Status";

type Props = {
  initialText?: string;
  onDraft: (text: string, letterType: LetterType, source: DraftSource) => void;
};

/** Text handed to the letter flow: what happened, per the report and the plan. */
function draftText(d: Deviation) {
  return [`${d.activity}: ${d.actual}`, `Geplant laut Bauzeitenplan: ${d.planned}`, d.explanation].filter(Boolean).join("\n");
}

const STEPS = ["Lese den Bericht", "Vergleiche mit dem Bauzeitenplan", "Bewerte Abweichungen"];

export default function DeviationTab({ initialText = "", onDraft }: Props) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<DeviationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sampleIndex, setSampleIndex] = useState(0);
  // After a check the report collapses, so the result is visible without scrolling.
  const [showReport, setShowReport] = useState(true);

  async function loadExample() {
    setError("");
    try {
      const { reports } = await loadSamples();
      // Sample 1 is the demo story (today's report), then the calm report from yesterday.
      setText(reports[sampleIndex % reports.length]?.text ?? "");
      setSampleIndex((i) => i + 1);
      setResult(null);
      setShowReport(true);
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function check() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await atLeast(900, postJson<DeviationResult>("/api/deviation", { input: text })));
      setShowReport(false);
      window.scrollTo({ top: 0 });
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
  const notices = deviations.filter((d) => d.suggested_letter);
  const others = deviations.filter((d) => !d.suggested_letter);
  const reportTitle = text.split("\n").find((l) => l.trim())?.trim() || "Bericht";

  if (busy) return <CraneLoader label="Tagesbericht wird geprüft" steps={STEPS} />;

  return (
    <div className="fade-in">
      {result && notices.map((d, i) => (
        <NoticeBand key={i} d={d} onDraft={() => onDraft(draftText(d), d.suggested_letter as LetterType, { facts: d.facts, eventDate: d.event_date, report: text })} />
      ))}

      {!result || showReport ? (
        <section className="wrap pt-14 pb-10">
          <p className={`${kicker} text-[var(--navy)]`}>Abgleich mit dem Bauzeitenplan</p>
          <h1 className={`${h1} mt-3 mb-8`}>Tagesbericht prüfen</h1>
          <div className="max-w-[760px]">
            <textarea
              id="report"
              aria-label="Bautagesbericht"
              className="line-field max-h-[45vh] min-h-56 overflow-y-auto font-serif text-[18px] leading-[1.6]"
              placeholder="Bautagesbericht hier einfügen …"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <button className={btnPrimary} onClick={check} disabled={!text.trim()}>Bericht prüfen</button>
              <button className={greyLink} onClick={loadExample}>{text.trim() ? "Anderes Beispiel laden" : "Beispiel laden"}</button>
            </div>
            {error && <div className="mt-6"><ErrorBox message={error} onRetry={check} /></div>}
          </div>
        </section>
      ) : (
        <section className="wrap pt-6">
          <p className="flex flex-wrap items-center gap-x-4">
            <span className={meta}>{reportTitle} · mit dem Bauzeitenplan abgeglichen</span>
            <button className={greyLink} onClick={() => setShowReport(true)}>Bericht anzeigen</button>
          </p>
        </section>
      )}

      {result && (
        <section className="wrap pt-6 pb-12">
          {deviations.length === 0 && (
            <div className="border-t-2 border-[var(--ink)] pt-3">
              <p className={`${kicker} text-[var(--green)]`}>Keine Abweichung</p>
              <p className={`${itemHead} mt-2`}>Keine Abweichung vom Bauzeitenplan gefunden.</p>
            </div>
          )}
          {others.length > 0 && (
            <div className="border-t-2 border-[var(--ink)] pt-3">
              {others.map((d, i) => (
                <article key={i} className="border-b border-[var(--rule)] py-4">
                  <p className={`${kicker} flex items-center gap-2 text-[var(--navy)]`}>
                    <TypeSquare color="var(--navy)" size={10} /> Im Blick · keine Anzeige nötig
                  </p>
                  <h3 className={`${itemHead} mt-1`}>{d.activity}</h3>
                  <p className="mt-1">{d.actual}</p>
                  {d.explanation && <p className="mt-1 italic text-[var(--grey)]">{d.explanation}</p>}
                </article>
              ))}
            </div>
          )}
          {result.summary && <p className="mt-6 max-w-[760px] italic text-[var(--grey)]">{result.summary}</p>}
        </section>
      )}
    </div>
  );
}

/** A deviation that needs a letter: full-bleed red band, crew blocks, key facts, the main button. */
function NoticeBand({ d, onDraft }: { d: Deviation; onDraft: () => void }) {
  const u = urgency(d.event_date);
  const type = shortType(LETTER_LABELS[d.suggested_letter as LetterType]);
  const status = d.actual.split(/[:.]/)[0].trim();
  const headline = status && status.length < 60 ? `${d.activity}: ${status}` : d.activity;
  const idle = numberFact(d.facts?.arbeitskraefte_ohne_produktive_arbeit);
  const moved = numberFact(d.facts?.arbeitskraefte_umgesetzt);
  const perDay = idle ? Number(idle) * project.kosten.arbeitsstunden_pro_tag * project.kosten.verrechnungssatz_eur_h : NaN;
  const ursache = typeof d.facts?.ursache === "string" ? d.facts.ursache : d.reason;
  const gefaehrdet = typeof d.facts?.auswirkung === "string" ? d.facts.auswirkung : "";
  const rows: [string, string][] = [
    ["Ursache", ursache],
    ["Gefährdet", gefaehrdet],
    ["Pro Tag", Number.isFinite(perDay) ? `${euro(perDay)} Personal (Schätzung)` : ""],
  ].filter(([, v]) => v) as [string, string][];
  const crew = idle || moved ? [...Array(Number(idle || 0)).fill("idle"), ...Array(Number(moved || 0)).fill("moved")] : [];
  const crewText = [idle && `${idle} ohne Arbeit`, moved && `${moved} umgesetzt`].filter(Boolean).join(" · ");

  return (
    <article>
      <div className="on-dark bg-[var(--red)] text-white">
        <div className="wrap py-9">
          <p className={kicker}>Abweichung · Bautagesbericht {d.event_date}</p>
          <h2 className="mt-3 max-w-[900px] font-serif text-[clamp(31px,4.6vw,48px)] font-bold leading-[1.05] tracking-[-.02em] [text-wrap:balance]">{headline}</h2>
          <p className="mt-3 font-sans text-[15px] font-bold">{type} empfohlen · {u.text}</p>
        </div>
      </div>
      {/* Phones: the main button right under the band. */}
      <div className="wrap pt-5 sm:hidden">
        <button className={`${btnPrimary} w-full`} onClick={onDraft}>Anzeige entwerfen</button>
      </div>
      <div className="wrap flex flex-wrap items-end gap-x-14 gap-y-6 pt-7">
        {crew.length > 0 && crew.length <= 24 && (
          <div>
            <div role="img" aria-label={crewText} className="flex gap-2">
              {crew.map((k, i) => (
                <span
                  key={i}
                  className={`pop block h-11 min-w-0 flex-1 sm:h-14 sm:w-10 sm:flex-none ${k === "idle" ? "bg-[var(--red)]" : "border-2 border-[var(--ink)]"}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
            <p className="mt-2 font-sans text-[14px] font-semibold">{crewText}</p>
          </div>
        )}
        {rows.length > 0 && (
          <dl className="min-w-[280px] flex-1 border-t border-[var(--rule)]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 border-b border-[var(--rule)] py-2">
                <dt className="shrink-0 font-sans text-[14px] text-[var(--grey)]">{k}</dt>
                <dd className="text-right text-[17px] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="wrap pt-6">
        <button className={`${btnPrimary} hidden sm:inline-flex`} onClick={onDraft}>Anzeige entwerfen</button>
        {d.explanation && <p className="mt-3 max-w-[760px] text-[16px] italic text-[var(--grey)]">{d.explanation}</p>}
      </div>
    </article>
  );
}
