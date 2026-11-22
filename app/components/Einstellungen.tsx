"use client";

import { useState } from "react";
import plan from "@/data/plan.json";
import { fillDates } from "@/lib/dates";
import { ROLLEN, type Anrede, type Settings } from "@/lib/settings";
import { getSettings, saveSettings } from "../lib/store";
import { btnPrimary, greyLink, h1, kicker, linkBtn, sectionLabel } from "../lib/ui";

type Place = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

const field = "line-field !py-1 !text-[19px]";
const label = "block font-sans text-[12px] font-bold tracking-[.06em] uppercase text-[var(--grey)]";
const select = "min-h-11 w-full border-0 border-b border-[var(--line)] bg-transparent font-serif text-[19px] focus:border-[var(--ink)] focus:outline-none";

function Field({ id, name, value, onChange, type = "text", auto, placeholder }: { id: string; name: string; value: string; onChange: (v: string) => void; type?: string; auto?: string; placeholder?: string }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className={label}>{name}</label>
      <input id={id} type={type} autoComplete={auto} className={field} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className={sectionLabel}>{title}</h2>
      {children}
    </section>
  );
}

/** Schedule items the app checks against (read-only, from data/plan.json). */
const planRows = () => JSON.parse(fillDates(JSON.stringify(plan.vorgaenge))) as { id: number; vorgang: string; start: string; ende: string }[];

/** Einstellungen: one column, groups with a 2px rule, borderless fields. Saved only in this browser. */
export default function Einstellungen({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<Settings>(() => getSettings());
  const [query, setQuery] = useState(s.projekt.wetterOrt);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const set = <K extends keyof Settings>(group: K, key: keyof Settings[K]) => (v: string | boolean | number) =>
    setS((old) => ({ ...old, [group]: { ...(old[group] as object), [key]: v } }));

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError("");
    try {
      // Free Open-Meteo Geocoding API (no key), straight from the browser.
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=de&format=json`, { signal: AbortSignal.timeout(8000) });
      const d = (await r.json()) as { results?: Place[] };
      setPlaces(d.results ?? []);
    } catch {
      setSearchError("Ortssuche nicht erreichbar. Bitte später erneut versuchen.");
    } finally {
      setSearching(false);
    }
  }

  function pick(p: Place) {
    setS((old) => ({ ...old, projekt: { ...old.projekt, wetterOrt: p.name, lat: Math.round(p.latitude * 1000) / 1000, lon: Math.round(p.longitude * 1000) / 1000 } }));
    setQuery(p.name);
    setPlaces(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(s);
    onSaved();
  }

  function setPerson(i: number, key: "rolle" | "name" | "firma", v: string) {
    setS((old) => ({ ...old, beteiligte: old.beteiligte.map((b, j) => (j === i ? { ...b, [key]: v } : b)) }));
  }

  return (
    <div className="fade-in">
      <p className={kicker}>Einstellungen</p>
      <h1 className={h1}>Projekt und Absender</h1>
      <p className="-mt-2 font-sans text-[14px] text-[var(--grey)]">Wird nur in diesem Browser gespeichert. Brief, Stempel, Tagesbericht, Wetter und die KI lesen diese Angaben.</p>

      <form onSubmit={save}>
        <Group title="Ich">
          <Field id="s-name" name="Name" value={s.ich.name} onChange={set("ich", "name")} auto="name" />
          <div className="mt-5">
            <label htmlFor="s-rolle" className={label}>Rolle</label>
            <select id="s-rolle" className={select} value={s.ich.rolle} onChange={(e) => set("ich", "rolle")(e.target.value)}>
              {ROLLEN.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Field id="s-tel" name="Telefon" type="tel" value={s.ich.telefon} onChange={set("ich", "telefon")} auto="tel" />
          <Field id="s-mail" name="E-Mail" type="email" value={s.ich.email} onChange={set("ich", "email")} auto="email" />
        </Group>

        <Group title="Bauleitung (unterschreibt)">
          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 font-sans text-[15px]">
            <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--ink)]" checked={s.bauleitung.selbst} onChange={(e) => set("bauleitung", "selbst")(e.target.checked)} />
            Ich bin die Bauleitung
          </label>
          {!s.bauleitung.selbst && (
            <div className="open-in">
              <Field id="s-bl-name" name="Name" value={s.bauleitung.name} onChange={set("bauleitung", "name")} />
              <Field id="s-bl-tel" name="Telefon" type="tel" value={s.bauleitung.telefon} onChange={set("bauleitung", "telefon")} />
            </div>
          )}
        </Group>

        <Group title="Absender">
          <Field id="s-firma" name="Firma" value={s.absender.firma} onChange={set("absender", "firma")} auto="organization" />
          <Field id="s-str" name="Straße" value={s.absender.strasse} onChange={set("absender", "strasse")} auto="street-address" />
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-6">
            <Field id="s-plz" name="PLZ" value={s.absender.plz} onChange={set("absender", "plz")} auto="postal-code" />
            <Field id="s-ort" name="Ort" value={s.absender.ort} onChange={set("absender", "ort")} auto="address-level2" />
          </div>
        </Group>

        <Group title="Projekt">
          <Field id="s-bv" name="Bezeichnung" value={s.projekt.bezeichnung} onChange={set("projekt", "bezeichnung")} />
          <Field id="s-vn" name="Vertragsnummer" value={s.projekt.vertragsnummer} onChange={set("projekt", "vertragsnummer")} />
          <Field id="s-bs" name="Baustellenadresse" value={s.projekt.baustelle} onChange={set("projekt", "baustelle")} />
          <div className="mt-5">
            <label htmlFor="s-wetter" className={label}>Ort für das Wetter</label>
            <div className="flex items-end gap-x-5">
              <input
                id="s-wetter"
                className={`${field} min-w-0 flex-1`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void search();
                  }
                }}
              />
              <button type="button" className={linkBtn} onClick={() => void search()} disabled={searching || query.trim().length < 2}>{searching ? "Suche …" : "Suchen"}</button>
            </div>
            <p className="mt-1 font-sans text-[13px] text-[var(--grey)]">{s.projekt.wetterOrt} · {s.projekt.lat.toLocaleString("de-DE")}° N, {s.projekt.lon.toLocaleString("de-DE")}° O</p>
            {searchError && <p role="alert" className="mt-1 font-sans text-[13px] font-bold text-[var(--urgent)]">{searchError}</p>}
            {places && (
              <ul className="open-in mt-2 border-t border-[var(--rule)]" aria-label="Gefundene Orte">
                {places.length === 0 && <li className="py-3 font-sans text-[14px] text-[var(--grey)]">Kein Ort gefunden.</li>}
                {places.map((p) => (
                  <li key={`${p.latitude},${p.longitude}`}>
                    <button type="button" onClick={() => pick(p)} className="block min-h-11 w-full border-b border-[var(--rule)] py-2 text-left hover:text-[var(--accent)]">
                      <span className="font-serif text-[18px] font-semibold">{p.name}</span>
                      <span className="ml-2 font-sans text-[13px] text-[var(--grey)]">{[p.admin1, p.country].filter(Boolean).join(", ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Group>

        <Group title="Bauherr / Empfänger">
          <Field id="s-ag" name="Firma" value={s.bauherr.firma} onChange={set("bauherr", "firma")} />
          <div className="grid grid-cols-2 gap-x-6">
            <div className="mt-5">
              <label htmlFor="s-anrede" className={label}>Anrede</label>
              <select id="s-anrede" className={select} value={s.bauherr.anrede} onChange={(e) => set("bauherr", "anrede")(e.target.value as Anrede)}>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="">keine</option>
              </select>
            </div>
            <Field id="s-titel" name="Titel" value={s.bauherr.titel} onChange={set("bauherr", "titel")} placeholder="z. B. Dr." />
          </div>
          <div className="grid grid-cols-1 gap-x-6 min-[600px]:grid-cols-2">
            <Field id="s-vorname" name="Vorname (optional)" value={s.bauherr.vorname} onChange={set("bauherr", "vorname")} />
            <Field id="s-nachname" name="Nachname" value={s.bauherr.nachname} onChange={set("bauherr", "nachname")} />
          </div>
          <Field id="s-ag-str" name="Straße" value={s.bauherr.strasse} onChange={set("bauherr", "strasse")} />
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-6">
            <Field id="s-ag-plz" name="PLZ" value={s.bauherr.plz} onChange={set("bauherr", "plz")} />
            <Field id="s-ag-ort" name="Ort" value={s.bauherr.ort} onChange={set("bauherr", "ort")} />
          </div>
          <Field id="s-ag-mail" name="E-Mail (für „Per E-Mail senden“)" type="email" value={s.bauherr.email} onChange={set("bauherr", "email")} />
        </Group>

        <Group title="Weitere Beteiligte">
          <ul>
            {s.beteiligte.map((b, i) => (
              <li key={i} className="border-b border-[var(--rule)] pb-3">
                <div className="grid grid-cols-1 gap-x-6 min-[600px]:grid-cols-3">
                  <Field id={`s-b${i}-rolle`} name="Rolle" value={b.rolle} onChange={(v) => setPerson(i, "rolle", v)} placeholder="z. B. Architekt" />
                  <Field id={`s-b${i}-name`} name="Name" value={b.name} onChange={(v) => setPerson(i, "name", v)} />
                  <Field id={`s-b${i}-firma`} name="Firma" value={b.firma} onChange={(v) => setPerson(i, "firma", v)} />
                </div>
                <button type="button" className={`${greyLink} text-[13px]`} onClick={() => setS((old) => ({ ...old, beteiligte: old.beteiligte.filter((_, j) => j !== i) }))}>Entfernen</button>
              </li>
            ))}
          </ul>
          <button type="button" className={linkBtn} onClick={() => setS((old) => ({ ...old, beteiligte: [...old.beteiligte, { rolle: "", name: "", firma: "" }] }))}>+ Beteiligten hinzufügen</button>
        </Group>

        <div className="mt-12 border-t border-[var(--ink)] pt-4">
          <button type="submit" className={`${btnPrimary} w-full min-[600px]:w-auto`}>Speichern</button>
        </div>
      </form>

      <Group title="Bauzeitenplan">
        <p className="mt-2 font-sans text-[14px] text-[var(--grey)]">Gegen diese Vorgänge prüft die App die Tagesberichte (nur lesen, aus dem Projekt).</p>
        <table className="mt-3 w-full border-collapse font-sans text-[14px]">
          <thead>
            <tr className="border-b border-[var(--ink)] text-left text-[12px] tracking-[.04em] text-[var(--grey)] uppercase">
              <th className="py-2 pr-3 font-bold">Vorgang</th>
              <th className="py-2 pr-3 font-bold">Start</th>
              <th className="py-2 font-bold">Ende</th>
            </tr>
          </thead>
          <tbody>
            {planRows().map((v) => (
              <tr key={v.id} className="border-b border-[var(--rule)]">
                <td className="py-2 pr-3 font-serif text-[16px]">{v.vorgang}</td>
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{v.start}</td>
                <td className="py-2 whitespace-nowrap tabular-nums">{v.ende}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Group>
    </div>
  );
}
