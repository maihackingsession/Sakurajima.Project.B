"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LETTER_LABELS } from "@/lib/types";
import { dateLine, exportDocx, paragraphs, senderLine, signature } from "../lib/export";
import { h1, issueTitle, itemHead, kicker, linkBtn, linkOnDark, meta, shortType, TYPE_COLOR } from "../lib/ui";
import { useVerlaufEntries, withDeadlines } from "../lib/useVerlauf";
import { DEADLINE_LABEL, clearVerlauf, countdown, letterDateOf, letterOf, type VerlaufEntry } from "../lib/verlauf";
import { approvalTime, PrintSheet } from "./DraftEditor";
import { TypeSquare } from "./Status";

const firstLine = (s: string) => s.split("\n")[0].trim();

function Status({ deadline }: { deadline: string }) {
  const c = countdown(deadline);
  if (!c) return null;
  return <span className={`shrink-0 font-sans text-[13px] font-bold uppercase ${c.tone === "ok" ? "text-[var(--grey)]" : "text-[var(--red)]"}`}>{c.text}</span>;
}

function TypeKicker({ e }: { e: VerlaufEntry }) {
  return (
    <span className={`${kicker} flex items-center gap-2`}>
      <TypeSquare color={TYPE_COLOR[e.type]} size={10} /> {shortType(LETTER_LABELS[e.type])}{e.example ? " · Beispiel" : ""}
    </span>
  );
}

export default function VerlaufTab() {
  const { saved, showExamples, entries } = useVerlaufEntries();
  const [openId, setOpenId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const open = entries.find((e) => e.id === openId);
  const upcoming = withDeadlines(entries);
  const history = [...entries].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));

  if (open) return <SavedLetter entry={open} onBack={() => setOpenId("")} />;

  const row = "flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-4 text-left hover:bg-[#FAFAFA]";

  return (
    <div className="fade-in">
      <section className="wrap pt-16 pb-8">
        <p className={`${kicker} text-[var(--navy)]`}>Freigegebene Schreiben</p>
        <h1 className={`${h1} mt-3`}>Fristen & Verlauf</h1>
        <p className="mt-5 max-w-[760px] italic text-[var(--grey)]">Gespeichert nur in diesem Browser auf diesem Gerät – nichts wird an uns übertragen.</p>
      </section>

      <section className="wrap flex flex-col gap-12 pb-10">
        {entries.length === 0 && (
          <div className="max-w-[760px] border-t-2 border-[var(--ink)] pt-3">
            <p className={kicker}>Noch leer</p>
            <p className={`${itemHead} mt-1`}>Noch keine freigegebenen Schreiben – sobald Sie ein Schreiben freigeben, erscheint es hier mit seiner Frist.</p>
          </div>
        )}
        {showExamples && <p className={`${kicker} text-[var(--grey)]`}>Noch nichts gespeichert · zwei Beispiele aus der Demo-Geschichte</p>}

        {upcoming.length > 0 && (
          <div>
            <h2 className={`${kicker} border-t-2 border-[var(--ink)] pt-3`}>Anstehende Fristen</h2>
            <ul>
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setOpenId(e.id)} className={row}>
                    <span className="min-w-0">
                      <TypeKicker e={e} />
                      <span className={`${itemHead} mt-1 block`}>{issueTitle(e.subject, shortType(LETTER_LABELS[e.type]))}</span>
                      <span className={`${meta} mt-1 block`}>{DEADLINE_LABEL[e.type]}: {e.deadline} · An {firstLine(e.recipient)}</span>
                    </span>
                    <Status deadline={e.deadline} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h2 className={`${kicker} border-t-2 border-[var(--ink)] pt-3`}>Verlauf</h2>
            <ul>
              {history.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setOpenId(e.id)} className={row}>
                    <span className="min-w-0 flex-1">
                      <TypeKicker e={e} />
                      <span className="mt-1 block text-[19px] leading-snug">{firstLine(e.subject)}</span>
                      <span className={`${meta} mt-1 block`}>An {firstLine(e.recipient)} · freigegeben von {e.approvedBy}</span>
                    </span>
                    <span className="shrink-0 font-sans text-[13px] font-semibold text-[var(--grey)]">{approvalTime(e.approvedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saved.length > 0 && (
          <div>
            {confirming ? (
              <div role="group" aria-label="Verlauf löschen" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-[var(--red)] pt-3">
                <p className="font-serif text-[19px] font-semibold text-[var(--red)]">
                  {saved.length === 1 ? "Den gespeicherten Eintrag" : `Alle ${saved.length} Einträge`} aus diesem Browser löschen?
                </p>
                <button className={`${linkBtn} text-[var(--red)]`} onClick={() => { clearVerlauf(); setConfirming(false); }}>Ja, löschen</button>
                <button className={linkBtn} onClick={() => setConfirming(false)} autoFocus>Abbrechen</button>
              </div>
            ) : (
              <button className={linkBtn} onClick={() => setConfirming(true)}>Verlauf löschen</button>
            )}
          </div>
        )}
      </section>
    </div>
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
    <div className="fade-in">
      <section className="wrap pt-8 pb-9">
        <button className={linkBtn} onClick={onBack}>← Zurück zu Fristen & Verlauf</button>
        <p className="mt-6"><TypeKicker e={entry} /></p>
        <h1 className={`${h1} mt-3 !text-[clamp(34px,4.4vw,56px)] !leading-[1.05]`}>{issueTitle(entry.subject, shortType(title))}</h1>
        <p className={`${meta} mt-4 flex flex-wrap gap-x-4`}>
          <span>An {firstLine(entry.recipient)}</span>
          {entry.deadline && <span>{DEADLINE_LABEL[entry.type]}: {entry.deadline}</span>}
          {entry.deadline && <Status deadline={entry.deadline} />}
        </p>
      </section>

      <div className="on-dark bg-[var(--green)] text-white">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-8 gap-y-1 py-3">
          <p className="font-sans text-[15px] font-bold">Freigegeben · {entry.approvedBy}, {approvalTime(entry.approvedAt)}</p>
          <div className="flex gap-x-5">
            <button className={linkOnDark} onClick={word}>Word</button>
            <button className={linkOnDark} onClick={pdf}>PDF</button>
          </div>
        </div>
      </div>
      {error && <div className="wrap pt-4"><p role="alert" className="font-sans text-[15px] font-bold text-[var(--red)]">{error}</p></div>}

      <div className="wrap pt-12 pb-6">
        <article
          aria-label="Schreiben (nur lesen)"
          className="relative max-w-[680px] pt-7 text-[18px] leading-[1.65]"
          style={{ borderTop: `6px solid ${TYPE_COLOR[entry.type]}` }}
        >
          <p className="border-b border-[var(--rule)] pb-1 font-sans text-[13px] text-[var(--grey)]">{senderLine}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <p className="whitespace-pre-line">{letter.recipient}</p>
            <p className="shrink-0 whitespace-nowrap sm:pt-[4.95em] sm:text-right">{dateLine(date)}</p>
          </div>
          <p className="mt-7 font-bold whitespace-pre-line">{letter.subject}</p>
          <p className="mt-6">{letter.salutation}</p>
          {paragraphs(letter.body).map((p, i) => (
            <p key={i} className="mt-4 whitespace-pre-line">{p}</p>
          ))}
          <p className="mt-6">{letter.closing}</p>
          <p className="mt-1 whitespace-pre-line">{signature.join("\n")}</p>
          <div className="stamp absolute top-[55%] right-[4%] border-[3px] border-[var(--green)] bg-white/75 px-[18px] pt-[10px] pb-2 text-center text-[var(--green)]" aria-hidden>
            <p className="font-sans text-[26px] leading-none font-extrabold tracking-[.08em]">FREIGEGEBEN</p>
            <p className="mt-1 font-sans text-[13px] font-bold">{approvalTime(entry.approvedAt)} · {entry.approvedBy}</p>
          </div>
        </article>
        <p className="mt-6 italic text-[var(--grey)]">Nur lesen. PDF: im Druckdialog „Als PDF speichern“ wählen.</p>
      </div>

      {createPortal(<PrintSheet draft={letter} isDraft={false} date={date} sheet="verlauf" />, document.body)}
    </div>
  );
}
