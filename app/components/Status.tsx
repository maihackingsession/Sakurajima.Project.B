"use client";

import { btnSecondary } from "../lib/ui";

/** Loading state: small crane lifting a block + step text. Static for prefers-reduced-motion (globals.css). */
export function Loading({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-6 text-center">
      <svg className="crane" width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
        <g stroke="var(--navy)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 52V8M12 8h36M12 8l8 8M12 16h6M6 52h14" />
          <path d="M12 8 4 14h8" />
          <path className="crane-hook" d="M38 8v14" />
        </g>
        <rect className="crane-block" x="33" y="22" width="10" height="8" rx="1.5" fill="var(--accent)" />
      </svg>
      <p className="text-base font-semibold text-[var(--navy)]">{text}</p>
    </div>
  );
}

/** Friendly German error + "Erneut versuchen". Never a blank screen. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 text-[var(--error-text)]">
      <p className="font-semibold">Das hat leider nicht geklappt.</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button className={`${btnSecondary} mt-3 sm:w-auto`} onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
