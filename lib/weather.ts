// Open-Meteo weather of one day (free, no key; https://open-meteo.com/en/docs). No AI, never invented.
// Shared by /api/weather (server) and the browser fallback in WeatherLine (if the server call fails).

const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";

/** WMO weather code → German word. */
function codeWord(code: number) {
  if (code <= 1) return "Sonnig";
  if (code === 2) return "Teils bewölkt";
  if (code === 3) return "Bewölkt";
  if (code === 45 || code === 48) return "Nebel";
  if (code >= 51 && code <= 57) return "Nieselregen";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Regen";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Schnee";
  if (code >= 95) return "Gewitter";
  return "";
}

const num = (n: number, digits = 0) => n.toLocaleString("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** Open-Meteo URL for one day (YYYY-MM-DD): recent days + forecast from /forecast, older days from /archive. Null if too far ahead. */
export function weatherUrl(date: string, lat: number, lon: number) {
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.now()) / 86_400_000);
  if (days > 15) return null;
  const common = `latitude=${lat}&longitude=${lon}&daily=${DAILY}&timezone=Europe%2FBerlin`;
  return days >= -60
    ? `https://api.open-meteo.com/v1/forecast?${common}&past_days=${Math.min(92, Math.max(1, -days + 1))}&forecast_days=16`
    : `https://archive-api.open-meteo.com/v1/archive?${common}&start_date=${date}&end_date=${date}`;
}

/** „Regen · 3–8 °C · 5,4 mm Niederschlag · Wind bis 40 km/h“ from an Open-Meteo reply; null if the day is missing. */
export function weatherText(data: unknown, date: string): string | null {
  const d = (data as { daily?: Record<string, (number | string | null)[]> } | null)?.daily;
  const i = d?.time?.indexOf(date) ?? -1;
  if (!d || i < 0) return null;
  const pick = (k: string) => {
    const v = d[k]?.[i];
    return typeof v === "number" ? v : null;
  };
  const code = pick("weather_code");
  const tMin = pick("temperature_2m_min");
  const tMax = pick("temperature_2m_max");
  const rain = pick("precipitation_sum");
  const wind = pick("wind_speed_10m_max");
  if (code === null || tMin === null || tMax === null) return null;
  const word = [codeWord(code), tMin < 0 && code < 71 ? "Frost" : ""].filter(Boolean).join(", ");
  return [
    word,
    `${num(tMin)}–${num(tMax)} °C`,
    rain !== null ? `${num(rain, 1)} mm Niederschlag` : "",
    wind !== null ? `Wind bis ${num(wind)} km/h` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
