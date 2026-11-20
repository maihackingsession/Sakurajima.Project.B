"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Letter } from "@/lib/types";
import { dateLine, exportDocx, paragraphs, senderLine, signature } from "../lib/export";
import { btnPrimary, btnSecondary, field, label } from "../lib/ui";

type Props = {
  title: string;
  draft: Letter;
  onChange: (d: Letter) => void;
  onBack: () => void;
  onRestart: () => void;
};

export default function DraftEditor({ title, draft, onChange, onBack, onRestart }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: "recipient" | "subject" | "salutation" | "body" | "closing") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...draft, [key]: e.target.value });

  async function word() {
    setExporting(true);
    setError("");
    try {
      await exportDocx(draft, title);
    } catch {
      setError("Word-Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border-2 border-amber-500 bg-amber-300 px-4 py-3 text-center text-lg font-extrabold uppercase tracking-wide text-amber-950">
        Entwurf – vor Versand prüfen
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-neutral-600">
          Alle Felder sind bearbeitbar. Es wird nichts automatisch versendet – Sie exportieren und versenden selbst.
        </p>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className={btnPrimary} onClick={word} disabled={exporting}>
          {exporting ? "Wird erstellt …" : "Word (.docx)"}
        </button>
        <button className={btnPrimary} onClick={() => window.print()}>
          PDF
        </button>
      </div>
      <p className="text-sm text-neutral-600">
        PDF: Druckansicht öffnet sich → „Als PDF sichern“ wählen. Auf iPad/iPhone: Teilen → Drucken → mit zwei Fingern aufziehen → PDF.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className={btnSecondary} onClick={onBack}>Zurück zu den Angaben</button>
        <button className={btnSecondary} onClick={onRestart}>Neue Situation</button>
      </div>

      {typeof document !== "undefined" && createPortal(<PrintSheet draft={draft} />, document.body)}
    </section>
  );
}

/** Hidden on screen; the only thing visible when printing (see globals.css). */
function PrintSheet({ draft }: { draft: Letter }) {
  return (
    <div id="print-sheet" className="hidden bg-white font-sans text-[11pt] leading-snug text-black">
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
      <p className="mt-10 text-center text-[9pt] font-bold text-amber-700">ENTWURF – vor Versand prüfen</p>
    </div>
  );
}
