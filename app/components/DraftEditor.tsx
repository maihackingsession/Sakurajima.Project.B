"use client";

import { Fragment, useState } from "react";
import { createPortal } from "react-dom";
import project from "@/data/project.json";
import { LETTER_LABELS, type Letter, type LetterType } from "@/lib/types";
import { checklist, euro, numberFact, placeholders } from "../lib/checks";
import {
  appendixSections,
  dateLine,
  exportDocx,
  paragraphs,
  plainText,
  senderLine,
  signature,
  stripDraftLines,
  type Appendix,
} from "../lib/export";
import { deadlineOf, saveToVerlauf } from "../lib/verlauf";
import { btnPrimary, btnSecondary, card, field, h2, hint, label, linkBtn } from "../lib/ui";
import Chip from "./Chip";

/** Review status of a draft. Only the user changes it. Approvals are remembered in this browser only. */
export type Approval = { status: "entwurf" } | { status: "freigegeben"; by: string; at: string };
export const NEW_APPROVAL: Approval = { status: "entwurf" };

/** What the draft is based on (evidence appendix) + real AI time of this flow. */
export type FlowInfo = Appendix & { aiSeconds: number | null };

export function approvalTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

function remember(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: approval still works for this session.
  }
}
function recall<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Prints the open draft (not a letter opened from the Verlauf; see globals.css). */
function printSheet() {
  delete document.body.dataset.print;
  window.print();
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Older iOS Safari / non-secure context: fall back to a hidden textarea.
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("copy failed");
}

/** Text with [Platzhalter] visibly highlighted. */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]{2,}\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]]+\]$/.test(p) ? (
          <mark key={i} className="rounded bg-[#ffe3b3] px-1 text-[var(--warning-text)] ring-1 ring-[var(--warning-border)]">{p}</mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

type Props = {
  letterType: LetterType;
  draft: Letter;
  onChange: (d: Letter) => void;
  approval: Approval;
  onApprovalChange: (a: Approval) => void;
  onBack: () => void;
  onRestart: () => void;
  facts: Record<string, unknown>;
  /** Start of the event (dd.mm.yyyy) if known, e.g. from the Tagesbericht. */
  eventDate: string;
  /** Date in the letter's date line (dd.mm.yyyy). */
  letterDate: string;
  flow: FlowInfo;
};

type EditKey = "recipient" | "subject" | "salutation" | "body" | "closing";

export default function DraftEditor(props: Props) {
  const { letterType, draft, onChange, approval, onApprovalChange, onBack, onRestart, facts, eventDate, letterDate, flow } = props;
  const title = LETTER_LABELS[letterType];
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [approver, setApprover] = useState(() => recall("baufrist:freigeber", project.bauleiter.name));

  const isDraft = approval.status !== "freigegeben";
  const checks = checklist(letterType, draft, facts, eventDate, !!flow.report);
  const open = checks.filter((c) => !c.ok).length;
  const holes = placeholders(`${draft.recipient}\n${draft.subject}\n${draft.body}`).length;
  const appendix: Appendix = { input: flow.input, answers: flow.answers, createdAt: flow.createdAt, report: flow.report };

  const set = (key: EditKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...draft, [key]: e.target.value });
    // Editing an approved letter voids the approval.
    if (approval.status === "freigegeben") onApprovalChange(NEW_APPROVAL);
  };

  function approve(e: React.FormEvent) {
    e.preventDefault();
    const name = approver.trim();
    if (!name) return;
    const at = new Date().toISOString();
    onChange({ ...draft, subject: stripDraftLines(draft.subject), body: stripDraftLines(draft.body) });
    onApprovalChange({ status: "freigegeben", by: name, at });
    remember("baufrist:freigeber", name);
    // Fristen & Verlauf: only type, recipient, subject, approval, deadline and the letter text (this browser only).
    const body = stripDraftLines(draft.body);
    saveToVerlauf({
      id: flow.createdAt,
      type: letterType,
      recipient: draft.recipient,
      subject: stripDraftLines(draft.subject),
      approvedAt: at,
      approvedBy: name,
      deadline: deadlineOf(body),
      text: { salutation: draft.salutation, body, closing: draft.closing },
    });
    setAsking(false);
    setEditing(false);
  }

  async function word() {
    setExporting(true);
    setError("");
    try {
      await exportDocx(draft, title, isDraft, letterDate, appendix);
    } catch {
      setError("Word-Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setExporting(false);
    }
  }

  async function copy() {
    setError("");
    try {
      await copyText(plainText(draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren fehlgeschlagen. Bitte den Text markieren und manuell kopieren.");
    }
  }

  const editField = "w-full resize-none rounded-md border border-dashed border-[var(--border)] bg-[#fffdf7] px-2 py-1 focus:border-[var(--ink)] focus:outline-none [field-sizing:content]";

  return (
    <section className="flex flex-col gap-4">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
        {/* Left: the letter as a sheet of paper, with the status strip as its top edge. */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-x-3">
            <h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2>
            <a href="#freigabe" className={`${linkBtn} lg:hidden`}>{isDraft ? "Zur Freigabe ↓" : "Status & Export ↓"}</a>
            <button className={`${linkBtn} shrink-0`} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
              {editing ? "Fertig" : "Text bearbeiten"}
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] shadow-[0_1px_3px_rgba(26,26,26,0.08)]">
          {isDraft ? (
            <div className="border-b border-[var(--warning-border)] bg-[#ffe9a8] px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-[#5a3d00]">
              Entwurf – vor Versand prüfen
            </div>
          ) : (
            <div role="status" className="border-b border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-2 text-center text-base font-bold text-[var(--success-text)]">
              Freigegeben von {approval.by} am {approvalTime(approval.at)}
            </div>
          )}
          <article
            className="relative bg-white px-5 py-6 text-[16px] leading-relaxed text-[#111827] sm:px-12 sm:py-8 lg:text-[17px]"
            aria-label="Schreiben"
            onDoubleClick={() => !editing && setEditing(true)}
          >
            <p className="border-b border-[var(--border)] pb-1 text-xs text-[var(--muted)]">{senderLine}</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:justify-between">
              {editing ? (
                <textarea aria-label="Empfänger" rows={4} className={`${editField} sm:max-w-[60%]`} value={draft.recipient} onChange={set("recipient")} />
              ) : (
                <p className="whitespace-pre-line"><Highlighted text={draft.recipient} /></p>
              )}
              <p className="shrink-0 sm:pt-[4.5em] sm:text-right">{dateLine(letterDate)}</p>
            </div>
            <div className="mt-6 font-bold">
              {editing ? (
                <textarea aria-label="Betreff" rows={2} className={`${editField} font-bold`} value={draft.subject} onChange={set("subject")} />
              ) : (
                <p className="whitespace-pre-line"><Highlighted text={draft.subject} /></p>
              )}
            </div>
            <div className="mt-5">
              {editing ? (
                <input aria-label="Anrede" className={editField} value={draft.salutation} onChange={set("salutation")} />
              ) : (
                <p>{draft.salutation}</p>
              )}
            </div>
            <div className="mt-3">
              {editing ? (
                <textarea aria-label="Text" rows={16} className={editField} value={draft.body} onChange={set("body")} />
              ) : (
                paragraphs(draft.body).map((p, i) => (
                  <p key={i} className="mt-3 whitespace-pre-line first:mt-0"><Highlighted text={p} /></p>
                ))
              )}
            </div>
            <div className="mt-5">
              {editing ? (
                <input aria-label="Gruß" className={editField} value={draft.closing} onChange={set("closing")} />
              ) : (
                <p>{draft.closing}</p>
              )}
              <p className="mt-1 whitespace-pre-line">{signature.join("\n")}</p>
            </div>
          </article>
          </div>
          {holes > 0 && (
            <p className="text-sm font-semibold text-[var(--warning-text)]">
              {holes === 1 ? "1 Platzhalter" : `${holes} Platzhalter`} [ … ] im Text – bitte ergänzen („Text bearbeiten“).
            </p>
          )}
          {(draft.legal_basis || draft.deadline_hint) && (
            <div className={`${card} bg-[var(--surface)] text-[15px]`}>
              {draft.legal_basis && <p><span className="font-semibold">Rechtsgrundlage:</span> {draft.legal_basis}</p>}
              {draft.deadline_hint && <p className="mt-1"><span className="font-semibold">Frist / Form:</span> {draft.deadline_hint}</p>}
            </div>
          )}
          {draft.missing.length > 0 && (
            <div className={`${card} text-[15px]`}>
              <p className="font-semibold">Noch offen:</p>
              <ul className="mt-1 list-disc pl-5">{draft.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
        </div>

        {/* Right: status, Prüfliste, cost, export. */}
        <aside id="freigabe" className="flex scroll-mt-4 flex-col gap-4 lg:sticky lg:top-4">
          <div className={`${card} py-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={h2}>Status</p>
              <Chip kind={isDraft ? "entwurf" : "freigegeben"} />
              {isDraft && !asking && (
                <button className={`${btnPrimary} sm:ml-auto sm:w-auto sm:flex-1`} onClick={() => setAsking(true)}>Freigeben</button>
              )}
            </div>
            {isDraft && !asking && (
              <div className="mt-2">
                <p className="text-sm leading-snug text-[var(--muted)]">
                  {open > 0 ? <span className="font-semibold text-[var(--warning-text)]">Offen: {open} {open === 1 ? "Punkt" : "Punkte"} der Prüfliste. </span> : null}
                  Nur Sie geben frei. Es wird nichts automatisch versendet.
                </p>
              </div>
            )}
            {isDraft && asking && (
              <form onSubmit={approve} className="mt-3 flex flex-col gap-2">
                <label htmlFor="approver" className={label}>Freigegeben von</label>
                <input id="approver" className={field} value={approver} onChange={(e) => setApprover(e.target.value)} autoComplete="name" autoFocus required />
                {open > 0 && <p className="text-sm font-semibold text-[var(--warning-text)]">Offen: {open} {open === 1 ? "Punkt" : "Punkte"} der Prüfliste</p>}
                <div className="flex gap-2">
                  <button type="submit" className={`${btnPrimary} flex-1`} disabled={!approver.trim()}>Freigabe bestätigen</button>
                  <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setAsking(false)}>Abbrechen</button>
                </div>
              </form>
            )}
            {!isDraft && (
              <p className={`${hint} mt-3`}>Gespeichert unter „Fristen & Verlauf“ (nur in diesem Browser). Wenn Sie den Text ändern, wird das Schreiben wieder zum Entwurf.</p>
            )}
            {flow.aiSeconds !== null && flow.aiSeconds > 0 && (
              <p className={`${hint} mt-2`}>Entwurf in {flow.aiSeconds} s erstellt</p>
            )}
          </div>

          <div className={`${card} py-4`}>
            <p className={h2}>Prüfliste vor Versand</p>
            <ul className="mt-1 grid gap-x-5 sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.label} className={`flex items-baseline justify-between gap-2 border-b border-[var(--border)] py-1.5 text-[15px] leading-snug ${c.label === "Unverzüglich" && !c.ok ? "sm:col-span-2" : ""}`}>
                  <span>{c.label}</span>
                  {c.ok ? (
                    <span className="shrink-0 font-semibold text-[var(--success-text)]">✓ {c.note && c.label === "Unverzüglich" ? c.note : ""}</span>
                  ) : (
                    <span className="shrink-0 text-right font-semibold text-[var(--accent-strong)]">{c.note && c.label === "Unverzüglich" ? c.note : "fehlt"}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {letterType === "behinderung" && <CostCard facts={facts} />}

          <div className={card}>
            <p className={h2}>Export</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-3">
              <button className={`${isDraft ? btnSecondary : btnPrimary} sm:w-full`} onClick={word} disabled={exporting}>
                {exporting ? "…" : "Word"}
              </button>
              <button className={`${btnSecondary} sm:w-full`} onClick={printSheet}>PDF</button>
              <button className={`${btnSecondary} sm:w-full`} onClick={copy}>{copied ? "Kopiert ✓" : "Kopieren"}</button>
            </div>
            <p className={`${hint} mt-2`}>
              {isDraft ? "Word und PDF tragen das Wasserzeichen „ENTWURF“, bis Sie freigeben. " : ""}
              Mit Anlage „Dokumentation“. PDF: im Druckdialog „Als PDF speichern“ wählen.
            </p>
            {error && <p role="alert" className="mt-2 font-semibold text-[var(--error-text)]">{error}</p>}
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap gap-x-6">
        <button className={linkBtn} onClick={onBack}>Zurück zu den Angaben</button>
        <button className={linkBtn} onClick={onRestart}>Neue Situation</button>
      </div>

      {typeof document !== "undefined" &&
        createPortal(<PrintSheet draft={draft} isDraft={isDraft} date={letterDate} appendix={appendix} />, document.body)}
    </section>
  );
}

/** Standstill cost estimate. Pure arithmetic; unknown values stay empty instead of being guessed. */
function CostCard({ facts }: { facts: Record<string, unknown> }) {
  const [workers, setWorkers] = useState(numberFact(facts.arbeitskraefte_ohne_produktive_arbeit));
  const [hours, setHours] = useState(String(project.kosten.arbeitsstunden_pro_tag));
  const [rate, setRate] = useState(String(project.kosten.verrechnungssatz_eur_h));
  const [days, setDays] = useState(numberFact(facts.tage_bisher));
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
  const perDay = n(workers) * n(hours) * n(rate);
  const total = perDay * n(days);
  const ok = Number.isFinite(perDay) && perDay >= 0;
  const inputs: [string, string, string, (v: string) => void, string][] = [
    ["cost-workers", "Arbeitskräfte", workers, setWorkers, "1"],
    ["cost-hours", "Std. pro Tag", hours, setHours, "0.5"],
    ["cost-rate", "€ pro Std.", rate, setRate, "1"],
    ["cost-days", "Tage", days, setDays, "1"],
  ];
  return (
    <div className={`${card} py-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className={h2}>Was kostet der Stillstand?</p>
        <p className="text-sm font-semibold text-[var(--muted)]">Schätzung – zur internen Information</p>
      </div>
      <div className="mt-2 rounded-lg bg-[var(--surface)] px-3 py-2" aria-live="polite">
        {ok ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 text-[var(--ink)]">
              <span className="text-[26px] leading-tight font-bold">{euro(Number.isFinite(total) ? total : perDay)}</span>
              <span className="font-semibold">{Number.isFinite(total) ? `bisher ${days} ${n(days) === 1 ? "Tag" : "Tage"}` : "pro Tag"}</span>
            </p>
            <p className="text-sm text-[var(--muted)]">
              {workers} Arbeitskräfte × {hours} h × {rate} €/h = {euro(perDay)} pro Tag
            </p>
          </>
        ) : (
          <p className="font-semibold text-[var(--muted)]">Bitte fehlende Werte eintragen.</p>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {inputs.map(([id, text, value, setter, step]) => (
          <div key={id} className="flex flex-col justify-end">
            <label htmlFor={id} className="mb-1 text-sm font-semibold leading-tight text-[var(--ink)]">{text}</label>
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min="0"
              step={step}
              className={`${field} px-3 py-2 text-lg font-semibold`}
              value={value}
              onChange={(e) => setter(e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">Nur Personal. Geräte (z. B. Kran) und Baustellengemeinkosten kommen hinzu.</p>
    </div>
  );
}

/** Hidden on screen; the only thing visible when printing (see globals.css). */
export function PrintSheet({ draft, isDraft, date, appendix, sheet = "entwurf" }: { draft: Letter; isDraft: boolean; date: string; appendix?: Appendix; sheet?: "entwurf" | "verlauf" }) {
  return (
    <div data-sheet={sheet} className="print-sheet hidden bg-white font-sans text-[11pt] leading-snug text-black">
      {isDraft && <div aria-hidden className="print-watermark">ENTWURF</div>}
      <div className="text-right">
        <p className="text-[13pt] font-bold">{signature[0]}</p>
        <p className="text-[9pt]">{senderLine.split(" · ").slice(1).join(", ")}</p>
      </div>
      <p className="mt-10 border-b border-neutral-500 pb-0.5 text-[8pt]">{senderLine}</p>
      <p className="mt-2 whitespace-pre-line">{draft.recipient}</p>
      <p className="mt-12 text-right">{dateLine(date)}</p>
      <p className="mt-8 whitespace-pre-line font-bold">{draft.subject}</p>
      <p className="mt-8">{draft.salutation}</p>
      {paragraphs(draft.body).map((p, i) => (
        <p key={i} className="mt-3 whitespace-pre-line">{p}</p>
      ))}
      <p className="mt-6 whitespace-pre-line">{draft.closing}</p>
      <p className="whitespace-pre-line">{signature.join("\n")}</p>
      {isDraft && <p className="mt-10 text-center text-[9pt] font-bold text-amber-700">ENTWURF – vor Versand prüfen</p>}
      {appendix && (
        <div style={{ breakBefore: "page" }}>
          <p className="text-[13pt] font-bold">Anlage – Dokumentation</p>
          {appendixSections(appendix).map((s) => (
            <div key={s.title} className="mt-4">
              <p className="font-bold">{s.title}</p>
              <p className="whitespace-pre-line text-[10pt]">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
