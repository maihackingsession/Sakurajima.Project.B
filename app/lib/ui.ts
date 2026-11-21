// Shared Tailwind class strings (Baufrist design system v2, tokens in globals.css).
// Mobile-first: min 48 px touch targets, full-width buttons on mobile.
export const field =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--ink)] placeholder:text-[#6f6656] focus:border-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/15 disabled:bg-[var(--surface)]";
export const label = "mb-1.5 block text-sm font-semibold text-[var(--ink)]";
export const hint = "text-sm text-[var(--muted)]";
export const btnBase =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
/** Amber with BLACK text (10:1): only for THE primary action of a screen. */
export const btnPrimary = `${btnBase} border border-[#e09a00] bg-[var(--accent)] text-[19px] font-bold text-[var(--accent-text)] hover:bg-[var(--accent-hover)]`;
/** White with black border. */
export const btnSecondary = `${btnBase} border-2 border-[var(--ink)] bg-white text-base text-[var(--ink)] hover:bg-[var(--surface)]`;
export const linkBtn =
  "inline-flex min-h-12 items-center px-1 text-base font-medium text-[var(--ink)] underline decoration-[var(--accent)] decoration-2 underline-offset-4 hover:decoration-[var(--ink)]";
export const card = "rounded-xl border border-[var(--border)] bg-white p-5";
export const h1 = "text-2xl font-bold text-[var(--ink)]";
export const h2 = "text-lg font-semibold text-[var(--ink)]";
/** Same button, full width on every screen size. */
export const wide = (cls: string) => cls.replace(" sm:w-auto", "");
