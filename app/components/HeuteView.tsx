"use client";

import { useEffect, useRef, useState } from "react";
import situations from "@/tests/situations.json";
import { formatDate } from "@/lib/dates";
import { isLetterType, LETTER_LABELS, LETTER_TYPES, type LetterType, type RouterResult } from "@/lib/types";
import { postJson } from "../lib/api";
import { loadDemo } from "../lib/demo";
import { isDefaultSettings } from "@/lib/settings";
import { addEntry, clock, dayDate, entriesOfDay, getEntries, isoDay, savePhoto, updateEntry, useEntries, useBeispiel, useSettings, useToday, type Entry } from "../lib/store";
import { btnOutline, btnPrimary, greyLink, h1, kicker, kickerUrgent, linkBtn, recBtn, sectionLabel, shortType } from "../lib/ui";
import { useDueItems } from "../lib/useVerlauf";
import { useFocus } from "./Focus";
import type { Tab } from "./Header";
import { RecDot } from "./Status";
import { PhotoButton, Thumb } from "./Photo";
import VoiceField, { useDictation } from "./VoiceField";
import WeatherLine from "./WeatherLine";

export type EntryDraft = { text: string; letterType: LetterType; facts: Record<string, unknown>; reason: string; eventDate: string; attachment?: string; language?: string };

/** „Foto vom 21.11.2026, 07:20 Uhr“ for the letter's Anlage line. */
const photoLabel = (date: string, time: string) => `Foto vom ${formatDate(dayDate(date))}, ${time} Uhr`;

type Props = {
  /** Starts the existing flow: Rückfragen → Schreiben. */
  onDraft: (d: EntryDraft) => void;
  onTab: (tab: Tab) => void;
  onSettings: () => void;
};

const headDate = (day: string) => {
  if (!day) return "";
  const d = dayDate(day);
  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return `${wd}, ${formatDate(d)}`;
};

/** Runs the existing router check for one entry in the background (one AI call) and stores the result. */
export async function checkEntry(entry: Entry) {
  updateEntry(entry.id, { check: { status: "pending" } });
  try {
    // Only the entry's own text and date go to the router – never other entries or sample data.
    const r = await postJson<RouterResult>("/api/route", { input: entry.text, date: formatDate(dayDate(entry.date)) });
    const notice = r.intent === "letter" && r.outcome === "anzeige" && isLetterType(r.letter_type);
    const unclear = r.outcome === "unklar" && (r.unclear === "mangel" || r.unclear === "behinderung") ? r.unclear : undefined;
    updateEntry(entry.id, { check: { status: "done", letterType: notice ? (r.letter_type as LetterType) : null, reason: r.reason, facts: r.facts ?? {}, language: r.language, ...(unclear ? { unclear } : {}) } });
  } catch {
    updateEntry(entry.id, { check: { status: "error" } });
  }
}

/** Draft data for an entry with a recommendation. */
export function draftOf(e: Entry): EntryDraft | null {
  if (e.check?.status !== "done" || !e.check.letterType) return null;
  return { text: e.text, letterType: e.check.letterType, facts: e.check.facts, reason: e.check.reason, eventDate: formatDate(dayDate(e.date)), attachment: e.photoId ? photoLabel(e.date, e.time) : undefined, language: e.check.language };
}

/** Status line under an entry: „wird geprüft …“, the red recommendation, or „Im Tagesbericht gespeichert“. */
export function EntryStatus({ entry, onDraft }: { entry: Entry; onDraft: (d: EntryDraft) => void }) {
  const c = entry.check;
  if (!c) return null;
  if (c.status === "pending") return <p className="mt-1 font-sans text-[13px] text-[var(--grey)] italic" role="status">wird geprüft …</p>;
  if (c.status === "error")
    return (
      <p className="mt-1 flex flex-wrap items-center gap-x-4 font-sans text-[13px] text-[var(--urgent)]" role="alert">
        KI nicht erreichbar – bitte erneut versuchen. <button className={`${linkBtn} text-[13px]`} onClick={() => void checkEntry(entry)}>Erneut versuchen</button>
      </p>
    );
  if (c.unclear) return <UnclearQuestion entry={entry} kind={c.unclear} />;
  const d = draftOf(entry);
  const chosen = c.answer ? <span className="font-sans text-[13px] text-[var(--grey)]">{c.answer} · </span> : null;
  if (!d)
    return (
      <p className="fade-in mt-1 font-sans text-[13px] text-[var(--grey)]">
        {chosen}{c.hint ? <span className="font-bold text-[var(--ink)]">{c.hint}</span> : "Im Tagesbericht gespeichert"}
      </p>
    );
  return (
    <p className="fade-in mt-1 flex flex-wrap items-center gap-x-4">
      {chosen}
      <span className={kickerUrgent}>{shortType(LETTER_LABELS[d.letterType])} empfohlen</span>
      <button className={`${linkBtn} font-bold`} onClick={() => onDraft(d)}>Schreiben entwerfen →</button>
    </p>
  );
}

/** Who is responsible? Exactly one question with two buttons under the entry; the answer sets the recommendation. */
const UNCLEAR = {
  mangel: {
    question: "Wessen Firma ist das?",
    options: [
      { label: "Unser Nachunternehmer", letterType: "maengel" as LetterType, reason: "Mangel unseres Nachunternehmers (selbst angegeben)." },
      { label: "Firma des Bauherrn", letterType: null, reason: "Firma des Bauherrn (selbst angegeben) – keine Mängelanzeige von uns.", hint: "Mangel dem Bauherrn melden" },
    ],
  },
  behinderung: {
    question: "Wer ist zuständig?",
    options: [
      { label: "Bauherr", letterType: "behinderung" as LetterType, reason: "Zuständig ist der Bauherr (selbst angegeben)." },
      { label: "Wir selbst", letterType: null, reason: "Eigener Bereich (selbst angegeben) – keine Anzeige." },
    ],
  },
} as const;

function UnclearQuestion({ entry, kind }: { entry: Entry; kind: "mangel" | "behinderung" }) {
  const q = UNCLEAR[kind];
  const [picked, setPicked] = useState("");
  function choose(o: (typeof q.options)[number]) {
    if (entry.check?.status !== "done" || picked) return;
    const check = entry.check;
    setPicked(o.label);
    // The chosen answer stays visible briefly before the recommendation appears.
    setTimeout(() => {
      updateEntry(entry.id, {
        check: { status: "done", letterType: o.letterType, reason: o.reason, facts: check.facts, language: check.language, answer: o.label, ...("hint" in o ? { hint: o.hint } : {}) },
      });
    }, 150);
  }
  return (
    <div className="fade-in mt-2" role="group" aria-label={q.question}>
      <p className="font-serif text-[19px] font-semibold">{q.question}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-2">
        {q.options.map((o) => (
          <button
            key={o.label}
            onClick={() => choose(o)}
            aria-pressed={picked === o.label}
            className={`${btnOutline} press min-h-11 ${picked === o.label ? "!bg-[var(--ink)] !text-white" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Entry text, max. 3 lines; longer texts open on click. */
export function EntryText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 180 || text.split("\n").length > 3;
  return (
    <>
      <p className={`whitespace-pre-line ${open ? "" : "line-clamp-3"}`}>{text}</p>
      {long && <button className={`${greyLink} text-[13px]`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Weniger" : "Ganz lesen"}</button>}
    </>
  );
}

export default function HeuteView({ onDraft, onTab, onSettings }: Props) {
  // Same source as the masthead date: the browser's today, re-read every minute.
  const today = useToday();
  const head = headDate(today);
  const settings = useSettings();
  // Demo links („Beispiel einfügen“, „Beispieldaten laden“) only in Beispielmodus.
  const beispiel = useBeispiel();
  const all = useEntries();
  const todays = entriesOfDay(all, today).reverse();
  const due = useDueItems().slice(0, 3);

  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);
  const [chooseType, setChooseType] = useState(false);
  const [type, setType] = useState<LetterType | "">("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const dictation = useDictation((t) => setText((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t)));
  const isOpen = writing || !!text.trim() || dictation.recording;
  // Focus mode while the input is open; „← Zurück“ closes it (the text is discarded, as with „Verwerfen“).
  useFocus("heute", isOpen ? { title: "Neuer Eintrag", status: text.trim() ? "Nicht gespeichert" : "", onBack: discard } : null);

  // A check that was running when the page was closed is started again.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    for (const e of getEntries()) if (e.check?.status === "pending") void checkEntry(e);
  }, []);

  function open() {
    setWriting(true);
    setTimeout(() => fieldRef.current?.focus(), 0);
  }

  function discard() {
    dictation.stop();
    setText("");
    setPhoto(null);
    setWriting(false);
  }

  // „Beispiel einfügen“: an unchanged sample text is saved as an example entry (flag), not as a real one.
  const exampleText = useRef("");
  function example() {
    const s = situations[Math.floor(Math.random() * situations.length)];
    exampleText.current = s.text;
    setText(s.text);
    setWriting(true);
  }

  /** Saves at once (no AI), then checks in the background. With a chosen type it goes straight to the letter. */
  async function save() {
    const t = text.trim();
    if (!t) return;
    dictation.stop();
    const now = new Date();
    // The photo stays in this browser (IndexedDB); a failed save keeps the entry without it.
    const photoId = photo ? await savePhoto(photo).catch(() => undefined) : undefined;
    const isExample = !!exampleText.current && t === exampleText.current.trim();
    exampleText.current = "";
    const entry = addEntry({ kind: "eintrag", date: isoDay(now), time: clock(now), text: t, photoId, ...(isExample ? { example: true } : {}) });
    setText("");
    setPhoto(null);
    setWriting(false);
    if (type) {
      updateEntry(entry.id, { check: { status: "done", letterType: type, reason: "Schreibenart selbst gewählt.", facts: {} } });
      onDraft({ text: t, letterType: type, facts: {}, reason: "Schreibenart selbst gewählt.", eventDate: formatDate(now), attachment: photoId ? photoLabel(entry.date, entry.time) : undefined });
      setType("");
      setChooseType(false);
      return;
    }
    void checkEntry(entry);
  }

  const select = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent pr-2 font-sans text-[15px] font-semibold";

  return (
    <div>
      <section className="fade-in" aria-labelledby="h-heute">
        {isDefaultSettings(settings) && (
          <p className="-mt-4 mb-5 font-sans text-[13px] text-[var(--grey)]">
            Beispielprojekt · <button className="min-h-11 underline underline-offset-[3px] hover:text-[var(--accent)]" onClick={onSettings}>Einstellungen anpassen →</button>
          </p>
        )}
        <p className={kicker}>Heute{head ? ` · ${head}` : ""}</p>
        {today && <WeatherLine day={today} />}
        <h1 id="h-heute" className={h1}>Was ist auf der Baustelle passiert?</h1>

        {!isOpen ? (
          <div className="flex items-center justify-between gap-4 border-b border-[var(--line)]">
            <button className="min-h-14 flex-auto cursor-text text-left font-serif text-[21px] text-[var(--muted)] italic hover:text-[var(--ink)]" onClick={open}>
              Hier schreiben …
            </button>
            {dictation.supported && (
              <button className={recBtn} onClick={() => { open(); dictation.start(); }}>
                <RecDot /> Sprechen
              </button>
            )}
          </div>
        ) : (
          <div className="open-in">
            <VoiceField
              id="situation"
              label="Was ist auf der Baustelle passiert?"
              multiline
              fieldRef={fieldRef}
              dictation={dictation}
              className="line-field max-h-[50vh] min-h-[96px] overflow-y-auto"
              placeholder="Hier schreiben … in jeder Sprache"
              value={text}
              onChange={setText}
            >
              <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={() => void save()} disabled={!text.trim()}>
                {type ? "Speichern und Schreiben entwerfen" : "Speichern"}
              </button>
              <PhotoButton onPhoto={setPhoto} />
            </VoiceField>
            {photo && (
              <div className="mt-3 flex items-center gap-4">
                <Thumb blob={photo} />
                <button className={`${greyLink} text-[13px]`} onClick={() => setPhoto(null)}>Foto entfernen</button>
              </div>
            )}
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-x-6">
          {isOpen && <button className={`${greyLink} text-[13px]`} onClick={discard}>Verwerfen</button>}
          {beispiel && <button className={`${greyLink} text-[13px]`} onClick={example}>Beispiel einfügen</button>}
          <button className={`${greyLink} text-[13px]`} onClick={() => setChooseType((v) => !v)} aria-expanded={chooseType}>Schreibenart selbst wählen</button>
          {beispiel && all.length === 0 && <button className={`${greyLink} text-[13px]`} onClick={loadDemo}>Beispieldaten laden</button>}
        </div>
        {chooseType && (
          <div className="open-in mt-3">
            <select aria-label="Schreibenart" className={select} value={type} onChange={(e) => { setType(e.target.value as LetterType | ""); open(); }}>
              <option value="">Automatisch prüfen</option>
              {LETTER_TYPES.map((t) => <option key={t} value={t}>{LETTER_LABELS[t]}</option>)}
            </select>
          </div>
        )}
      </section>

      {todays.length > 0 && (
        <section className="fade-in mt-14" aria-labelledby="h-festgehalten">
          <h2 id="h-festgehalten" className={sectionLabel}>Heute festgehalten</h2>
          <ul>
            {todays.map((e) => (
              <li key={e.id} className="border-b border-[var(--rule)] py-4">
                <p className="font-sans text-[12px] font-semibold tracking-[.04em] text-[var(--grey)]">{e.time} Uhr{e.kind !== "eintrag" ? ` · ${e.kind === "zusammenfassung" ? "Zusammenfassung" : e.title || ""}` : ""}</p>
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1"><EntryText text={e.text} /></div>
                  {e.photoId && <Thumb id={e.photoId} />}
                </div>
                <EntryStatus entry={e} onDraft={onDraft} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {due.length > 0 && (
        <section className="fade-in mt-14" aria-labelledby="h-faellig">
          <h2 id="h-faellig" className={sectionLabel}>Fällig</h2>
          <ul>
            {due.map((d, i) => (
              <li key={d.id}>
                <button onClick={() => onTab("verlauf")} className="block w-full border-b border-[var(--rule)] py-4 text-left hover:text-[var(--accent)]">
                  <span className={`block font-serif font-semibold ${i === 0 ? "text-[24px] leading-[1.2]" : "text-[21px] leading-[1.25]"}`}>{d.title}</span>
                  <span className={`mt-2 block font-sans text-[12px] tracking-[.04em] uppercase ${d.urgent ? "font-bold text-[var(--urgent)]" : "font-semibold text-[var(--grey)]"}`}>{d.status}</span>
                </button>
              </li>
            ))}
          </ul>
          <button className={linkBtn} onClick={() => onTab("verlauf")}>Alle Fristen →</button>
        </section>
      )}
    </div>
  );
}
