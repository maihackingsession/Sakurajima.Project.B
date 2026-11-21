"use client";

import { useState } from "react";
import project from "@/data/project.json";
import { urgency } from "@/lib/dates";
import { LETTER_LABELS, type Deviation, type DeviationResult, type LetterType } from "@/lib/types";
import type { DraftSource } from "./LetterFlow";
import { errorText, postJson } from "../lib/api";
import { euro, numberFact } from "../lib/checks";
import { loadSamples } from "../lib/samples";
import { btnPrimary, greyLink, h1, kicker, kickerUrgent, listHead, meta, shortType } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import { ErrorBox } from "./Status";

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
      {!result || showReport ? (
        <section>
          <p className={kicker}>Abgleich mit dem Bauzeitenplan</p>
          <h1 className={h1}>Tagesbericht prüfen</h1>
          <textarea
            id="report"
            aria-label="Bautagesbericht"
            className="line-field max-h-[45vh] min-h-[120px] overflow-y-auto"
            placeholder="Bautagesbericht hier einfügen …"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            {text.trim() && <button className={`${btnPrimary} open-in`} onClick={check}>Bericht prüfen</button>}
            <button className={greyLink} onClick={loadExample}>{text.trim() ? "Anderes Beispiel laden" : "Beispiel laden"}</button>
          </div>
          {error && <div className="mt-8"><ErrorBox message={error} onRetry={check} /></div>}
        </section>
      ) : (
        <p className="flex flex-wrap items-center gap-x-4">
          <span className={meta}>{reportTitle} · abgeglichen</span>
          <button className={greyLink} onClick={() => setShowReport(true)}>Bericht anzeigen</button>
        </p>
      )}

      {result && (
        <div className={showReport ? "mt-14" : "mt-5"}>
          {notices.map((d, i) => (
            <Notice key={i} d={d} onDraft={() => onDraft(draftText(d), d.suggested_letter as LetterType, { facts: d.facts, eventDate: d.event_date, report: text })} />
          ))}
          {deviations.length === 0 && (
            <article className="border-t-2 border-[var(--ink)] pt-3">
              <p className={kicker}>Keine Abweichung</p>
              <p className={`${listHead} mt-1`}>Keine Abweichung vom Bauzeitenplan gefunden.</p>
            </article>
          )}
          {others.map((d, i) => (
            <article key={i} className="fade-in mt-7 border-t-2 border-[var(--ink)] pt-3" style={{ animationDelay: "150ms" }}>
              <p className={kicker}>Im Blick</p>
              <p className={`${listHead} mt-1`}>{d.activity}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** A deviation that needs a letter: urgent kicker, headline, key facts, the main button. */
function Notice({ d, onDraft }: { d: Deviation; onDraft: () => void }) {
  const u = urgency(d.event_date);
  const type = shortType(LETTER_LABELS[d.suggested_letter as LetterType]);
  const status = d.actual.split(/[:.]/)[0].trim();
  const headline = status && status.length < 60 ? `${d.activity}: ${status}` : d.activity;
  const idle = numberFact(d.facts?.arbeitskraefte_ohne_produktive_arbeit);
  const planned = numberFact(d.facts?.arbeitskraefte_geplant);
  const perDay = idle ? Number(idle) * project.kosten.arbeitsstunden_pro_tag * project.kosten.verrechnungssatz_eur_h : NaN;
  const ursache = typeof d.facts?.ursache === "string" ? d.facts.ursache : d.reason;
  const gefaehrdet = typeof d.facts?.auswirkung === "string" ? d.facts.auswirkung : "";
  const rows: [string, string][] = (
    [
      ["Ursache", ursache],
      ["Ohne Arbeit", idle ? (planned ? `${idle} von ${planned} Leuten` : `${idle} Leute`) : ""],
      ["Gefährdet", gefaehrdet],
    ] as [string, string][]
  ).filter(([, v]) => v);
  const when = u.late ? `seit ${u.days} Tagen – sofort anzeigen` : "heute anzeigen";

  return (
    <article className="fade-in mb-2">
      <p className={kickerUrgent} title={type}>Abweichung · {when}</p>
      <h2 className="mt-[6px] mb-[14px] font-serif text-[29px] leading-[1.1] font-bold tracking-[-.01em] min-[600px]:text-[30px]">{headline}</h2>
      <dl className="border-t border-[var(--ink)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-[var(--rule)] py-[10px]">
            <dt className="shrink-0 font-sans text-[13px] text-[var(--grey)]">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
        {Number.isFinite(perDay) && (
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] py-[10px]">
            <dt className="font-sans text-[13px] text-[var(--grey)]">Pro Tag</dt>
            <dd className="text-[24px] font-bold whitespace-nowrap">{euro(perDay)}</dd>
          </div>
        )}
      </dl>
      <button className={`${btnPrimary} mt-[18px] min-h-[52px] w-full text-[16px] min-[600px]:w-auto`} onClick={onDraft}>Anzeige entwerfen</button>
    </article>
  );
}
