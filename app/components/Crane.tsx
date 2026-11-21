/**
 * The Baufrist crane: a clean line drawing of a tower crane (lattice tower, lattice jib,
 * counter-jib with counterweight, trolley, rope and hook). Used as logo, favicon (app/icon.svg)
 * and, with a lifted block, as the loading animation (keyframes in globals.css).
 */
export const CRANE_PATHS = [
  // tower: two legs + zig-zag lattice
  "M15 44V14M21 44V14M15 44l6-7.5-6-7.5 6-7.5-6-7.5",
  // base
  "M10 44h16",
  // jib: chords, tip, lattice
  "M21 11h21M21 14h24M42 11l3 3M21 14l3.5-3 3.5 3 3.5-3 3.5 3 3.5-3 3.5 3",
  // counter-jib
  "M15 11H6M15 14H6M6 11v3",
  // tower head + tie bars
  "M15 11l3-7 3 7M18 4l24 7M18 4 6 11",
  // cab
  "M21 14h3.5v3.5H21",
];

export function Crane({ size = 40, loading = false, className = "" }: { size?: number; loading?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={`shrink-0 ${className}`}>
      <g stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {CRANE_PATHS.map((d) => <path key={d} d={d} />)}
      </g>
      {/* counterweight + trolley */}
      <rect x="6" y="14" width="5.5" height="4.5" rx="0.6" fill="var(--ink)" />
      <rect x="34" y="14" width="4.5" height="2.2" rx="0.5" fill="var(--ink)" />
      <g stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path className={loading ? "crane-rope" : ""} d="M36.2 16v11" />
        <g className={loading ? "crane-load" : ""}>
          <path d="M36.2 27v2.2a1.9 1.9 0 1 1-2.4 1.8" />
          {loading && (
            <>
              <path d="M36.2 31.5 33 34.5M36.2 31.5l3.2 3" strokeWidth="1.2" />
              <rect x="31.5" y="34.5" width="9.4" height="6" rx="0.8" fill="var(--accent)" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
