// Einstellungen: who writes, who signs, the project and the client. Shared by the browser (form, letter
// template, PDF) and the server (prompts, Demo-Modus answers). data/project.json is only the preset.
import project from "@/data/project.json";

export type Beteiligter = { rolle: string; name: string; firma: string };
export type Anrede = "Herr" | "Frau" | "";

export type Settings = {
  ich: { name: string; rolle: string; telefon: string; email: string };
  /** Who signs the letters (Bauleitung). `selbst` = my own data from „Ich“. */
  bauleitung: { selbst: boolean; name: string; telefon: string };
  absender: { firma: string; strasse: string; plz: string; ort: string };
  projekt: { bezeichnung: string; vertragsnummer: string; baustelle: string; wetterOrt: string; lat: number; lon: number };
  bauherr: { firma: string; anrede: Anrede; titel: string; vorname: string; nachname: string; strasse: string; plz: string; ort: string; email: string };
  beteiligte: Beteiligter[];
};

export const ROLLEN = ["Bauleiter", "Bauleiterin", "Polier", "Sonstiges"] as const;

const plzOrt = (s: string) => {
  const m = /^(\d{4,5})\s+(.*)$/.exec(s.trim());
  return m ? { plz: m[1], ort: m[2] } : { plz: "", ort: s.trim() };
};

const ag = project.auftraggeber;
const an = project.auftragnehmer;
const agOrt = plzOrt(ag.plz_ort);
const anOrt = plzOrt(an.plz_ort);

/** Preset = the demo project (Herr Prof. Jagtap, Yuzhi Shao, Musterbau GmbH, Garching). */
export const DEFAULT_SETTINGS: Settings = {
  ich: { name: project.bauleiter.name, rolle: project.bauleiter.funktion, telefon: project.bauleiter.telefon, email: an.email },
  bauleitung: { selbst: true, name: "", telefon: "" },
  absender: { firma: an.name, strasse: an.strasse, plz: anOrt.plz, ort: anOrt.ort },
  projekt: {
    bezeichnung: project.bauvorhaben,
    vertragsnummer: project.vertragsnummer,
    baustelle: project.baustelle,
    wetterOrt: project.ort,
    lat: project.koordinaten.lat,
    lon: project.koordinaten.lon,
  },
  bauherr: { firma: ag.name, anrede: "Herr", titel: "Prof.", vorname: "", nachname: "Jagtap", strasse: ag.strasse, plz: agOrt.plz, ort: agOrt.ort, email: "" },
  beteiligte: [
    { rolle: "Tragwerksplaner", name: project.tragwerksplaner_ag.ansprechpartner, firma: project.tragwerksplaner_ag.name },
    { rolle: "Architekt", name: project.architekt_ag.name, firma: "" },
    { rolle: "Polier", name: project.polier.name, firma: an.name },
  ],
};

const str = (v: unknown, max = 160) => (typeof v === "string" ? v.slice(0, max) : "");
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Any stored/sent value → complete Settings (missing parts from the preset, strings capped). */
export function normalizeSettings(v: unknown): Settings {
  const s = obj(v);
  if (!Object.keys(s).length) return DEFAULT_SETTINGS;
  const pick = <K extends keyof Settings>(key: K): Settings[K] => {
    const d = DEFAULT_SETTINGS[key] as Record<string, unknown>;
    const given = obj(s[key]);
    const out: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(d)) {
      const g = given[k];
      out[k] = typeof def === "boolean" ? (typeof g === "boolean" ? g : def) : typeof def === "number" ? (Number.isFinite(g) ? g : def) : typeof g === "string" ? str(g) : def;
    }
    return out as Settings[K];
  };
  const anrede = str(obj(s.bauherr).anrede);
  return {
    ich: pick("ich"),
    bauleitung: pick("bauleitung"),
    absender: pick("absender"),
    projekt: pick("projekt"),
    bauherr: { ...pick("bauherr"), anrede: anrede === "Herr" || anrede === "Frau" ? anrede : obj(s.bauherr).anrede === "" ? "" : DEFAULT_SETTINGS.bauherr.anrede },
    beteiligte: Array.isArray(s.beteiligte)
      ? s.beteiligte.slice(0, 20).map((b) => ({ rolle: str(obj(b).rolle), name: str(obj(b).name), firma: str(obj(b).firma) }))
      : DEFAULT_SETTINGS.beteiligte,
  };
}

export function isDefaultSettings(s: Settings) {
  return JSON.stringify(s) === JSON.stringify(DEFAULT_SETTINGS);
}

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" ");

/** Who signs: my data or the Bauleitung named in the settings. */
export function signer(s: Settings) {
  return s.bauleitung.selbst || !s.bauleitung.name.trim()
    ? { name: s.ich.name, funktion: s.ich.rolle === "Sonstiges" ? "" : s.ich.rolle, telefon: s.ich.telefon }
    : { name: s.bauleitung.name, funktion: "Bauleitung", telefon: s.bauleitung.telefon };
}

export const senderLine = (s: Settings) => [s.absender.firma, s.absender.strasse, join(s.absender.plz, s.absender.ort)].filter((x) => x.trim()).join(" · ");
export const signatureLines = (s: Settings) => [s.absender.firma, "", "", signer(s).name, signer(s).funktion];
/** "München, 21.11.2026": the sender's city + the date (dd.mm.yyyy). */
export const dateLine = (s: Settings, date: string) => (s.absender.ort.trim() ? `${s.absender.ort.trim()}, ${date}` : date);

/** „Herr Prof. Jagtap“ (no first name if empty). */
export const clientPerson = (s: Settings) => join(s.bauherr.anrede, s.bauherr.titel, s.bauherr.vorname, s.bauherr.nachname);

/** Address block of the client (Bauherr / Auftraggeber). */
export function clientAddress(s: Settings) {
  const b = s.bauherr;
  const attn = b.nachname.trim() ? `z. Hd. ${join(b.anrede === "Herr" ? "Herrn" : b.anrede, b.titel, b.vorname, b.nachname)}` : "";
  return [b.firma, attn, b.strasse, join(b.plz, b.ort)].filter((l) => l.trim()).join("\n");
}

export function clientSalutation(s: Settings) {
  const b = s.bauherr;
  if (!b.nachname.trim() || !b.anrede) return "Sehr geehrte Damen und Herren,";
  return `${b.anrede === "Herr" ? "Sehr geehrter Herr" : "Sehr geehrte Frau"} ${join(b.titel, b.nachname)},`;
}

/** „Per E-Mail senden“: mailto link with the client's address (letters to the client), subject and a short German text. */
export function mailtoLink(s: Settings, toClient: boolean, subject: string, date: string) {
  const subj = subject.split("\n")[0].trim();
  const me = signer(s);
  const body = [
    toClient ? clientSalutation(s) : "Sehr geehrte Damen und Herren,",
    "",
    `anbei erhalten Sie unser Schreiben „${subj}“ vom ${date} als PDF.`,
    "",
    "Mit freundlichen Grüßen",
    me.name,
    s.absender.firma,
  ].join("\n");
  const to = toClient ? s.bauherr.email.trim() : "";
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

/** Project data for the prompts ({project_context}): settings + the rest of data/project.json (subcontractors, costs). */
export function projectContext(s: Settings) {
  const me = signer(s);
  return {
    bauvorhaben: s.projekt.bezeichnung,
    baustelle: s.projekt.baustelle,
    ort: s.projekt.wetterOrt,
    vertragsnummer: s.projekt.vertragsnummer,
    vertragsgrundlage: project.vertragsgrundlage,
    auftraggeber: {
      name: s.bauherr.firma,
      ansprechpartner: clientPerson(s),
      anrede_im_brief: clientSalutation(s),
      strasse: s.bauherr.strasse,
      plz_ort: join(s.bauherr.plz, s.bauherr.ort),
    },
    weitere_beteiligte: s.beteiligte.filter((b) => b.name.trim() || b.firma.trim()),
    auftragnehmer: { name: s.absender.firma, strasse: s.absender.strasse, plz_ort: join(s.absender.plz, s.absender.ort), telefon: s.ich.telefon, email: s.ich.email },
    bauleiter: { name: me.name, funktion: me.funktion || "Bauleitung", telefon: me.telefon },
    verfasser: { name: s.ich.name, rolle: s.ich.rolle },
    nachunternehmer: project.nachunternehmer,
  };
}

/**
 * Demo-Modus answers are prepared for the preset project. These pairs swap the preset names
 * and addresses for the ones in the settings (longest first, so whole blocks go before single names).
 */
export function mockReplacements(s: Settings): [string, string][] {
  const d = DEFAULT_SETTINGS;
  const pairs: [string, string][] = [
    [clientAddress(d), clientAddress(s)],
    [clientSalutation(d), clientSalutation(s)],
    [`z. Hd. Herrn Prof. Jagtap`, clientAddress(s).split("\n").find((l) => l.startsWith("z. Hd.")) ?? ""],
    [d.projekt.bezeichnung, s.projekt.bezeichnung],
    [d.bauherr.firma, s.bauherr.firma],
    [d.projekt.vertragsnummer, s.projekt.vertragsnummer],
    [d.absender.firma, s.absender.firma],
    [signer(d).name, signer(s).name],
    ["Herrn Prof. Jagtap", join(s.bauherr.anrede === "Herr" ? "Herrn" : s.bauherr.anrede, s.bauherr.titel, s.bauherr.nachname)],
    ["Herr Prof. Jagtap", clientPerson(s)],
  ];
  return pairs.filter(([a, b]) => a && a !== b && b.trim()).sort((x, y) => y[0].length - x[0].length);
}

export function personalize(text: string, s: Settings) {
  let out = text;
  for (const [from, to] of mockReplacements(s)) out = out.split(from).join(to);
  return out;
}
