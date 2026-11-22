// Motion system (one place): durations, one easing, reduced-motion check. CSS mirrors these as
// variables in app/globals.css (--dur-fast, --dur, --dur-slow, --ease). Only opacity and transform move.

export const MOTION = {
  fast: 150,
  normal: 250,
  slow: 400,
  ease: "cubic-bezier(.2,.7,.2,1)",
  /** Delay between items that follow each other (Prüfliste, Stillstand, calendar markers). */
  stagger: 60,
} as const;

/** True when the user asked for less motion: then content simply appears. */
export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
