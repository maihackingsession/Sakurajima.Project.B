// Shared class strings for the „Zeitung“ design (tokens in globals.css).
// One centered 720px column, hairlines, square corners. Touch targets ≥ 44 px.

export const kicker = "font-sans text-[12px] font-bold uppercase tracking-[.06em] text-[var(--accent)]";
export const kickerUrgent = kicker.replace("text-[var(--accent)]", "text-[var(--urgent)]");
export const meta = "font-sans text-[12px] font-semibold uppercase tracking-[.04em] text-[var(--grey)]";
export const h1 = "mt-2 mb-5 font-serif text-[clamp(34px,4.4vw,48px)] font-bold leading-[1.08] tracking-[-.015em] [text-wrap:balance]";
/** Section label with a 2px ink line above. */
export const sectionLabel = "border-t-2 border-[var(--ink)] pt-[10px] font-sans text-[13px] font-extrabold uppercase tracking-[.04em]";
export const listHead = "font-serif text-[21px] font-semibold leading-[1.25]";
export const listHeadFirst = "font-serif text-[24px] font-semibold leading-[1.2]";

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center border border-[var(--ink)] bg-[var(--ink)] px-7 font-sans text-[15px] font-bold text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-white disabled:text-[var(--muted)]";
export const btnOutline =
  "inline-flex min-h-[46px] items-center justify-center border border-[var(--ink)] bg-white px-5 font-sans text-[15px] font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:text-[var(--muted)]";
/** Small actions: underlined text links. */
export const linkBtn =
  "inline-flex min-h-11 items-center font-sans text-[14px] text-[var(--ink)] underline underline-offset-[3px] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]";
export const greyLink = linkBtn.replace("text-[var(--ink)]", "text-[var(--grey)]");
/** „● Sprechen“ text button with the red record dot. */
export const recBtn = "inline-flex min-h-11 items-center gap-2 whitespace-nowrap font-sans text-[14px] font-bold text-[var(--ink)]";

/** Short type name without „(an Nachunternehmer)“. */
export function shortType(label: string) {
  return label.split(" (")[0];
}

/** Short issue title from a subject: the part after the last „ – “ of its first line. */
export function issueTitle(subject: string, fallback: string) {
  const first = subject.split("\n")[0].trim();
  const parts = first.split(/\s+[–-]\s+/);
  const t = parts.length > 1 ? parts[parts.length - 1].trim() : "";
  return t && t.length <= 90 ? t : fallback;
}
