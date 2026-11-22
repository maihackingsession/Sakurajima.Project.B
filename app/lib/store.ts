// All browser storage of Baufrist in ONE place: localStorage (photos: IndexedDB).
// There is no database. To switch to one later, only this file changes.
"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "@/lib/settings";
import type { LetterType } from "@/lib/types";

const CHANGED = "baufrist:store";

/** Reads a JSON value; blocked storage (private mode) gives the fallback. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Writes a JSON value (null removes it) and tells every subscriber. */
export function writeJSON(key: string, value: unknown) {
  try {
    if (value === null || (Array.isArray(value) && value.length === 0)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the app still works for this session view.
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: key }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A list in localStorage with a stable snapshot for useSyncExternalStore. */
function collection<T>(key: string) {
  const empty: T[] = [];
  let raw: string | null | undefined;
  let cached: T[] = empty;
  const get = (): T[] => {
    let now: string | null = null;
    try {
      now = localStorage.getItem(key);
    } catch {
      now = null;
    }
    if (now !== raw) {
      raw = now;
      try {
        const parsed = now ? JSON.parse(now) : [];
        cached = Array.isArray(parsed) ? parsed : empty;
      } catch {
        cached = empty;
      }
    }
    return cached;
  };
  return {
    key,
    get,
    set: (list: T[]) => writeJSON(key, list),
    use: () => useSyncExternalStore(subscribe, get, () => empty),
  };
}

// ---------- Dates (local time) ----------

const pad = (n: number) => String(n).padStart(2, "0");
/** „2026-11-21“ in local time. */
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** „16:12“ in local time. */
export function clock(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function dayDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function shiftDay(day: string, days: number) {
  const d = dayDate(day);
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

// ---------- Entries and events (one source: Heute, Tagesberichte, Fristen & Verlauf) ----------

export type EntryKind = "eintrag" | "notiz" | "anordnung" | "lieferung" | "behinderung" | "mangel" | "frist" | "zusammenfassung";
export const KIND_LABEL: Record<EntryKind, string> = {
  eintrag: "Eintrag",
  notiz: "Notiz",
  anordnung: "Anordnung",
  lieferung: "Lieferung",
  behinderung: "Behinderung",
  mangel: "Mangel",
  frist: "Frist",
  zusammenfassung: "Zusammenfassung",
};
/** Kinds the user can pick for „Neues Ereignis“. */
export const EVENT_KINDS: EntryKind[] = ["notiz", "anordnung", "lieferung", "behinderung", "mangel", "frist"];

/** Background check by the existing router: is a notice needed? */
export type EntryCheck =
  | { status: "pending" }
  | { status: "error" }
  | {
      status: "done";
      letterType: LetterType | null;
      reason: string;
      facts: Record<string, unknown>;
      language?: string;
      /** Router „unklar“: one question with two buttons decides (no further AI call). */
      unclear?: "mangel" | "behinderung";
      /** The button the user chose for the question, e.g. „Firma des Bauherrn“. */
      answer?: string;
      /** Grey hint instead of a letter, e.g. „Mangel dem Bauherrn melden“. */
      hint?: string;
    };

export type Entry = {
  id: string;
  kind: EntryKind;
  /** Day the entry belongs to (YYYY-MM-DD) and time (HH:MM). */
  date: string;
  time: string;
  title?: string;
  text: string;
  /** Kind „Frist“: due day (YYYY-MM-DD). */
  due?: string;
  check?: EntryCheck;
  /** Photo in IndexedDB (see savePhoto). */
  photoId?: string;
  /** Loaded with „Beispieldaten laden“. */
  example?: boolean;
};

const entryStore = collection<Entry>("baufrist:eintraege");
export const useEntries = entryStore.use;
export const getEntries = entryStore.get;

const byTime = (a: Entry, b: Entry) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

export function entriesOfDay(list: Entry[], day: string) {
  return list.filter((e) => e.date === day).sort(byTime);
}

export function addEntry(e: Omit<Entry, "id">): Entry {
  const entry: Entry = { ...e, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` };
  entryStore.set([...entryStore.get(), entry]);
  unsign(entry.date);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Entry>) {
  const old = entryStore.get().find((e) => e.id === id);
  if (!old) return;
  entryStore.set(entryStore.get().map((e) => (e.id === id ? { ...e, ...patch } : e)));
  // Content changes make the day's report a draft again (a background check does not).
  if (patch.text !== undefined || patch.date !== undefined || patch.time !== undefined || patch.title !== undefined) {
    unsign(old.date);
    if (patch.date) unsign(patch.date);
  }
}

export function removeEntry(id: string) {
  const old = entryStore.get().find((e) => e.id === id);
  entryStore.set(entryStore.get().filter((e) => e.id !== id));
  if (old) unsign(old.date);
}

// ---------- Daily reports (Tagesberichte) ----------

export const REPORT_FIELDS = [
  ["personal", "Personal"],
  ["geraete", "Geräte"],
  ["arbeiten", "Ausgeführte Arbeiten"],
  ["lieferungen", "Lieferungen"],
  ["anordnungen", "Anordnungen & Besucher"],
  ["behinderungen", "Behinderungen & Mängel"],
  ["sonstiges", "Sonstiges"],
] as const;
export type ReportField = (typeof REPORT_FIELDS)[number][0];

export type DailyReport = {
  date: string;
  fields: Partial<Record<ReportField, string>>;
  createdAt: string;
  signed?: { by: string; at: string };
  /** Number of notices found by „Mit Bauzeitenplan prüfen“. */
  notices?: number;
  example?: boolean;
};

const reportStore = collection<DailyReport>("baufrist:berichte");
export const useReports = reportStore.use;

export function saveReport(r: DailyReport) {
  reportStore.set([r, ...reportStore.get().filter((x) => x.date !== r.date)]);
}

export function updateReport(day: string, patch: Partial<DailyReport>) {
  const old = reportStore.get().find((r) => r.date === day);
  if (old) saveReport({ ...old, ...patch });
}

function unsign(day: string) {
  const r = reportStore.get().find((x) => x.date === day);
  if (r?.signed) saveReport({ ...r, signed: undefined });
}

// ---------- Weather per day ----------

export type Weather = { text: string; source: "open-meteo" | "manuell" };
const weatherKey = (day: string) => `baufrist:wetter:${day}`;
export function getWeather(day: string): Weather | null {
  return readJSON<Weather | null>(weatherKey(day), null);
}
export function setWeather(day: string, w: Weather) {
  writeJSON(weatherKey(day), w);
}
export function useWeatherSnapshot(day: string) {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(weatherKey(day));
      } catch {
        return null;
      }
    },
    () => null,
  );
}


// ---------- Approved letters (Fristen & Verlauf) ----------

export function letterCollection<T>() {
  return collection<T>("baufrist:verlauf");
}

/** „Verlauf löschen“: entries, events, Tagesberichte and approved letters in this browser. */
export function clearAll() {
  writeJSON("baufrist:eintraege", null);
  writeJSON("baufrist:berichte", null);
  writeJSON("baufrist:verlauf", null);
}

/** Demo data („Beispieldaten laden“): added next to what is already there, never replacing it. */
export function saveDemo(entries: Entry[], reports: DailyReport[]) {
  const have = new Set(entryStore.get().map((e) => e.id));
  entryStore.set([...entryStore.get(), ...entries.filter((e) => !have.has(e.id))]);
  const days = new Set(reportStore.get().map((r) => r.date));
  reportStore.set([...reportStore.get(), ...reports.filter((r) => !days.has(r.date))]);
}

// ---------- Photos (IndexedDB; never sent to the AI) ----------

function photoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("baufrist", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("fotos");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhoto(blob: Blob): Promise<string> {
  const id = `foto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const db = await photoDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("fotos", "readwrite");
    tx.objectStore("fotos").put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function getPhoto(id: string): Promise<Blob | null> {
  try {
    const db = await photoDb();
    return await new Promise((resolve) => {
      const req = db.transaction("fotos").objectStore("fotos").get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ---------- Einstellungen (preset: data/project.json via lib/settings.ts) ----------

const SETTINGS_KEY = "baufrist:einstellungen";
let settingsRaw: string | null | undefined;
let settingsCache: Settings = DEFAULT_SETTINGS;

/** Saved settings or the preset. Stable snapshot for useSyncExternalStore. */
export function getSettings(): Settings {
  let now: string | null = null;
  try {
    now = localStorage.getItem(SETTINGS_KEY);
  } catch {
    now = null;
  }
  if (now !== settingsRaw) {
    settingsRaw = now;
    try {
      settingsCache = now ? normalizeSettings(JSON.parse(now)) : DEFAULT_SETTINGS;
    } catch {
      settingsCache = DEFAULT_SETTINGS;
    }
  }
  return settingsCache;
}

export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

export function saveSettings(s: Settings) {
  const old = getSettings();
  writeJSON(SETTINGS_KEY, s);
  // Another weather place: the cached weather of every day is for the old place.
  if (old.projekt.lat !== s.projekt.lat || old.projekt.lon !== s.projekt.lon) {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("baufrist:wetter:")) localStorage.removeItem(k);
    } catch {
      // blocked storage: nothing cached anyway
    }
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: "baufrist:wetter" }));
  }
}

// ---------- Today (re-read every minute and when the tab becomes visible) ----------

function subscribeClock(onChange: () => void) {
  const t = setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Today's day (YYYY-MM-DD) in the browser's local time; "" on the server. Never fixed at build time. */
export function useToday() {
  return useSyncExternalStore(subscribeClock, () => isoDay(), () => "");
}

// ---------- Beispielmodus (?beispiel=1; kept for this browser tab only) ----------

const BEISPIEL_KEY = "baufrist:beispiel";

/** On with ?beispiel=1 in the address; stays on in this tab (sessionStorage) until „Beispielmodus beenden“. */
export function beispielOn() {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("beispiel");
  try {
    if (param === "1") sessionStorage.setItem(BEISPIEL_KEY, "1");
    if (param === "0") sessionStorage.removeItem(BEISPIEL_KEY);
    return sessionStorage.getItem(BEISPIEL_KEY) === "1";
  } catch {
    return param === "1";
  }
}

export function useBeispiel() {
  return useSyncExternalStore(subscribe, beispielOn, () => false);
}

/** Switches the Beispielmodus off: removes the flag and the address parameter. */
export function endBeispiel() {
  try {
    sessionStorage.removeItem(BEISPIEL_KEY);
    localStorage.removeItem(BEISPIEL_KEY);
  } catch {
    // nothing stored
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("beispiel");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: BEISPIEL_KEY }));
}
