export type Sample = { name: string; text: string };
type Samples = { reports: Sample[]; documents: Sample[] };

let cache: Promise<Samples> | null = null;

/** Loads data/samples/*.txt once via /api/samples. */
export function loadSamples(): Promise<Samples> {
  cache ??= fetch("/api/samples")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .catch(() => {
      cache = null;
      throw new Error("Beispiele konnten nicht geladen werden.");
    });
  return cache;
}
