"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { parseGermanDate } from "@/lib/dates";
import { LETTER_LABELS } from "@/lib/types";
import { isBeispiel } from "../lib/api";
import { dateLine, exportDocx, paragraphs, senderLine, signature } from "../lib/export";
import { btnBase, btnPrimary, btnSecondary, card, h1, h2, hint, linkBtn } from "../lib/ui";
import {
  DEADLINE_LABEL,
  clearVerlauf,
  countdown,
  exampleEntries,
  getVerlauf,
  getVerlaufServer,
  letterDateOf,
  letterOf,
  subscribeVerlauf,
  type VerlaufEntry,
} from "../lib/verlauf";
import { approvalTime, PrintSheet } from "./DraftEditor";

const noop = () => () => {};
const TONE = {
  ok: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
  soon: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
  late: "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]",
};

const time = (d: string) => parseGermanDate(d)?.getTime() ?? 0;
const firstLine = (s: string) => s.split("\n")[0].trim();

function Countdown({ deadline }: { deadline: string }) {
  const c = countdown(deadline);
  if (!c) return null;
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-bold ${TONE[c.tone]}`}>{c.text}</span>;
}

export default function VerlaufTab() {
  const saved = useSyncExternalStore(subscribeVerlauf, getVerlauf, getVerlaufServer);
  const beispiel = useSyncExternalStore(noop, isBeispiel, () => false);
  const [openId, setOpenId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const showExamples = saved.length === 0 && beispiel;
  const entries = showExamples ? exampleEntries() : saved;
  const open = entries.find((e) => e.id === openId);
  const upcoming = entries.filter((e) => e.deadline).sort((a, b) => time(a.deadline) - time(b.deadline));
  const history = [...entries].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));

  if (open) return <SavedLetter entry={open} onBack={() => setOpenId("")} />;

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div>
        <h1 className={h1}>Fristen & Verlauf</h1>
        <p className={`${hint} mt-1`}>Gespeichert nur in diesem Browser auf diesem Gerät – nichts wird an uns übertragen.</p>
      </div>

      {entries.length === 0 && (
        <div className={card}>
          <p>Noch keine freigegebenen Schreiben – sobald Sie ein Schreiben freigeben, erscheint es hier mit seiner Frist.</p>
        </div>
      )}
      {showExamples && (
        <p className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-2 text-[15px] text-[var(--warning-text)]">
          Noch nichts gespeichert. Zwei <strong>Beispiele</strong> aus der Demo-Geschichte:
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className={h2}>Anstehende Fristen</h2>
          {upcoming.map((e) => (
            <button key={e.id} onClick={() => setOpenId(e.id)} className={`${card} flex flex-col gap-1.5 py-4 text-left hover:border-[var(--ink)]`}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold">{e.deadline}</span>
                <Countdown deadline={e.deadline} />
              </span>
              <span className="font-semibold">{DEADLINE_LABEL[e.type]} · {LETTER_LABELS[e.type].split(" (")[0]}</span>
              <span className="text-[15px] text-[var(--muted)]">An {firstLine(e.recipient)}</span>
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <h2 className={h2}>Freigegebene Schreiben</h2>
          <ul className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
            {history.map((e) => (
              <li key={e.id} className="border-b border-[var(--border)] last:border-b-0">
                <button onClick={() => setOpenId(e.id)} className="flex w-full flex-col gap-0.5 px-5 py-3 text-left hover:bg-[var(--surface)]">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-bold">{LETTER_LABELS[e.type].split(" (")[0]}{e.example ? " (Beispiel)" : ""}</span>
                    <span className="text-sm text-[var(--muted)]">{approvalTime(e.approvedAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-[15px]">{firstLine(e.subject)}</span>
                  <span className="text-sm text-[var(--muted)]">An {firstLine(e.recipient)} · freigegeben von {e.approvedBy}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {saved.length > 0 && (
        <div className="mt-2">
          {confirming ? (
            <div role="group" aria-label="Verlauf löschen" className="flex flex-col gap-3 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 sm:flex-row sm:items-center">
              <p className="font-semibold text-[var(--error-text)] sm:flex-1">
                {saved.length === 1 ? "Den gespeicherten Eintrag" : `Alle ${saved.length} Einträge`} aus diesem Browser löschen?
              </p>
              <button className={`${btnBase} border-2 border-[var(--error-text)] bg-white text-base text-[var(--error-text)] hover:bg-[var(--error-bg)]`} onClick={() => { clearVerlauf(); setConfirming(false); }}>Ja, löschen</button>
              <button className={btnSecondary} onClick={() => setConfirming(false)} autoFocus>Abbrechen</button>
            </div>
          ) : (
            <button className={linkBtn} onClick={() => setConfirming(true)}>Verlauf löschen</button>
          )}
        </div>
      )}
    </section>
  );
}

/** A saved letter, read-only, with Word / PDF export. */
function SavedLetter({ entry, onBack }: { entry: VerlaufEntry; onBack: () => void }) {
  const letter = letterOf(entry);
  const date = letterDateOf(entry);
  const title = LETTER_LABELS[entry.type];
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const done = () => delete document.body.dataset.print;
    window.addEventListener("afterprint", done);
    return () => {
      window.removeEventListener("afterprint", done);
      done();
    };
  }, []);

  async function word() {
    setError("");
    try {
      await exportDocx(letter, title, false, date);
    } catch {
      setError("Word-Export fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  function pdf() {
    document.body.dataset.print = "verlauf";
    window.print();
  }

  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <div>
        <button className={linkBtn} onClick={onBack}>← Zurück zu Fristen & Verlauf</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>{title}{entry.example ? " (Beispiel)" : ""}</h1>
        {entry.deadline && <Countdown deadline={entry.deadline} />}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button className={btnPrimary} onClick={word}>Word</button>
        <button className={btnSecondary} onClick={pdf}>PDF</button>
      </div>
      {error && <p role="alert" className="font-semibold text-[var(--error-text)]">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-[var(--border)] shadow-[0_1px_3px_rgba(26,26,26,0.08)]">
        <div className="border-b border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-2 text-center text-base font-bold text-[var(--success-text)]">
          Freigegeben von {entry.approvedBy} am {approvalTime(entry.approvedAt)}
        </div>
        <article aria-label="Schreiben (nur lesen)" className="bg-white px-5 py-6 text-[16px] leading-relaxed text-[#111827] sm:px-12 sm:py-8">
          <p className="border-b border-[var(--border)] pb-1 text-xs text-[var(--muted)]">{senderLine}</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <p className="whitespace-pre-line">{letter.recipient}</p>
            <p className="shrink-0 sm:pt-[4.5em] sm:text-right">{dateLine(date)}</p>
          </div>
          <p className="mt-6 font-bold whitespace-pre-line">{letter.subject}</p>
          <p className="mt-5">{letter.salutation}</p>
          {paragraphs(letter.body).map((p, i) => (
            <p key={i} className="mt-3 whitespace-pre-line">{p}</p>
          ))}
          <p className="mt-5">{letter.closing}</p>
          <p className="mt-1 whitespace-pre-line">{signature.join("\n")}</p>
        </article>
      </div>
      <p className={hint}>Nur lesen. PDF: im Druckdialog „Als PDF speichern“ wählen.</p>

      {createPortal(<PrintSheet draft={letter} isDraft={false} date={date} sheet="verlauf" />, document.body)}
    </section>
  );
}
