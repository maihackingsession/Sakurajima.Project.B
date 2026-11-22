"use client";

import { useEffect, useState } from "react";
import project from "@/data/project.json";
import { weatherText, weatherUrl } from "@/lib/weather";
import { getWeather, setWeather, useWeatherSnapshot } from "../lib/store";
import { greyLink, linkBtn } from "../lib/ui";

// One running request per day, shared by every WeatherLine of that day. A failure is not
// remembered, so the next WeatherLine (or a reload) tries again.
const inflight = new Map<string, Promise<boolean>>();

async function viaServer(day: string) {
  const r = await fetch(`/api/weather?date=${day}`, { cache: "no-store" });
  const d = (await r.json().catch(() => ({}))) as { text?: string };
  return r.ok && d.text ? d.text : null;
}

/** Fallback when the server can't reach Open-Meteo (e.g. blocked/slow from the host): ask Open-Meteo from the browser. */
async function viaBrowser(day: string) {
  const url = weatherUrl(day, project.koordinaten.lat, project.koordinaten.lon);
  if (!url) return null;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  return r.ok ? weatherText(await r.json(), day) : null;
}

export function loadWeather(day: string) {
  let p = inflight.get(day);
  if (!p) {
    p = (async () => {
      const text = (await viaServer(day).catch(() => null)) ?? (await viaBrowser(day).catch(() => null));
      if (!text) return false;
      setWeather(day, { text, source: "open-meteo" });
      return true;
    })().finally(() => inflight.delete(day));
    inflight.set(day, p);
  }
  return p;
}

/**
 * Grey weather line of a day (Open-Meteo, cached per day in the browser).
 * If it cannot be loaded: „Wetter eintragen“ opens a small field. Weather is never invented.
 */
export default function WeatherLine({ day, editable = false }: { day: string; editable?: boolean }) {
  useWeatherSnapshot(day);
  const w = getWeather(day);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (getWeather(day)) return;
    let alive = true;
    void loadWeather(day).then((ok) => {
      if (alive && !ok) setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [day]);

  if (editing)
    return (
      <form
        className="mt-1 flex flex-wrap items-end gap-x-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) setWeather(day, { text: text.trim(), source: "manuell" });
          setEditing(false);
        }}
      >
        <input
          aria-label="Wetter"
          className="line-field !w-auto min-w-0 flex-1 !py-1 font-sans !text-[15px] !not-italic"
          placeholder="z. B. Bewölkt, 2–6 °C, trocken"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit" className={linkBtn}>Übernehmen</button>
        <button type="button" className={greyLink} onClick={() => setEditing(false)}>Abbrechen</button>
      </form>
    );

  if (w)
    return (
      <p className="mt-1 flex flex-wrap items-center gap-x-4 font-sans text-[13px] text-[var(--grey)]">
        <span>{w.text}</span>
        {editable && <button className={`${greyLink} text-[13px]`} onClick={() => { setText(w.text); setEditing(true); }}>Ändern</button>}
      </p>
    );

  if (failed)
    return (
      <button className={`${greyLink} text-[13px]`} onClick={() => setEditing(true)}>
        Wetter eintragen
      </button>
    );

  return null;
}
