// Shared class strings for the „Zeitung, mutiger“ design (tokens in globals.css).
// Square corners, hairlines, serif headlines, sans labels. Touch targets ≥ 44 px, text ≥ 13 px.
import type { LetterType } from "@/lib/types";

export const kicker = "font-sans text-[13px] font-extrabold uppercase tracking-[.06em]";
export const meta = "font-sans text-[13px] font-semibold uppercase tracking-[.04em] text-[var(--grey)]";
export const h1 = "font-serif text-[clamp(44px,6.4vw,84px)] font-bold leading-none tracking-[-.03em] max-w-[900px] [text-wrap:balance]";
export const itemHead = "font-serif text-[26px] font-semibold leading-[1.2]";
/** Section start: 2px ink line above a kicker. */
export const section = "border-t-2 border-[var(--ink)] pt-3";

export const btnPrimary =
  "inline-flex min-h-[52px] items-center justify-center gap-2 bg-[var(--navy)] px-8 font-sans text-[16px] font-bold text-white hover:bg-[#15294a] disabled:cursor-not-allowed disabled:opacity-50";
export const btnApprove =
  "inline-flex min-h-[48px] items-center justify-center bg-[var(--yellow)] px-7 font-sans text-[16px] font-extrabold text-[var(--ink)] hover:bg-[#ffc81f] disabled:cursor-not-allowed disabled:opacity-50";
/** Small actions: underlined text links. */
export const linkBtn =
  "inline-flex min-h-11 items-center font-sans text-[15px] font-semibold text-[var(--ink)] underline underline-offset-[3px] decoration-1 hover:decoration-2 disabled:cursor-not-allowed disabled:opacity-50";
export const linkOnDark = linkBtn.replace("text-[var(--ink)]", "text-white");
export const greyLink = linkBtn.replace("text-[15px] font-semibold text-[var(--ink)]", "text-[14px] font-medium text-[var(--grey)]");

export const TYPE_COLOR: Record<LetterType, string> = {
  behinderung: "var(--red)",
  mehrkosten: "var(--yellow)",
  bedenken: "var(--navy)",
  maengel: "var(--green)",
};

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
