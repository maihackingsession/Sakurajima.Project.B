"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "@/lib/dates";
import { LETTER_LABELS } from "@/lib/types";
import { dateLine, exportDocx, paragraphs, senderLine, signature } from "../lib/export";
import {
  addEntry,
  clearAll,
  clock,
  dayDate,
  EVENT_KINDS,
  isoDay,
  KIND_LABEL,
  updateEntry,
  useEntries,
  type Entry,
  type EntryKind,
} from "../lib/store";
import { btnPrimary, greyLink, h1, issueTitle, kicker, linkBtn, meta, sectionLabel, shortType } from "../lib/ui";
import { useDueItems, useVerlaufEntries } from "../lib/useVerlauf";
import { DEADLINE_LABEL, countdown, letterDateOf, letterOf, type VerlaufEntry } from "../lib/verlauf";
import { loadDemo } from "../lib/demo";
import { approvalTime, PrintSheet } from "./DraftEditor";
import { EntryText } from "./HeuteView";
import VoiceField from "./VoiceField";

const firstLine = (s: string) => s.split("\n")[0].trim();
const dayHead = (day: string) => dayDate(day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Status({ deadline }: { deadline: string }) {
  const c = countdown(deadline);
  if (!c) return null;
  return <span className={`shrink-0 font-sans text-[12px] font-bold tracking-[.04em] uppercase ${c.tone === "ok" ? "text-[var(--grey)]" : "text-[var(--urgent)]"}`}>{c.text}</span>;
}

function TypeKicker({ e }: { e: VerlaufEntry }) {
  return (
    <span className={`${kicker} block`}>{shortType(LETTER_LABELS[e.type])}{e.example ? " · Beispiel" : ""}</span>
  );
}

/** One row of the timeline: an entry/event or an approved letter. */
type Item = { key: string; day: string; time: string; entry?: Entry; letter?: VerlaufEntry };

export default function VerlaufTab({ onOpenDay }: { onOpenDay?: (day: string) => void }) {
  const { saved, entries: letters } = useVerlaufEntries();
  const events = useEntries();
  const due = useDueItems().filter((d) => d.urgent);
  const [openId, setOpenId] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const open = letters.find((e) => e.id === openId);
  if (open) return <SavedLetter entry={open} onBack={() => setOpenId("")} />;

  const items: Item[] = [
    ...events.map((e) => ({ key: e.id, day: e.date, time: e.time, entry: e })),
    ...letters.map((l) => ({ key: l.id, day: isoDay(new Date(l.approvedAt)), time: clock(new Date(l.approvedAt)), letter: l })),
  ].sort((a, b) => `${b.day} ${b.time}`.localeCompare(`${a.day} ${a.time}`));
  const days = [...new Set(items.map((i) => i.day))];
  const anything = saved.length > 0 || events.length > 0;

  return (
    <div className="fade-in">
      <p className={kicker}>Zeitachse</p>
      <h1 className={h1}>Fristen & Verlauf</h1>

      {adding ? (
        <EventForm onDone={() => setAdding(false)} />
      ) : (
        <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={() => setAdding(true)}>Neues Ereignis</button>
      )}

      {due.length > 0 && (
        <section className="mt-12" aria-labelledby="h-faellig-v">
          <h2 id="h-faellig-v" className={`${sectionLabel} !text-[var(--urgent)] !border-[var(--urgent)]`}>Fällig</h2>
          <ul>
            {due.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => letters.some((l) => l.id === d.id) && setOpenId(d.id)}
                  className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-4 text-left"
                >
                  <span className="font-serif text-[21px] leading-[1.25] font-semibold">{d.title}</span>
                  <span className="font-sans text-[12px] font-bold tracking-[.04em] text-[var(--urgent)] uppercase">{d.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 ? (
        <p className="mt-10 text-[var(--grey)]">Noch keine Ereignisse.</p>
      ) : (
        days.map((day) => (
          <section key={day} className="mt-12" aria-label={dayHead(day)}>
            <h2 className={`${sectionLabel} flex flex-wrap items-baseline justify-between gap-x-4`}>
              <span>{dayHead(day)}</span>
              {onOpenDay && <button className={`${greyLink} text-[13px] font-normal tracking-normal normal-case`} onClick={() => onOpenDay(day)}>Tagesbericht →</button>}
            </h2>
            <ul>
              {items.filter((i) => i.day === day).map((i) =>
                i.letter ? (
                  <li key={i.key}>
                    <button onClick={() => setOpenId(i.key)} className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-4 text-left hover:text-[var(--accent)]">
                      <span className="min-w-0 flex-1">
                        <TypeKicker e={i.letter} />
                        <span className="mt-1 block font-serif text-[21px] leading-[1.25] font-semibold">{issueTitle(i.letter.subject, shortType(LETTER_LABELS[i.letter.type]))}</span>
                        <span className={`${meta} mt-1 block`}>
                          {i.time} Uhr · freigegeben von {i.letter.approvedBy}{i.letter.deadline ? ` · ${DEADLINE_LABEL[i.letter.type]}: ${i.letter.deadline}` : ""}
                        </span>
                      </span>
                      {i.letter.deadline && <Status deadline={i.letter.deadline} />}
                    </button>
                  </li>
                ) : (
                  <EventRow key={i.key} entry={i.entry as Entry} />
                ),
              )}
            </ul>
          </section>
        ))
      )}

      {events.length === 0 && (
        <button className={`${greyLink} mt-2 text-[13px]`} onClick={loadDemo}>Beispieldaten laden</button>
      )}

      {anything && (
        <div className="mt-12">
          {confirming ? (
            <div role="group" aria-label="Verlauf löschen" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-[var(--urgent)] pt-3">
              <p className="font-serif text-[19px] font-semibold text-[var(--urgent)]">Alle Einträge, Tagesberichte und Schreiben aus diesem Browser löschen?</p>
              <button className={`${linkBtn} text-[var(--urgent)]`} onClick={() => { clearAll(); setConfirming(false); }}>Ja, löschen</button>
              <button className={linkBtn} onClick={() => setConfirming(false)} autoFocus>Abbrechen</button>
            </div>
          ) : (
            <button className={greyLink} onClick={() => setConfirming(true)}>Verlauf löschen</button>
          )}
        </div>
      )}
    </div>
  );
}

/** Entry or event on the timeline, with „Datum ändern“. */
function EventRow({ entry }: { entry: Entry }) {
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(entry.date);
  const dateField = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent font-sans text-[16px]";
  const c = entry.due ? countdown(formatDate(dayDate(entry.due))) : null;
  return (
    <li className="border-b border-[var(--rule)] py-4">
      <p className={`${kicker} !text-[var(--grey)]`}>{entry.time} Uhr · {KIND_LABEL[entry.kind]}</p>
      {entry.title && <p className="mt-1 font-serif text-[21px] leading-[1.25] font-semibold">{entry.title}</p>}
      {entry.text && <EntryText text={entry.text} />}
      {entry.due && (
        <p className={`mt-1 font-sans text-[12px] tracking-[.04em] uppercase ${c && c.tone !== "ok" ? "font-bold text-[var(--urgent)]" : "font-semibold text-[var(--grey)]"}`}>
          Fällig am {formatDate(dayDate(entry.due))}{c ? ` · ${c.text}` : ""}
        </p>
      )}
      {moving ? (
        <form
          className="mt-2 flex flex-wrap items-end gap-x-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) updateEntry(entry.id, { date });
            setMoving(false);
          }}
        >
          <input type="date" aria-label="Datum" className={dateField} value={date} onChange={(e) => setDate(e.target.value)} required />
          <button type="submit" className={linkBtn}>Übernehmen</button>
          <button type="button" className={greyLink} onClick={() => setMoving(false)}>Abbrechen</button>
        </form>
      ) : (
        <button className={`${greyLink} text-[13px]`} onClick={() => setMoving(true)}>Datum ändern</button>
      )}
    </li>
  );
}

/** „Neues Ereignis“ inline: kind, title, description, date + time, for „Frist“ the due day. Saved in the same store as the entries. */
function EventForm({ onDone }: { onDone: () => void }) {
  const now = new Date();
  const [kind, setKind] = useState<EntryKind>("notiz");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState(isoDay(now));
  const [time, setTime] = useState(clock(now));
  const [due, setDue] = useState("");
  const field = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent font-sans text-[16px]";
  const label = "block font-sans text-[12px] font-bold tracking-[.06em] uppercase text-[var(--grey)]";
  const ok = (title.trim() || text.trim()) && date && (kind !== "frist" || due);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    addEntry({ kind, date, time: time || "00:00", title: title.trim() || undefined, text: text.trim(), due: kind === "frist" ? due : undefined });
    onDone();
  }

  return (
    <form onSubmit={save} className="open-in border-t-2 border-[var(--ink)] pt-3" aria-label="Neues Ereignis">
      <p className="font-sans text-[13px] font-extrabold tracking-[.04em] uppercase">Neues Ereignis</p>
      <div className="mt-4">
        <label htmlFor="ev-kind" className={label}>Art</label>
        <select id="ev-kind" className={`${field} font-semibold`} value={kind} onChange={(e) => setKind(e.target.value as EntryKind)}>
          {EVENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </div>
      <div className="mt-5">
        <label htmlFor="ev-title" className={label}>Titel</label>
        <VoiceField id="ev-title" value={title} onChange={setTitle} placeholder={kind === "frist" ? "z. B. Bewehrungspläne vom AG" : "z. B. Anordnung Zusatzbewehrung"} />
      </div>
      <div className="mt-5">
        <label htmlFor="ev-text" className={label}>Beschreibung</label>
        <VoiceField id="ev-text" multiline className="line-field min-h-[72px] !text-[18px]" value={text} onChange={setText} placeholder="Was genau, wer, wo …" />
      </div>
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <label htmlFor="ev-date" className={label}>Datum</label>
          <input id="ev-date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="ev-time" className={label}>Uhrzeit</label>
          <input id="ev-time" type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {kind === "frist" && (
          <div>
            <label htmlFor="ev-due" className={label}>Fällig am</label>
            <input id="ev-due" type="date" className={field} value={due} onChange={(e) => setDue(e.target.value)} required />
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button type="submit" className={`${btnPrimary} w-full min-[600px]:w-auto`} disabled={!ok}>Speichern</button>
        <button type="button" className={greyLink} onClick={onDone}>Abbrechen</button>
      </div>
    </form>
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
