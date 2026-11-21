"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LETTER_LABELS } from "@/lib/types";
import { dateLine, exportDocx, paragraphs, senderLine, signature } from "../lib/export";
import { h1, issueTitle, kicker, linkBtn, listHead, meta, sectionLabel, shortType } from "../lib/ui";
import { useVerlaufEntries, withDeadlines } from "../lib/useVerlauf";
import { DEADLINE_LABEL, clearVerlauf, countdown, letterDateOf, letterOf, type VerlaufEntry } from "../lib/verlauf";
import { approvalTime, PrintSheet } from "./DraftEditor";

const firstLine = (s: string) => s.split("\n")[0].trim();

function Status({ deadline }: { deadline: string }) {
  const c = countdown(deadline);
  if (!c) return null;
  return <span className={`shrink-0 font-sans text-[13px] font-bold uppercase ${c.tone === "ok" ? "text-[var(--grey)]" : "text-[var(--urgent)]"}`}>{c.text}</span>;
}

function TypeKicker({ e }: { e: VerlaufEntry }) {
  return (
    <span className={`${kicker} block`}>{shortType(LETTER_LABELS[e.type])}{e.example ? " · Beispiel" : ""}</span>
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

  const row = "flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-4 text-left hover:text-[var(--accent)]";

  return (
    <div className="fade-in">
      <section>
        <p className={kicker}>Freigegebene Schreiben</p>
        <h1 className={h1}>Fristen & Verlauf</h1>
      </section>

      <section className="mt-10 flex flex-col gap-12">
        {entries.length === 0 && <p className={listHead}>Noch keine freigegebenen Schreiben.</p>}
        {showExamples && <p className={meta}>Beispiele aus der Demo-Geschichte</p>}

        {upcoming.length > 0 && (
          <div>
            <h2 className={sectionLabel}>Anstehende Fristen</h2>
            <ul>
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setOpenId(e.id)} className={row}>
                    <span className="min-w-0">
                      <TypeKicker e={e} />
                      <span className={`${listHead} mt-1 block`}>{issueTitle(e.subject, shortType(LETTER_LABELS[e.type]))}</span>
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
            <h2 className={sectionLabel}>Verlauf</h2>
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
              <div role="group" aria-label="Verlauf löschen" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-[var(--urgent)] pt-3">
                <p className="font-serif text-[19px] font-semibold text-[var(--urgent)]">
                  {saved.length === 1 ? "Den gespeicherten Eintrag" : `Alle ${saved.length} Einträge`} aus diesem Browser löschen?
                </p>
                <button className={`${linkBtn} text-[var(--urgent)]`} onClick={() => { clearVerlauf(); setConfirming(false); }}>Ja, löschen</button>
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
      <section>
        <button className={linkBtn} onClick={onBack}>← Zurück zu Fristen & Verlauf</button>
        <p className="mt-6"><TypeKicker e={entry} /></p>
        <h1 className={`${h1} !mb-[10px] !text-[clamp(32px,4.2vw,46px)]`}>{issueTitle(entry.subject, shortType(title))}</h1>
        <p className={`${meta} flex flex-wrap gap-x-4`}>
          <span>An {firstLine(entry.recipient)}</span>
          {entry.deadline && <span>{DEADLINE_LABEL[entry.type]}: {entry.deadline}</span>}
          {entry.deadline && <Status deadline={entry.deadline} />}
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-b border-t-[var(--ink)] border-b-[var(--rule)] py-3 font-sans">
        <p role="status" className="text-[14px] font-bold">Freigegeben · {entry.approvedBy}, {approvalTime(entry.approvedAt)}</p>
        <div className="flex gap-x-5">
          <button className={linkBtn} onClick={word}>Word</button>
          <button className={linkBtn} onClick={pdf}>PDF</button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 font-sans text-[14px] font-bold text-[var(--urgent)]">{error}</p>}

      <div>
        <article aria-label="Schreiben (nur lesen)" className="relative mt-7 border border-[var(--ink)] p-[clamp(24px,5vw,52px)] text-[17.5px] leading-[1.65]">
          <div className="mb-[30px] text-center font-sans text-[14px]">
            <p>Freigegeben</p>
            <div aria-hidden className="mx-auto mt-[10px] h-[2px] w-16 bg-[var(--accent)]" />
          </div>
          <p className="border-b border-[var(--rule)] pb-2 font-sans text-[12px] text-[var(--grey)]">{senderLine}</p>
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
          <div className="stamp absolute top-[52%] right-[8%] border-[3px] border-[var(--urgent)] bg-white/70 px-[18px] pt-[10px] pb-2 text-center text-[var(--urgent)]" aria-hidden>
            <p className="font-sans text-[26px] leading-none font-extrabold tracking-[.08em]">FREIGEGEBEN</p>
            <p className="mt-[6px] font-sans text-[12px] font-bold whitespace-nowrap">{approvalTime(entry.approvedAt)} · {entry.approvedBy}</p>
          </div>
        </article>
      </div>

      {createPortal(<PrintSheet draft={letter} isDraft={false} date={date} sheet="verlauf" />, document.body)}
    </div>
  );
}
