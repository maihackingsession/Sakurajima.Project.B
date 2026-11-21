// Shared Tailwind class strings (Baufrist design system, tokens in globals.css).
// Mobile-first: min 48 px touch targets, full-width buttons on mobile.
export const field =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--navy)] placeholder:text-[#6b7385] focus:border-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20 disabled:bg-[var(--surface)]";
export const label = "mb-1.5 block text-sm font-semibold text-[var(--navy)]";
export const hint = "text-sm text-[var(--muted)]";
const btn =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
/** Orange: only for THE primary action of a screen. 19 px bold = "large text", so white on orange meets WCAG AA. */
export const btnPrimary = `${btn} bg-[var(--accent)] text-[19px] font-bold text-white hover:bg-[var(--accent-hover)]`;
export const btnSecondary = `${btn} border border-[var(--navy)] bg-white text-base text-[var(--navy)] hover:bg-[var(--surface)]`;
export const linkBtn =
  "inline-flex min-h-12 items-center px-1 text-base font-medium text-[var(--navy)] underline decoration-[var(--border)] decoration-2 underline-offset-4 hover:decoration-[var(--navy)]";
export const card = "rounded-xl border border-[var(--border)] bg-white p-5";
export const h1 = "text-2xl font-semibold text-[var(--navy)]";
export const h2 = "text-lg font-semibold text-[var(--navy)]";
