"use client";

import { useState } from "react";

/** Small static version of the crane from CraneLoader (same paths), as at the end of the animation. */
type Props = {
  /** lg = masthead (40×30), sm = mobile / focus bar (32×24), xl = empty states (160 wide, light). */
  size?: "lg" | "sm" | "xl";
  /** Sets the top block down once (0.8 s) – only the first mark of a page load, off under reduced motion. */
  drop?: boolean;
  className?: string;
};

const SIZES = { lg: [40, 30], sm: [32, 24], xl: [160, 110] } as const;
let dropped = false;

export default function CraneMark({ size = "lg", drop = false, className = "" }: Props) {
  const [w, h] = SIZES[size];
  const light = size === "xl";
  const crane = light ? "var(--rule)" : "#2B5B84";
  const steel = light ? "var(--rule)" : "#121212";
  // Lattice lines are too fine when small: +1 stroke width for the small marks only.
  const plus = light ? 0 : 1;
  const [animate] = useState(() => {
    if (!drop || dropped) return false;
    dropped = true;
    return true;
  });
  return (
    <svg
      width={w}
      height={h}
      viewBox="10 15 225 155"
      role={light ? undefined : "img"}
      aria-hidden={light ? true : undefined}
      aria-label={light ? undefined : "Baufrist"}
      className={`shrink-0 ${className}`}
      shapeRendering="geometricPrecision"
    >
      <g stroke={crane} strokeWidth={4 + plus} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M44,49 L56,68 L44,87 L56,106 L44,125 L56,144 L44,163" strokeWidth={2.5 + plus} />
        <path d="M56,40 L76,49 L96,40 L116,49 L136,40 L156,49 L176,40 L196,49 L216,40" strokeWidth={2.5 + plus} />
        <path d="M50,20 L216,40 M50,20 L18,40" strokeWidth={2.5 + plus} />
        <path d="M44,40 L50,20 L56,40" />
        <path d="M44,164 L44,40 M56,164 L56,40" strokeLinecap="butt" />
        <path d="M18,40 L216,40 L216,49 L18,49 Z" />
      </g>
      <rect x="18" y="49" width="18" height="12" fill={steel} />
      <rect x="58" y="51" width="12" height="11" fill={steel} />
      <rect x="79" y="46" width="12" height="6" fill={steel} />
      <rect x="84" y="48" width="2" height="17" fill={steel} />
      <rect x="80.5" y="64" width="9" height="4" fill={steel} />
      <line x1="10" y1="166" x2="230" y2="166" stroke={steel} strokeWidth={4 + plus} strokeLinecap="square" />
      <rect x="152" y="150" width="36" height="14" fill={steel} />
      <rect x="152" y="134" width="36" height="14" fill={steel} />
      <rect x="152" y="118" width="36" height="14" fill={steel} className={animate ? "crane-drop" : undefined} />
    </svg>
  );
}
