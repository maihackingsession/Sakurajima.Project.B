/** One status chip for the whole app. */
export type ChipKind = "angaben" | "entwurf" | "freigegeben" | "pruefung" | "keine" | "hoch" | "mittel" | "niedrig";

const STYLE: Record<ChipKind, { label: string; cls: string }> = {
  angaben: { label: "Angaben fehlen", cls: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]" },
  entwurf: { label: "Entwurf", cls: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]" },
  freigegeben: { label: "Freigegeben", cls: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]" },
  pruefung: { label: "Prüfung erforderlich", cls: "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]" },
  keine: { label: "Keine Anzeige nötig", cls: "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]" },
  hoch: { label: "Hoch", cls: "bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]" },
  mittel: { label: "Mittel", cls: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]" },
  niedrig: { label: "Niedrig", cls: "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]" },
};

export default function Chip({ kind, children }: { kind: ChipKind; children?: React.ReactNode }) {
  const s = STYLE[kind];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-semibold ${s.cls}`}>
      {children ?? s.label}
    </span>
  );
}
