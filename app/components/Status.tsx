"use client";

import { kickerUrgent, linkBtn } from "../lib/ui";

/** Error as a red kicker + one sentence + „Erneut versuchen“. No coloured box. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="fade-in border-t-2 border-[var(--urgent)] pt-[10px]">
      <p className={kickerUrgent}>Das hat leider nicht geklappt</p>
      <p className="mt-1 font-serif text-[19px] leading-snug">{message}</p>
      {onRetry && <button className={linkBtn} onClick={onRetry}>Erneut versuchen</button>}
    </div>
  );
}

/** The I-beam mark: ink beam, accent flange. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Baufrist" className="shrink-0">
      <rect x="4" y="4" width="24" height="5" fill="#121212" />
      <rect x="13.5" y="9" width="5" height="14" fill="#121212" />
      <rect x="4" y="23" width="24" height="5" fill="#2B5B84" />
    </svg>
  );
}

/** Red record dot (decorative). */
export function RecDot({ blink = false, size = 9 }: { blink?: boolean; size?: number }) {
  return <span aria-hidden className={`dot inline-block shrink-0 bg-[var(--urgent)] ${blink ? "blink" : ""}`} style={{ width: size, height: size }} />;
}
