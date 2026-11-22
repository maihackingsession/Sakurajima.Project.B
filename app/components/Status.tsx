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

/** Red record dot (decorative). */
export function RecDot({ blink = false, size = 9 }: { blink?: boolean; size?: number }) {
  return <span aria-hidden className={`dot inline-block shrink-0 bg-[var(--urgent)] ${blink ? "blink" : ""}`} style={{ width: size, height: size }} />;
}
