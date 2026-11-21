// Demo dates are relative to today, so the demo story is always "day 1".
// Data files use tokens: {T} = today, {T+3} / {T-2} = days from today (dd.mm.yyyy),
// {T-1:kurz} = short form (dd.mm.). Filled whenever data, samples or mocks are read.

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(d: Date, short = false) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return short ? `${day}.${month}.` : `${day}.${month}.${d.getFullYear()}`;
}

/** Today in Germany (the server on Vercel runs in UTC). */
export function today() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function fillDates(text: string, base = today()) {
  return text.replace(/\{T(?:([+-])(\d+))?(:kurz)?\}/g, (_m, sign: string, n: string, short: string) => {
    const days = sign ? (sign === "-" ? -1 : 1) * Number(n) : 0;
    return formatDate(addDays(base, days), !!short);
  });
}

/** Parses "dd.mm.yyyy" (first match in the text); null if none. */
export function parseGermanDate(text: string): Date | null {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** Whole days between two dates (b − a), ignoring time of day. */
export function daysBetween(a: Date, b: Date) {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** Urgency line for a notice, from the date the event started. */
export function urgency(eventDate: string): { days: number | null; text: string; late: boolean } {
  const d = parseGermanDate(eventDate);
  if (!d) return { days: null, text: "Unverzüglich anzeigen", late: false };
  const days = Math.max(0, daysBetween(d, today()));
  if (days <= 1) return { days, text: "Unverzüglich anzeigen – heute", late: false };
  return { days, text: `Seit ${days} Tagen – sofort anzeigen`, late: true };
}
