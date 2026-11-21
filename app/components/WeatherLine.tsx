"use client";

import { getWeather, useWeatherSnapshot } from "../lib/store";

/** Grey weather line of a day (filled automatically from step „Wetter“ on). Hidden while unknown. */
export default function WeatherLine({ day }: { day: string; editable?: boolean }) {
  useWeatherSnapshot(day);
  const w = getWeather(day);
  if (!w) return null;
  return <p className="mt-1 font-sans text-[13px] text-[var(--grey)]">{w.text}</p>;
}
