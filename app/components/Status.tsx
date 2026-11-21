"use client";

import { kicker, linkBtn } from "../lib/ui";

/** Error as a red kicker + one sentence + „Erneut versuchen“. No coloured box. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="fade-in border-t-2 border-[var(--red)] pt-3">
      <p className={`${kicker} text-[var(--red)]`}>Das hat leider nicht geklappt</p>
      <p className="mt-1 font-serif text-[20px] leading-snug">{message}</p>
      {onRetry && (
        <button className={linkBtn} onClick={onRetry}>Erneut versuchen</button>
      )}
    </div>
  );
}

/** Small square in the letter-type colour (decorative). */
export function TypeSquare({ color, size = 12 }: { color: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0" style={{ width: size, height: size, background: color }} />;
}

/** The I-beam mark. `light` = white beam (on navy), else ink. */
export function Logo({ size = 36, light = true }: { size?: number; light?: boolean }) {
  const c = light ? "#FFFFFF" : "#121212";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Baufrist" className="shrink-0">
      <rect x="4" y="4" width="24" height="5" fill={c} />
      <rect x="13.5" y="9" width="5" height="14" fill={c} />
      <rect x="4" y="23" width="24" height="5" fill="#F2B705" />
    </svg>
  );
}
