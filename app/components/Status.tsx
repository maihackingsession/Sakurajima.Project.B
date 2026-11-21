"use client";

import { useEffect, useRef } from "react";
import { btnSecondary } from "../lib/ui";
import { Crane } from "./Crane";

/** Loading state: the Baufrist crane lifting a block + step text. Static for prefers-reduced-motion (globals.css). */
export function Loading({ text }: { text: string }) {
  // On phones the loader can start below the fold: bring it into view.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return (
    <div ref={ref} role="status" aria-live="polite" className="flex flex-col items-center gap-2 py-6 text-center">
      <Crane size={84} loading />
      <p className="text-base font-semibold text-[var(--ink)]">{text}</p>
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
