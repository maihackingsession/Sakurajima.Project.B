"use client";

import { useEffect, useState } from "react";

type Props = { label: string; steps?: string[] };

/** Full-bleed navy loader band with the crane. Shown instead of the content while the app waits for the AI. */
export default function CraneLoader({ label, steps = [] }: Props) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (steps.length < 2) return;
    const t = setInterval(() => setStep((n) => Math.min(n + 1, steps.length - 1)), 2500);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="crl-band fade-in">
      <div className="crl-wrap" role="status" aria-live="polite">
        <div className="crl-box">
          <svg className="crl-svg" viewBox="0 0 240 180" aria-hidden="true">
            <g stroke="var(--crl-crane)" strokeWidth={4} fill="none" strokeLinejoin="round" strokeLinecap="round">
              <path d="M44,49 L56,68 L44,87 L56,106 L44,125 L56,144 L44,163" strokeWidth={2.5} />
              <path d="M56,40 L76,49 L96,40 L116,49 L136,40 L156,49 L176,40 L196,49 L216,40" strokeWidth={2.5} />
              <path d="M50,20 L216,40 M50,20 L18,40" strokeWidth={2.5} />
              <path d="M44,40 L50,20 L56,40" />
              <path d="M44,164 L44,40 M56,164 L56,40" strokeLinecap="butt" />
              <path d="M18,40 L216,40 L216,49 L18,49 Z" />
            </g>
            <rect x="18" y="49" width="18" height="12" fill="var(--crl-steel)" />
            <rect x="58" y="51" width="12" height="11" fill="var(--crl-steel)" />
            <line x1="10" y1="166" x2="230" y2="166" stroke="var(--crl-steel)" strokeWidth={4} strokeLinecap="square" />
            <rect className="crl-anim crl-f1" x="152" y="150" width="36" height="14" fill="var(--crl-steel)" />
            <rect className="crl-anim crl-f2" x="152" y="134" width="36" height="14" fill="var(--crl-steel)" />
            <rect className="crl-anim crl-f3" x="152" y="118" width="36" height="14" fill="var(--crl-steel)" />
            <g className="crl-anim crl-trolley">
              <rect x="79" y="46" width="12" height="6" fill="var(--crl-steel)" />
              <rect className="crl-anim crl-cable" x="84" y="48" width="2" height="17" fill="var(--crl-steel)" />
              <g className="crl-anim crl-hook">
                <rect x="80.5" y="64" width="9" height="4" fill="var(--crl-steel)" />
                <g className="crl-anim crl-carried">
                  <path d="M85,68 L69,69 M85,68 L101,69" stroke="var(--crl-steel)" strokeWidth={2} strokeLinecap="round" />
                  <rect x="67" y="69" width="36" height="14" fill="var(--crl-steel)" />
                </g>
              </g>
            </g>
          </svg>
        </div>
        <span className="crl-label">
          {label}
          <span className="crl-dot">.</span><span className="crl-dot">.</span><span className="crl-dot">.</span>
        </span>
        {steps.length > 0 && <span className="crl-step">{steps[step]}</span>}
      </div>
    </div>
  );
}

/** Keeps a loader visible for at least `ms` (no flicker). */
export async function atLeast<T>(ms: number, work: Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await work;
  } finally {
    const rest = ms - (Date.now() - start);
    if (rest > 0) await new Promise((r) => setTimeout(r, rest));
  }
}
