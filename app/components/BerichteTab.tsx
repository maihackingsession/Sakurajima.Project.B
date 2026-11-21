"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import project from "@/data/project.json";
import { formatDate } from "@/lib/dates";
import type { DailyReportResult, DeviationResult, LetterType } from "@/lib/types";
import { errorText, postJson } from "../lib/api";
import {
  dayDate,
  entriesOfDay,
  getWeather,
  KIND_LABEL,
  prefs,
  REPORT_FIELDS,
  removeEntry,
  saveReport,
  updateEntry,
  updateReport,
  useEntries,
  useReports,
  useWeatherSnapshot,
  type DailyReport,
  type Entry,
  type ReportField,
} from "../lib/store";
import { btnPrimary, greyLink, h1, kicker, linkBtn, meta, sectionLabel } from "../lib/ui";
import CraneLoader, { atLeast } from "./CraneLoader";
import DeviationTab, { draftText, Notice } from "./DeviationTab";
import { approvalTime } from "./DraftEditor";
import type { DraftSource } from "./LetterFlow";
import { EntryText } from "./HeuteView";
import { ErrorBox } from "./Status";
import VoiceField from "./VoiceField";
import WeatherLine, { loadWeather } from "./WeatherLine";

/** A request from another tab to open a day (n changes on every request). */
export type OpenDay = { day: string; n: number } | null;
type Props = { onDraft: (text: string, letterType: LetterType, source: DraftSource) => void; openDay?: OpenDay };

const longDay = (day: string) => dayDate(day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
const longDayYear = (day: string) => dayDate(day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Status of a day: „1 Anzeige“ (red), „Abgezeichnet“ (accent) or „Entwurf“ (grey). */
function DayStatus({ report }: { report?: DailyReport }) {
  if (report?.notices) return <span className="font-sans text-[12px] font-bold tracking-[.06em] text-[var(--urgent)] uppercase">{report.notices === 1 ? "1 Anzeige" : `${report.notices} Anzeigen`}</span>;
  if (report?.signed) return <span className="font-sans text-[12px] font-bold tracking-[.06em] text-[var(--accent)] uppercase">Abgezeichnet</span>;
  return <span className="font-sans text-[12px] font-semibold tracking-[.06em] text-[var(--grey)] uppercase">Entwurf</span>;
}

export default function BerichteTab({ onDraft, openDay }: Props) {
  const entries = useEntries();
  const reports = useReports();
  const [day, setDay] = useState<string | null>(null);
  const [foreign, setForeign] = useState(false);
  // Other tabs can open a day (e.g. „Im Tagesbericht vom 21.11. gespeichert“).
  const [handled, setHandled] = useState(0);
  if (openDay && openDay.n !== handled) {
    setHandled(openDay.n);
    setDay(openDay.day);
  }

  const days = [...new Set([...entries.map((e) => e.date), ...reports.map((r) => r.date)])].sort().reverse();

  if (day) return <DayView day={day} onBack={() => setDay(null)} onDraft={onDraft} />;

  return (
    <div className="fade-in">
      <p className={kicker}>Bautagebuch</p>
      <h1 className={h1}>Tagesberichte</h1>
      <button className={greyLink} onClick={() => setForeign((v) => !v)} aria-expanded={foreign}>
        {foreign ? "Fremden Bericht schließen" : "Fremden Bericht einfügen"}
      </button>
      {foreign && (
        <div className="open-in mt-4 mb-6">
          <DeviationTab embedded onDraft={onDraft} />
        </div>
      )}

      {days.length === 0 ? (
        <p className="mt-8 text-[var(--grey)]">Noch keine Einträge.</p>
      ) : (
        <ul className="mt-8 border-t-2 border-[var(--ink)]">
          {days.map((d) => (
            <DayRow key={d} day={d} count={entriesOfDay(entries, d).length} report={reports.find((r) => r.date === d)} onOpen={() => setDay(d)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DayRow({ day, count, report, onOpen }: { day: string; count: number; report?: DailyReport; onOpen: () => void }) {
  useWeatherSnapshot(day);
  useEffect(() => {
    if (!getWeather(day)) void loadWeather(day);
  }, [day]);
  const w = getWeather(day);
  const sub = [count === 1 ? "1 Eintrag" : `${count} Einträge`, w?.text.split(" · ").slice(0, 2).join(", ")].filter(Boolean).join(" · ");
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-baseline justify-between gap-4 border-b border-[var(--rule)] py-4 text-left hover:text-[var(--accent)]">
        <span className="min-w-0">
          <span className="block font-serif text-[21px] leading-[1.25] font-semibold">{longDay(day)}</span>
          <span className="mt-1 block font-sans text-[13px] text-[var(--grey)]">{sub}</span>
        </span>
        <DayStatus report={report} />
      </button>
    </li>
  );
}

/** One day: entries, the report fields, plan check, PDF and Abzeichnen. */
function DayView({ day, onBack, onDraft }: { day: string; onBack: () => void; onDraft: Props["onDraft"] }) {
  const entries = entriesOfDay(useEntries(), day);
  const report = useReports().find((r) => r.date === day);
  const [busy, setBusy] = useState<"" | "report" | "plan">("");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signer, setSigner] = useState(() => prefs.approver(project.bauleiter.name));
  const [check, setCheck] = useState<DeviationResult | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const done = () => delete document.body.dataset.print;
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  const filled = REPORT_FIELDS.filter(([k]) => report?.fields[k]?.trim());
  const empty = REPORT_FIELDS.filter(([k]) => !report?.fields[k]?.trim());

  async function create() {
    setBusy("report");
    setError("");
    try {
      const r = await atLeast(900, postJson<DailyReportResult>("/api/daily-report", { date: formatDate(dayDate(day)), entries: entries.map((e) => ({ time: e.time, text: entryLine(e) })) }));
      saveReport({ date: day, fields: r, createdAt: new Date().toISOString() });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  /** Text of the day for the Bauzeitenplan check: the report if there is one, else the entries. */
  function dayText() {
    const head = `Bautagesbericht vom ${formatDate(dayDate(day))}`;
    const body = filled.length
      ? filled.map(([k, label]) => `${label}:\n${report?.fields[k]}`).join("\n\n")
      : entries.map((e) => `${e.time} Uhr: ${entryLine(e)}`).join("\n");
    return `${head}\n\n${body}`;
  }

  async function checkPlan() {
    setBusy("plan");
    setError("");
    setCheck(null);
    try {
      const r = await atLeast(900, postJson<DeviationResult>("/api/deviation", { input: dayText() }));
      setCheck(r);
      if (report) updateReport(day, { notices: r.deviations.filter((d) => d.suggested_letter).length });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  function setField(k: ReportField, v: string) {
    if (!report) return;
    saveReport({ ...report, fields: { ...report.fields, [k]: v }, signed: undefined });
  }

  function sign(e: React.FormEvent) {
    e.preventDefault();
    const by = signer.trim();
    if (!by || !report) return;
    prefs.setApprover(by);
    updateReport(day, { signed: { by, at: new Date().toISOString() } });
    setSigning(false);
  }

  function pdf() {
    document.body.dataset.print = "tagesbericht";
    window.print();
  }

  if (busy === "report") return <CraneLoader label="Tagesbericht wird erstellt" steps={["Lese die Einträge", "Sortiere in die Felder"]} />;
  if (busy === "plan") return <CraneLoader label="Abgleich mit dem Bauzeitenplan" steps={["Lese den Bericht", "Vergleiche mit dem Bauzeitenplan"]} />;

  const notices = (check?.deviations ?? []).filter((d) => d.suggested_letter);
  const others = (check?.deviations ?? []).filter((d) => !d.suggested_letter);
  const status = report?.signed ? `Abgezeichnet · ${report.signed.by}, ${approvalTime(report.signed.at)}` : report ? "Entwurf" : "Noch kein Bericht";

  return (
    <div className="fade-in">
      <button className={linkBtn} onClick={onBack}>← Alle Tagesberichte</button>
      <p className={`${kicker} mt-6`}>{longDayYear(day)}</p>
      <h1 className={`${h1} !mb-2`}>Tagesbericht</h1>
      <WeatherLine day={day} editable />
      <p role="status" className={`${meta} mt-3 ${report?.signed ? "!text-[var(--accent)]" : ""}`}>{status}</p>

      <section className="mt-10" aria-labelledby="h-eintraege">
        <h2 id="h-eintraege" className={sectionLabel}>Einträge</h2>
        {entries.length === 0 && <p className="py-4 text-[var(--grey)]">Keine Einträge an diesem Tag.</p>}
        <ul>
          {entries.map((e) => <EntryRow key={e.id} entry={e} />)}
        </ul>
      </section>

      {!report ? (
        <div className="mt-8">
          <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={create} disabled={entries.length === 0}>Bericht aus Einträgen erstellen</button>
        </div>
      ) : (
        <>
          {filled.map(([k, label]) => (
            <section key={k} className="mt-10">
              <h2 className={sectionLabel}><label htmlFor={`f-${k}`}>{label}</label></h2>
              <VoiceField id={`f-${k}`} multiline quiet className="line-field !border-b-[var(--rule)] !text-[18px]" value={report.fields[k] ?? ""} onChange={(v) => setField(k, v)} />
            </section>
          ))}
          {empty.length > 0 && (
            <div className="mt-8">
              <button className={greyLink} onClick={() => setMore((v) => !v)} aria-expanded={more}>{more ? "− Weitere Felder" : "+ Weitere Felder"}</button>
              {more &&
                empty.map(([k, label]) => (
                  <section key={k} className="open-in mt-6">
                    <h2 className={sectionLabel}><label htmlFor={`f-${k}`}>{label}</label></h2>
                    <VoiceField id={`f-${k}`} multiline quiet className="line-field !text-[18px]" value={report.fields[k] ?? ""} onChange={(v) => setField(k, v)} />
                  </section>
                ))}
            </div>
          )}

          <div className="mt-10 border-t border-[var(--ink)] pt-3">
            {signing ? (
              <form onSubmit={sign} className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans">
                <label htmlFor="signer" className="text-[14px] text-[var(--grey)]">Abgezeichnet von</label>
                <input id="signer" className="min-h-11 w-48 border-0 border-b border-[var(--ink)] bg-transparent font-serif text-[18px] focus:outline-none" value={signer} onChange={(e) => setSigner(e.target.value)} autoFocus required />
                <button type="submit" className={btnPrimary} disabled={!signer.trim()}>Abzeichnen bestätigen</button>
                <button type="button" className={linkBtn} onClick={() => setSigning(false)}>Abbrechen</button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {!report.signed && <button className={`${btnPrimary} w-full min-[600px]:w-auto`} onClick={() => setSigning(true)}>Abzeichnen</button>}
                <button className={linkBtn} onClick={checkPlan}>Mit Bauzeitenplan prüfen</button>
                <button className={linkBtn} onClick={pdf}>PDF</button>
                <button className={greyLink} onClick={create}>Neu aus Einträgen erstellen</button>
              </div>
            )}
          </div>
        </>
      )}

      {error && <div className="mt-8"><ErrorBox message={error} /></div>}

      {check && (
        <div className="mt-12">
          {notices.map((d, i) => (
            <Notice key={i} d={d} onDraft={() => onDraft(draftText(d), d.suggested_letter as LetterType, { facts: d.facts, eventDate: d.event_date, report: dayText() })} />
          ))}
          {check.deviations.length === 0 && (
            <article className="border-t-2 border-[var(--ink)] pt-3">
              <p className={kicker}>Keine Abweichung</p>
              <p className="mt-1 font-serif text-[21px] font-semibold">Keine Abweichung vom Bauzeitenplan gefunden.</p>
            </article>
          )}
          {others.map((d, i) => (
            <article key={i} className="mt-7 border-t-2 border-[var(--ink)] pt-3">
              <p className={kicker}>Im Blick</p>
              <p className="mt-1 font-serif text-[21px] font-semibold">{d.activity}</p>
            </article>
          ))}
        </div>
      )}

      {report && typeof document !== "undefined" && createPortal(<ReportSheet day={day} report={report} />, document.body)}
    </div>
  );
}

/** Text of an entry for the report (events carry their kind and title). */
function entryLine(e: Entry) {
  if (e.kind === "eintrag") return e.text;
  const head = [KIND_LABEL[e.kind], e.title].filter(Boolean).join(": ");
  return `${head}${e.text ? ` – ${e.text}` : ""}${e.due ? ` (fällig ${formatDate(dayDate(e.due))})` : ""}`;
}

/** An entry in the day view: edit the text, move it to another day/time. */
function EntryRow({ entry }: { entry: Entry }) {
  const [mode, setMode] = useState<"" | "text" | "date">("");
  const [text, setText] = useState(entry.text);
  const [date, setDate] = useState(entry.date);
  const [time, setTime] = useState(entry.time);
  const dateField = "min-h-11 border-0 border-b border-[var(--ink)] bg-transparent font-sans text-[16px]";

  return (
    <li className="border-b border-[var(--rule)] py-4">
      <p className="font-sans text-[12px] font-semibold tracking-[.04em] text-[var(--grey)]">
        {entry.time} Uhr{entry.kind !== "eintrag" ? ` · ${KIND_LABEL[entry.kind]}${entry.title ? `: ${entry.title}` : ""}` : ""}
      </p>
      {mode === "text" ? (
        <div className="mt-1">
          <VoiceField id={`e-${entry.id}`} label="Eintrag bearbeiten" multiline className="line-field !text-[18px]" value={text} onChange={setText}>
            <button className={btnPrimary} onClick={() => { updateEntry(entry.id, { text: text.trim() }); setMode(""); }} disabled={!text.trim()}>Speichern</button>
            <button className={greyLink} onClick={() => { setText(entry.text); setMode(""); }}>Abbrechen</button>
          </VoiceField>
        </div>
      ) : (
        entry.text && <EntryText text={entry.text} />
      )}
      {mode === "date" && (
        <form
          className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) updateEntry(entry.id, { date, time: time || entry.time });
            setMode("");
          }}
        >
          <input type="date" aria-label="Datum" className={dateField} value={date} onChange={(e) => setDate(e.target.value)} required />
          <input type="time" aria-label="Uhrzeit" className={dateField} value={time} onChange={(e) => setTime(e.target.value)} />
          <button type="submit" className={linkBtn}>Übernehmen</button>
          <button type="button" className={greyLink} onClick={() => setMode("")}>Abbrechen</button>
        </form>
      )}
      {mode === "" && (
        <p className="flex flex-wrap gap-x-5">
          <button className={`${greyLink} text-[13px]`} onClick={() => setMode("text")}>Bearbeiten</button>
          <button className={`${greyLink} text-[13px]`} onClick={() => setMode("date")}>Datum/Uhrzeit ändern</button>
          <button className={`${greyLink} text-[13px]`} onClick={() => removeEntry(entry.id)}>Löschen</button>
        </p>
      )}
    </li>
  );
}

/** Print view of the Tagesbericht: project + date, weather, filled fields, sign-off line. */
function ReportSheet({ day, report }: { day: string; report: DailyReport }) {
  const w = getWeather(day);
  return (
    <div data-sheet="tagesbericht" className="print-sheet hidden bg-white font-sans text-[11pt] leading-snug text-black">
      <p className="text-[9pt]">{project.auftragnehmer.name} · {project.bauvorhaben} · Vertrag {project.vertragsnummer}</p>
      <p className="mt-4 text-[16pt] font-bold">Bautagesbericht {formatDate(dayDate(day))}</p>
      <p className="mt-1">{longDayYear(day)}</p>
      <p className="mt-3"><b>Wetter:</b> {w?.text ?? "–"}</p>
      {REPORT_FIELDS.filter(([k]) => report.fields[k]?.trim()).map(([k, label]) => (
        <div key={k} className="mt-4">
          <p className="border-b border-neutral-400 font-bold">{label}</p>
          <p className="mt-1 whitespace-pre-line">{report.fields[k]}</p>
        </div>
      ))}
      <p className="mt-12 border-t border-neutral-500 pt-1 text-[10pt]">
        {report.signed ? `Abgezeichnet: ${report.signed.by}, ${approvalTime(report.signed.at)}` : `Entwurf – nicht abgezeichnet · ${project.bauleiter.name}, ${project.bauleiter.funktion}`}
      </p>
    </div>
  );
}

