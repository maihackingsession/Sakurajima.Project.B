"use client";

import { Fragment, useEffect, useRef, useState } from "react";
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
import { btnApprove, h1, issueTitle, kicker, linkBtn, linkOnDark, meta, TYPE_COLOR } from "../lib/ui";
import { TypeSquare } from "./Status";

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
          <mark key={i} className="bg-[#FCEFC0] px-0.5 text-[var(--ink)]">{p}</mark>
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
  const stampRef = useRef<HTMLDivElement>(null);
  // When approved, bring the stamp into view (it lands on the letter).
  useEffect(() => {
    if (!isDraft) stampRef.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [isDraft]);
  const checks = checklist(letterType, draft, facts, eventDate, !!flow.report);
  const open = checks.filter((c) => !c.ok).length;
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

  const editField = "w-full resize-none border-0 border-b border-dashed border-[var(--grey)] bg-[#FFFDF3] px-1 py-0.5 focus:border-solid focus:border-[var(--ink)] focus:outline-none [field-sizing:content]";
  const color = TYPE_COLOR[letterType];
  const basis = legalShort(draft.legal_basis);
  const recipientName = draft.recipient.split("\n")[0].trim();
  const done = checks.filter((c) => c.ok).length;
  const holeList = [...new Set(placeholders(`${draft.recipient}\n${draft.subject}\n${draft.body}`))];
  const statusText = isDraft
    ? "Entwurf · vor Versand prüfen"
    : `Freigegeben · ${approval.by}, ${approvalTime(approval.at)}`;

  return (
    <section className="fade-in">
      {/* Intro */}
      <div className="wrap pt-10 pb-7">
        <p className={`${kicker} flex items-center gap-2`}>
          <TypeSquare color={color} />
          <span>{title.split(" (")[0]}{basis && <span className="whitespace-nowrap"> · {basis}</span>}</span>
        </p>
        <h1 className={`${h1} mt-3 !text-[clamp(34px,4.4vw,56px)] !leading-[1.05]`}>{issueTitle(draft.subject, title.split(" (")[0])}</h1>
        <p className={`${meta} mt-4`}>
          {recipientName ? `An ${recipientName}` : ""}
          {flow.aiSeconds !== null && flow.aiSeconds > 0 ? ` · in ${flow.aiSeconds} s entworfen` : ""}
        </p>
      </div>

      {/* Status band: Entwurf (navy) → Freigegeben (green). */}
      <div id="freigabe" className={`status-band on-dark scroll-mt-4 text-white ${isDraft ? "bg-[var(--navy)]" : "bg-[var(--green)]"}`}>
        <div className="wrap flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
          <p role="status" className="font-sans text-[15px] font-bold">{statusText}</p>
          {isDraft && asking ? (
            <form onSubmit={approve} className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label htmlFor="approver" className="font-sans text-[14px] text-[var(--navy-muted)]">Freigegeben von</label>
              <input
                id="approver"
                className="min-h-11 w-52 border-0 border-b-2 border-white bg-transparent font-serif text-[18px] text-white focus:outline-none"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                autoComplete="name"
                autoFocus
                required
              />
              {open > 0 && <span className="font-sans text-[14px] font-bold text-[var(--yellow)]">Offen: {open} {open === 1 ? "Punkt" : "Punkte"} der Prüfliste</span>}
              <button type="submit" className={btnApprove} disabled={!approver.trim()}>Freigabe bestätigen</button>
              <button type="button" className={linkOnDark} onClick={() => setAsking(false)}>Abbrechen</button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <button className={linkOnDark} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>{editing ? "Fertig" : "Bearbeiten"}</button>
              <button className={linkOnDark} onClick={word} disabled={exporting}>{exporting ? "Word …" : "Word"}</button>
              <button className={linkOnDark} onClick={printSheet}>PDF</button>
              <button className={linkOnDark} onClick={copy}>{copied ? "Kopiert ✓" : "Kopieren"}</button>
              {isDraft && <button className={`${btnApprove} ml-1`} onClick={() => setAsking(true)}>Freigeben</button>}
            </div>
          )}
        </div>
      </div>
      {error && <div className="wrap pt-4"><p role="alert" className="font-sans text-[15px] font-bold text-[var(--red)]">{error}</p></div>}

      {/* Letter + margin notes */}
      <div className="wrap flex flex-wrap items-start gap-x-16 gap-y-10 pt-9 pb-8">
        <article
          className="relative min-w-0 max-w-[680px] pt-7 text-[18px] leading-[1.65]"
          style={{ flex: "999 1 560px", borderTop: `6px solid ${color}` }}
          aria-label="Schreiben"
          onDoubleClick={() => !editing && setEditing(true)}
        >
          <p className="border-b border-[var(--rule)] pb-1 font-sans text-[13px] text-[var(--grey)]">{senderLine}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
            {editing ? (
              <textarea aria-label="Empfänger" rows={4} className={`${editField} sm:max-w-[60%]`} value={draft.recipient} onChange={set("recipient")} />
            ) : (
              <p className="whitespace-pre-line"><Highlighted text={draft.recipient} /></p>
            )}
            <p className="shrink-0 whitespace-nowrap sm:pt-[4.95em] sm:text-right">{dateLine(letterDate)}</p>
          </div>
          <div className="mt-7 font-bold">
            {editing ? (
              <textarea aria-label="Betreff" rows={2} className={`${editField} font-bold`} value={draft.subject} onChange={set("subject")} />
            ) : (
              <p className="whitespace-pre-line"><Highlighted text={draft.subject} /></p>
            )}
          </div>
          <div className="mt-6">
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
                <p key={i} className="mt-4 whitespace-pre-line first:mt-0"><Highlighted text={p} /></p>
              ))
            )}
          </div>
          <div className="mt-6">
            {editing ? (
              <input aria-label="Gruß" className={editField} value={draft.closing} onChange={set("closing")} />
            ) : (
              <p>{draft.closing}</p>
            )}
            <p className="mt-1 whitespace-pre-line">{signature.join("\n")}</p>
          </div>
          {!isDraft && (
            <div ref={stampRef} className="stamp absolute top-[55%] right-[4%] border-[3px] border-[var(--green)] bg-white/75 px-[18px] pt-[10px] pb-2 text-center text-[var(--green)]" aria-hidden>
              <p className="font-sans text-[26px] leading-none font-extrabold tracking-[.08em]">FREIGEGEBEN</p>
              <p className="mt-1 font-sans text-[13px] font-bold">{approvalTime(approval.at)} · {approval.by}</p>
            </div>
          )}
        </article>

        {/* Margin notes: the Prüfliste per letter type, open placeholders, legal basis. */}
        <aside className="min-w-0 pt-[22px]" style={{ flex: "1 1 260px", borderTop: "6px solid var(--navy)" }} aria-label="Randnotizen">
          <p className={`${kicker} text-[var(--navy)]`}>Randnotizen · {done} von {checks.length} erfüllt</p>
          <ul className="mt-2">
            {checks.map((c, i) => (
              <Note key={c.label} i={i} ok={c.ok} label={c.label} detail={c.ok ? c.note : c.note && c.label === "Unverzüglich" ? c.note : "fehlt"} />
            ))}
            {holeList.map((h, i) => (
              <Note key={h} i={checks.length + i} ok={false} label="Platzhalter" detail={`${h} – bitte ergänzen („Bearbeiten“)`} />
            ))}
            {draft.legal_basis && <Note i={checks.length + holeList.length} label="§ Rechtsgrundlage" detail={draft.legal_basis} />}
            {draft.deadline_hint && <Note i={checks.length + holeList.length + 1} label="Versand" detail={draft.deadline_hint} />}
          </ul>
          {!isDraft && (
            <p className="mt-4 text-[16px] italic text-[var(--grey)]">Gespeichert unter „Fristen & Verlauf“ (nur in diesem Browser). Wenn Sie den Text ändern, wird das Schreiben wieder zum Entwurf.</p>
          )}
          {isDraft && <p className="mt-4 text-[16px] italic text-[var(--grey)]">Word und PDF tragen das Wasserzeichen „ENTWURF“, bis Sie freigeben. PDF: im Druckdialog „Als PDF speichern“.</p>}
        </aside>
      </div>

      {letterType === "behinderung" && <CostBand facts={facts} />}

      <div className="wrap flex flex-wrap gap-x-6 pt-6 pb-4">
        <button className={linkBtn} onClick={onBack}>Zurück zu den Angaben</button>
        <button className={linkBtn} onClick={onRestart}>Neue Situation</button>
      </div>

      {typeof document !== "undefined" &&
        createPortal(<PrintSheet draft={draft} isDraft={isDraft} date={letterDate} appendix={appendix} />, document.body)}
    </section>
  );
}

/** „§ 6 Abs. 1 VOB/B“ from the legal basis, if it cites the VOB/B. */
function legalShort(basis: string) {
  const m = /§\s*\d+(?:\s*Abs\.\s*\d+)?\s*VOB\/B/.exec(basis);
  return m ? m[0].replace(/\s+/g, " ") : "";
}

function Note({ i, ok, label, detail }: { i: number; ok?: boolean; label: string; detail?: string }) {
  const mark = ok === undefined ? "" : ok ? "✓ " : "✗ ";
  return (
    <li className="note-in border-b border-[var(--rule)] py-2.5" style={{ animationDelay: `${i * 60}ms` }}>
      <p className={`font-sans text-[14px] font-bold ${ok === false ? "text-[var(--red)]" : "text-[var(--ink)]"}`}>{mark}{label}</p>
      {detail && <p className="text-[16px] leading-snug italic text-[var(--grey)]">{detail}</p>}
    </li>
  );
}

/** Animated euro amount (0.9 s ease-out count-up; instant under reduced motion). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === value) {
      from.current = value;
      const t = setTimeout(() => setShown(value), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3));
      setShown(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{euro(Math.round(shown))}</>;
}

/** Standstill cost estimate (Behinderung only). Pure arithmetic; unknown values stay empty. Never in the letter. */
function CostBand({ facts }: { facts: Record<string, unknown> }) {
  const [workers, setWorkers] = useState(numberFact(facts.arbeitskraefte_ohne_produktive_arbeit));
  const [hours, setHours] = useState(String(project.kosten.arbeitsstunden_pro_tag));
  const [rate, setRate] = useState(String(project.kosten.verrechnungssatz_eur_h));
  const [days, setDays] = useState(numberFact(facts.tage_bisher));
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
  const perDay = n(workers) * n(hours) * n(rate);
  const total = perDay * n(days);
  const ok = Number.isFinite(perDay) && perDay >= 0;
  const amount = Number.isFinite(total) ? total : perDay;
  const num = "w-[52px] border-0 border-b border-[var(--ink)] bg-transparent text-center font-serif text-[19px] font-bold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
  const input = (id: string, label: string, value: string, setter: (v: string) => void) => (
    <input id={id} aria-label={label} type="number" inputMode="decimal" min="0" className={num} value={value} onChange={(e) => setter(e.target.value)} />
  );
  return (
    <div className="border-y border-[var(--ink)] bg-[var(--yellow)]">
      <div className="wrap flex flex-wrap items-baseline gap-x-6 gap-y-2 py-[22px]" aria-live="polite">
        <p className={kicker}>{Number.isFinite(total) ? "Stillstand bisher" : "Stillstand pro Tag"}</p>
        <p className="font-serif text-[44px] leading-none font-bold tracking-[-.035em] whitespace-nowrap">
          {ok ? <CountUp value={amount} /> : "– €"}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[18px]">
          {input("cost-workers", "Arbeitskräfte", workers, setWorkers)} Leute ×
          {input("cost-hours", "Stunden pro Tag", hours, setHours)} Std. ×
          {input("cost-rate", "Euro pro Stunde", rate, setRate)} €/Std. ×
          {input("cost-days", "Tage", days, setDays)} {n(days) === 1 ? "Tag" : "Tage"}
        </p>
        <p className="w-full font-sans text-[14px]">Schätzung zur internen Information. Nur Personal. Geräte und Baustellengemeinkosten kommen hinzu.</p>
      </div>
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
