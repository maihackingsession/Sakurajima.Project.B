"use client";

import { btnSecondary } from "../lib/ui";

/** Loading state: small crane lifting a block + step text. Static for prefers-reduced-motion (globals.css). */
export function Loading({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-6 text-center">
      <svg className="crane" width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
        <g stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* lattice mast */}
          <path d="M18 51V16M23 51V16M18 51l5-6-5-6 5-6-5-6 5-6-5-5" />
          {/* jib, counter-jib, top and ties */}
          <path d="M5 16h47M20.5 16V7M20.5 7 50 16M20.5 7 7 16" />
          {/* base */}
          <path d="M12 51h17" />
          <path className="crane-hook" d="M42 16v9" />
        </g>
        <rect x="6" y="16.5" width="7" height="5" rx="1" fill="var(--navy)" />
        <rect x="39" y="14.5" width="6" height="3" rx="1" fill="var(--navy)" />
        <rect className="crane-block" x="37" y="25" width="10" height="7" rx="1.2" fill="var(--accent)" />
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
