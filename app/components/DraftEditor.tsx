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
import { btnPrimary, h1, issueTitle, kicker, linkBtn, meta } from "../lib/ui";

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
  const [checksOpen, setChecksOpen] = useState(false);
  const basis = legalShort(draft.legal_basis);
  const done = checks.filter((c) => c.ok).length;
  const holeList = [...new Set(placeholders(`${draft.recipient}\n${draft.subject}\n${draft.body}`))];
  const extraRows: { label: string; detail: string; missing?: boolean }[] = [
    ...holeList.map((h) => ({ label: "Platzhalter", detail: h, missing: true })),
    ...(draft.legal_basis ? [{ label: "Rechtsgrundlage", detail: draft.legal_basis }] : []),
    ...(draft.deadline_hint ? [{ label: "Frist / Form", detail: draft.deadline_hint }] : []),
  ];
  const statusText = isDraft ? "Entwurf" : `Freigegeben · ${approval.by}, ${approvalTime(approval.at)}`;

  return (
    <section className="fade-in">
      {/* Intro */}
      <p className={kicker}>{title.split(" (")[0]}{basis ? ` · ${basis}` : ""}</p>
      <h1 className={`${h1} !mb-[10px] !text-[clamp(32px,4.2vw,46px)]`}>{issueTitle(draft.subject, title.split(" (")[0])}</h1>
      <p className={meta}>
        {recipientOf(draft.recipient) ? `An ${recipientOf(draft.recipient)}` : ""}
        {flow.aiSeconds !== null && flow.aiSeconds > 0 ? ` · in ${flow.aiSeconds} s entworfen` : ""}
      </p>

      {/* Status bar: no coloured band, just rules. */}
      <div id="freigabe" className="mt-6 flex scroll-mt-4 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-b border-t-[var(--ink)] border-b-[var(--rule)] py-3 font-sans">
        <p role="status" className="text-[14px] font-bold">{statusText}</p>
        {isDraft && asking ? (
          <form onSubmit={approve} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label htmlFor="approver" className="text-[14px] text-[var(--grey)]">Freigegeben von</label>
            <input
              id="approver"
              className="min-h-11 w-48 border-0 border-b border-[var(--ink)] bg-transparent font-serif text-[18px] focus:outline-none"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              autoComplete="name"
              autoFocus
              required
            />
            {open > 0 && <span className="text-[13px] font-bold text-[var(--urgent)]">Offen: {open} {open === 1 ? "Punkt" : "Punkte"} der Prüfliste</span>}
            <button type="submit" className={`${btnPrimary} min-h-[46px] px-[26px]`} disabled={!approver.trim()}>Freigabe bestätigen</button>
            <button type="button" className={linkBtn} onClick={() => setAsking(false)}>Abbrechen</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <button className={linkBtn} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>{editing ? "Fertig" : "Bearbeiten"}</button>
            <button className={linkBtn} onClick={word} disabled={exporting}>{exporting ? "Word …" : "Word"}</button>
            <button className={linkBtn} onClick={printSheet}>PDF</button>
            <button className={linkBtn} onClick={copy}>{copied ? "Kopiert ✓" : "Kopieren"}</button>
            {isDraft && <button className={`${btnPrimary} min-h-[46px] px-[26px]`} onClick={() => setAsking(true)}>Freigeben</button>}
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-3 font-sans text-[14px] font-bold text-[var(--urgent)]">{error}</p>}

      {/* The letter in a thin black box. */}
      <article
        className="relative mt-7 border border-[var(--ink)] p-[clamp(24px,5vw,52px)]"
        aria-label="Schreiben"
        onDoubleClick={() => !editing && setEditing(true)}
      >
        <div className="mb-[30px] text-center font-sans text-[14px]">
          <p>{isDraft ? "Entwurf – vor Versand prüfen" : "Freigegeben"}</p>
          <div aria-hidden className="mx-auto mt-[10px] h-[2px] w-16 bg-[var(--accent)]" />
        </div>
        <div className="text-[17.5px] leading-[1.65]">
          <p className="mb-[22px] border-b border-[var(--rule)] pb-2 font-sans text-[12px] text-[var(--grey)]">{senderLine}</p>
          <div className="mb-7 flex flex-wrap justify-between gap-3">
            {editing ? (
              <textarea aria-label="Empfänger" rows={4} className={`${editField} sm:max-w-[60%]`} value={draft.recipient} onChange={set("recipient")} />
            ) : (
              <p className="whitespace-pre-line"><Highlighted text={draft.recipient} /></p>
            )}
            <p className="self-end whitespace-nowrap">{dateLine(letterDate)}</p>
          </div>
          <div className="mb-5 font-bold">
            {editing ? (
              <textarea aria-label="Betreff" rows={2} className={`${editField} font-bold`} value={draft.subject} onChange={set("subject")} />
            ) : (
              <p className="whitespace-pre-line"><Highlighted text={draft.subject} /></p>
            )}
          </div>
          <div className="mb-[14px]">
            {editing ? (
              <input aria-label="Anrede" className={editField} value={draft.salutation} onChange={set("salutation")} />
            ) : (
              <p>{draft.salutation}</p>
            )}
          </div>
          {editing ? (
            <textarea aria-label="Text" rows={16} className={editField} value={draft.body} onChange={set("body")} />
          ) : (
            paragraphs(draft.body).map((p, i) => (
              <p key={i} className="mb-[14px] whitespace-pre-line"><Highlighted text={p} /></p>
            ))
          )}
          <div className="mt-7">
            {editing ? (
              <input aria-label="Gruß" className={editField} value={draft.closing} onChange={set("closing")} />
            ) : (
              <p>{draft.closing}</p>
            )}
            <p className="whitespace-pre-line">{signature.join("\n")}</p>
          </div>
        </div>
        {!isDraft && (
          <div ref={stampRef} role="img" aria-label={`Freigegeben am ${approvalTime(approval.at)} von ${approval.by}`} className="stamp absolute top-[52%] right-[8%] border-[3px] border-[var(--urgent)] bg-white/70 px-[18px] pt-[10px] pb-2 text-center text-[var(--urgent)]">
            <p className="font-sans text-[26px] leading-none font-extrabold tracking-[.08em]">FREIGEGEBEN</p>
            <p className="mt-[6px] font-sans text-[12px] font-bold whitespace-nowrap uppercase">{stampLine(approval.at, approval.by)}</p>
          </div>
        )}
      </article>

      {/* Prüfliste, collapsed by default. */}
      <section className="mt-12 border-t-2 border-[var(--ink)]" aria-label="Prüfliste">
        <button
          onClick={() => setChecksOpen((v) => !v)}
          aria-expanded={checksOpen}
          className="flex min-h-[52px] w-full items-center justify-between gap-4 border-b border-[var(--rule)] text-left font-sans text-[13px] font-extrabold tracking-[.04em] uppercase"
        >
          <span>Prüfliste · {done} von {checks.length} erfüllt</span>
          <span className="font-semibold tracking-normal text-[var(--accent)] normal-case">{checksOpen ? "Ausblenden" : "Anzeigen"}</span>
        </button>
        {checksOpen && (
          <ul>
            {[...checks.map((c) => ({ label: c.label, detail: c.ok ? c.note ?? "" : c.note && c.label === "Unverzüglich" ? c.note : "fehlt", missing: !c.ok })), ...extraRows].map((r, i) => (
              <li key={`${r.label}-${i}`} className="row-in flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-[11px]" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`text-[18px] ${r.missing ? "text-[var(--urgent)]" : ""}`}>{r.label}</span>
                <span className="max-w-[62%] text-right text-[16px] text-[var(--grey)]">{r.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {letterType === "behinderung" && <CostSection facts={facts} />}

      <div className="mt-10 flex flex-wrap gap-x-6">
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

/** Addressee for the metadata line: the „z. Hd.“ person if given, else the first address line. */
function recipientOf(recipient: string) {
  const lines = recipient.split("\n").map((l) => l.trim()).filter(Boolean);
  const attn = lines.find((l) => /^z\.\s*Hd\.?/i.test(l));
  return (attn ? attn.replace(/^z\.\s*Hd\.?\s*/i, "").replace(/^(Herrn|Herr)\s/, "Herr ") : lines[0] ?? "").split(",")[0];
}

/** „21.11.2026 · 16:12 · T. Berger“ for the stamp. */
function stampLine(iso: string, by: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const parts = by.trim().split(/\s+/);
  const name = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : by;
  return `${day} · ${time} · ${name}`;
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
function CostSection({ facts }: { facts: Record<string, unknown> }) {
  const [workers, setWorkers] = useState(numberFact(facts.arbeitskraefte_ohne_produktive_arbeit));
  const [hours, setHours] = useState(String(project.kosten.arbeitsstunden_pro_tag));
  const [rate, setRate] = useState(String(project.kosten.verrechnungssatz_eur_h));
  const [days, setDays] = useState(numberFact(facts.tage_bisher));
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
  const perDay = n(workers) * n(hours) * n(rate);
  const total = perDay * n(days);
  const ok = Number.isFinite(perDay) && perDay >= 0;
  const amount = Number.isFinite(total) ? total : perDay;
  const num = "min-h-10 border-0 border-b border-[var(--ink)] bg-transparent text-center font-serif text-[19px] font-bold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
  const input = (id: string, label: string, value: string, setter: (v: string) => void, w: string) => (
    <input id={id} aria-label={label} type="number" inputMode="decimal" min="0" className={`${num} ${w}`} value={value} onChange={(e) => setter(e.target.value)} />
  );
  return (
    <section className="mt-12 border-t-2 border-[var(--ink)] pt-[10px]" aria-labelledby="h-kosten" aria-live="polite">
      <h2 id="h-kosten" className="font-sans text-[13px] font-extrabold tracking-[.04em] uppercase">Stillstand</h2>
      <p className="mt-3 mb-[6px] font-serif text-[clamp(56px,8vw,88px)] leading-[1.05] font-bold tracking-[-.03em] whitespace-nowrap">
        {ok ? <CountUp value={amount} /> : "– €"}
      </p>
      <p className="text-[19px] leading-[2.1]">
        {input("cost-workers", "Arbeitskräfte", workers, setWorkers, "w-[52px]")} Leute ×{" "}
        {input("cost-hours", "Stunden pro Tag", hours, setHours, "w-[44px]")} Std. ×{" "}
        {input("cost-rate", "Euro pro Stunde", rate, setRate, "w-[52px]")} €/Std. ×{" "}
        {input("cost-days", "Tage", days, setDays, "w-[40px]")} {n(days) === 1 ? "Tag" : "Tage"}
      </p>
      <p className="mt-2 font-sans text-[13px] text-[var(--grey)]">Nur Personal. Geräte und Baustellengemeinkosten kommen hinzu.</p>
    </section>
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
