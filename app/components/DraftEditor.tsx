"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import project from "@/data/project.json";
import type { Letter } from "@/lib/types";
import { dateLine, exportDocx, paragraphs, plainText, senderLine, signature, stripDraftLines } from "../lib/export";
import { btnPrimary, btnSecondary, field, label } from "../lib/ui";

/** Review status of a draft. Only the user changes it, with the buttons below. Kept in memory, no database. */
export type Approval =
  | { status: "entwurf" }
  | { status: "geprueft" }
  | { status: "freigegeben"; by: string; at: string };

export const NEW_APPROVAL: Approval = { status: "entwurf" };

const STEPS = [
  { id: "entwurf", label: "Entwurf" },
  { id: "geprueft", label: "Geprüft" },
  { id: "freigegeben", label: "Freigegeben" },
] as const;

export function approvalTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
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

type Props = {
  title: string;
  draft: Letter;
  onChange: (d: Letter) => void;
  approval: Approval;
  onApprovalChange: (a: Approval) => void;
  onBack: () => void;
  onRestart: () => void;
};

export default function DraftEditor({ title, draft, onChange, approval, onApprovalChange, onBack, onRestart }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [approver, setApprover] = useState(project.bauleiter.name);

  const isDraft = approval.status !== "freigegeben";

  const set = (key: "recipient" | "subject" | "salutation" | "body" | "closing") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...draft, [key]: e.target.value });
      // Editing an approved letter voids the approval.
      if (approval.status === "freigegeben") onApprovalChange({ status: "geprueft" });
    };

  function approve(e: React.FormEvent) {
    e.preventDefault();
    const name = approver.trim();
    if (!name) return;
    onChange({ ...draft, subject: stripDraftLines(draft.subject), body: stripDraftLines(draft.body) });
    onApprovalChange({ status: "freigegeben", by: name, at: new Date().toISOString() });
    setAsking(false);
  }

  async function word() {
    setExporting(true);
    setError("");
    try {
      await exportDocx(draft, title, isDraft);
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
      setError("Kopieren fehlgeschlagen. Bitte den Text manuell markieren und kopieren.");
    }
  }

  const current = STEPS.findIndex((s) => s.id === approval.status);

  return (
    <section className="flex flex-col gap-4">
      {isDraft ? (
        <div className="rounded-xl border-2 border-amber-500 bg-amber-300 px-4 py-3 text-center text-lg font-extrabold uppercase tracking-wide text-amber-950">
          Entwurf – vor Versand prüfen
        </div>
      ) : (
        <div role="status" className="rounded-xl border-2 border-green-600 bg-green-100 px-4 py-3 text-center text-lg font-bold text-green-950">
          Freigegeben von {approval.by} am {approvalTime(approval.at)}
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-neutral-600">
          Alle Felder sind bearbeitbar. Es wird nichts automatisch versendet – Sie exportieren und versenden selbst.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className={label}>Status</p>
        <ol className="grid grid-cols-3 gap-1" aria-label="Status des Schreibens">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              aria-current={i === current ? "step" : undefined}
              className={`rounded-lg px-1 py-2 text-center text-sm font-semibold ${
                i === current
                  ? s.id === "freigegeben" ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                  : i < current ? "bg-neutral-200 text-neutral-800" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {i < current ? "✓ " : ""}{s.label}
            </li>
          ))}
        </ol>

        <div className="mt-3 flex flex-col gap-2">
          {approval.status === "entwurf" && (
            <button className={btnPrimary} onClick={() => onApprovalChange({ status: "geprueft" })}>
              Als geprüft markieren
            </button>
          )}
          {approval.status === "geprueft" && !asking && (
            <>
              <button className={btnPrimary} onClick={() => setAsking(true)}>Freigeben</button>
              <button className={btnSecondary} onClick={() => onApprovalChange({ status: "entwurf" })}>
                Zurück auf Entwurf
              </button>
            </>
          )}
          {approval.status === "geprueft" && asking && (
            <form onSubmit={approve} className="flex flex-col gap-2">
              <label htmlFor="approver" className={label}>Name der freigebenden Person</label>
              <input
                id="approver"
                className={field}
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                autoComplete="name"
                autoFocus
                required
              />
              <button type="submit" className={btnPrimary} disabled={!approver.trim()}>Freigabe bestätigen</button>
              <button type="button" className={btnSecondary} onClick={() => setAsking(false)}>Abbrechen</button>
            </form>
          )}
          {approval.status === "freigegeben" && (
            <p className="text-sm text-neutral-600">
              Wenn Sie den Text jetzt noch ändern, geht der Status zurück auf „Geprüft“ und muss neu freigegeben werden.
            </p>
          )}
        </div>
      </div>

      {(draft.legal_basis || draft.deadline_hint) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
          {draft.legal_basis && (
            <p><span className="font-semibold">Rechtsgrundlage:</span> {draft.legal_basis}</p>
          )}
          {draft.deadline_hint && (
            <p className="mt-1"><span className="font-semibold">Frist / Form:</span> {draft.deadline_hint}</p>
          )}
        </div>
      )}

      {draft.missing.length > 0 && (
        <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950">
          <p className="mb-1 font-semibold">Noch offen – bitte im Text ergänzen:</p>
          <ul className="list-disc pl-5">
            {draft.missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <p className="mt-2 text-sm">Platzhalter im Text stehen in [eckigen Klammern].</p>
        </div>
      )}

      <div>
        <label htmlFor="recipient" className={label}>Empfänger</label>
        <textarea id="recipient" rows={4} className={field} value={draft.recipient} onChange={set("recipient")} />
      </div>
      <div>
        <label htmlFor="subject" className={label}>Betreff</label>
        <textarea id="subject" rows={3} className={field} value={draft.subject} onChange={set("subject")} />
      </div>
      <div>
        <label htmlFor="salutation" className={label}>Anrede</label>
        <input id="salutation" className={field} value={draft.salutation} onChange={set("salutation")} />
      </div>
      <div>
        <label htmlFor="body" className={label}>Text</label>
        <textarea id="body" className={`${field} min-h-96`} value={draft.body} onChange={set("body")} />
      </div>
      <div>
        <label htmlFor="closing" className={label}>Gruß</label>
        <input id="closing" className={field} value={draft.closing} onChange={set("closing")} />
        <p className="mt-1 text-sm text-neutral-600">Darunter: {signature.filter(Boolean).join(", ")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button className={btnPrimary} onClick={word} disabled={exporting}>
          {exporting ? "Wird erstellt …" : "Word (.docx)"}
        </button>
        <button className={btnPrimary} onClick={() => window.print()}>
          PDF
        </button>
        <button className={btnPrimary} onClick={copy}>
          {copied ? "Kopiert ✓" : "Kopieren"}
        </button>
      </div>
      <p className="text-sm text-neutral-600">
        {isDraft && "Word und PDF tragen das Wasserzeichen „ENTWURF“, bis das Schreiben freigegeben ist. "}
        PDF: Druckansicht öffnet sich → „Als PDF sichern“ wählen. Auf iPad/iPhone: Teilen → Drucken → mit zwei Fingern aufziehen → PDF.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className={btnSecondary} onClick={onBack}>Zurück zu den Angaben</button>
        <button className={btnSecondary} onClick={onRestart}>Neue Situation</button>
      </div>

      {typeof document !== "undefined" && createPortal(<PrintSheet draft={draft} isDraft={isDraft} />, document.body)}
    </section>
  );
}

/** Hidden on screen; the only thing visible when printing (see globals.css). */
function PrintSheet({ draft, isDraft }: { draft: Letter; isDraft: boolean }) {
  return (
    <div id="print-sheet" className="hidden bg-white font-sans text-[11pt] leading-snug text-black">
      {isDraft && (
        <div aria-hidden className="print-watermark">ENTWURF</div>
      )}
      <div className="text-right">
        <p className="text-[13pt] font-bold">{signature[0]}</p>
        <p className="text-[9pt]">{senderLine.split(" · ").slice(1).join(", ")}</p>
      </div>
      <p className="mt-10 border-b border-neutral-500 pb-0.5 text-[8pt]">{senderLine}</p>
      <p className="mt-2 whitespace-pre-line">{draft.recipient}</p>
      <p className="mt-12 text-right">{dateLine()}</p>
      <p className="mt-8 whitespace-pre-line font-bold">{draft.subject}</p>
      <p className="mt-8">{draft.salutation}</p>
      {paragraphs(draft.body).map((p, i) => (
        <p key={i} className="mt-3 whitespace-pre-line">{p}</p>
      ))}
      <p className="mt-6 whitespace-pre-line">{draft.closing}</p>
      <p className="whitespace-pre-line">{signature.join("\n")}</p>
      {isDraft && (
        <p className="mt-10 text-center text-[9pt] font-bold text-amber-700">ENTWURF – vor Versand prüfen</p>
      )}
    </div>
  );
}
