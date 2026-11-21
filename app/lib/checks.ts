// "Prüfliste vor Versand" and "Was kostet der Stillstand?" – plain code, no AI.
import { parseGermanDate, urgency } from "@/lib/dates";
import type { Letter, LetterType } from "@/lib/types";

export type Check = { label: string; ok: boolean; note?: string };

const has = (facts: Record<string, unknown>, ...keys: string[]) =>
  keys.some((k) => {
    const v = facts[k];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });

/** First real date (dd.mm.yyyy) for the event: deviation date, facts, else the letter text. */
export function eventDateOf(eventDate: string, facts: Record<string, unknown>, body: string) {
  if (parseGermanDate(eventDate)) return eventDate;
  for (const k of ["datum_beginn", "datum_feststellung", "datum_anordnung", "datum_fund", "datum"]) {
    const v = facts[k];
    if (typeof v === "string" && parseGermanDate(v)) return v;
  }
  const m = /(?:seit dem|am)\s+(\d{1,2}\.\d{1,2}\.\d{4})/i.exec(body);
  return m ? m[1] : "";
}

export function placeholders(text: string) {
  return text.match(/\[[^\]\n]{2,}\]/g) ?? [];
}

export function checklist(letterType: LetterType, letter: Letter, facts: Record<string, unknown>, eventDate: string, hasReport: boolean): Check[] {
  const body = letter.body;
  // A paragraph that still has a placeholder does not count as "present".
  const filled = (re: RegExp) => body.split(/\n\s*\n/).some((p) => re.test(p) && placeholders(p).length === 0);
  // Same, per sentence: for points that often share a paragraph with an open deadline placeholder.
  const said = (re: RegExp) => body.split(/(?<=[.;:])\s+/).some((x) => re.test(x) && placeholders(x).length === 0);
  const deadline = /bis (?:spätestens |zum )+(?!\[)[^\s,.]/i.test(body);
  const evidence = (re: RegExp) => hasReport || filled(re);

  if (letterType === "bedenken") {
    return [
      { label: "Bedenken konkret", ok: has(facts, "bedenken", "gegenstand") || filled(/bedenken gegen|bedenken[^.]*(?:ausführung|planung|abdichtung)/i) },
      { label: "Folgen", ok: filled(/drohen|folge|schäden|schaden|risiko|gefahr/i) },
      { label: "Alternative / Vorschlag", ok: filled(/schlagen[^.]*vor|vorschlag|alternativ|empfehlen/i) },
      { label: "Frist für Entscheidung", ok: deadline },
      { label: "Vor Ausführung", ok: said(/vor (?:ihrer entscheidung|beginn|der ausführung)|nicht (?:ausführen|beginnen)/i) },
      { label: "Nachweise", ok: evidence(/anlage|foto|protokoll|gutachten/i) },
    ];
  }
  if (letterType === "mehrkosten") {
    return [
      { label: "Anordnung (wer / wann)", ok: filled(/angeordnet|anordnung/i) && /\d{1,2}\.\d{1,2}\.\d{4}/.test(body) },
      { label: "Zusätzliche / geänderte Leistung", ok: filled(/zusätzlich|geändert|änderung|nicht vorgesehen/i) },
      { label: "Vor Ausführung angekündigt", ok: filled(/vor (?:beginn der )?ausführung/i) },
      { label: "Kosten folgen / Nachtragsangebot", ok: filled(/nachtrag|gesondert beziffer/i) },
      { label: "Nachweise", ok: evidence(/protokoll|anlage|baubesprechung|schreiben vom|e-mail vom/i) },
    ];
  }
  if (letterType === "maengel") {
    return [
      { label: "Mangel konkret (Lage)", ok: filled(/achse|geschoss|nordseite|südseite|ostseite|westseite|bereich|raum|treppenhaus/i) },
      { label: "Frist zur Beseitigung", ok: deadline },
      { label: "Folgen bei Fristablauf", ok: filled(/fristablauf|ablauf der frist|ersatzvornahme|durch dritte/i) },
      { label: "Nachweise", ok: evidence(/foto|anlage|protokoll/i) },
    ];
  }

  const date = eventDateOf(eventDate, facts, body);
  const u = urgency(date);
  return [
    { label: "Datum des Ereignisses", ok: !!date, note: date || undefined },
    { label: "Ursache", ok: has(facts, "ursache", "mangel", "bedenken", "anordnung") || filled(/ursache|grund|weil|wegen/i) },
    { label: "Betroffene Leistung", ok: has(facts, "betroffene_leistung") || filled(/betroffen/i) },
    { label: "Auswirkung Termine/Kosten", ok: filled(/termin|verzug|verz[öo]ger|verschieb|gef[äa]hrdet|mehrkosten/i) },
    { label: "Frist zur Abhilfe", ok: deadline },
    { label: "Vorbehalt Bauzeit/Kosten", ok: /vorbehalt|behalten (?:wir )?uns[^.]*vor/i.test(body) },
    { label: "Nachweise", ok: hasReport || has(facts, "quelle", "nachfrage") || /tagesbericht|protokoll|foto|anlage|telefonisch|schreiben vom/i.test(body), note: hasReport ? "Tagesbericht" : undefined },
    {
      label: "Unverzüglich",
      ok: u.days !== null && !u.late,
      note: u.days === null ? "Datum fehlt" : u.late ? `seit ${u.days} Tagen – sofort versenden` : u.days === 0 ? "heute" : "seit 1 Tag",
    },
  ];
}

/** First number in a fact value ("4", 4, "4 Arbeitskräfte"); "" if none. */
export function numberFact(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const m = typeof v === "string" ? /\d+(?:[.,]\d+)?/.exec(v) : null;
  return m ? m[0].replace(",", ".") : "";
}

export function euro(n: number) {
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`;
}
