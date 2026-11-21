import project from "@/data/project.json";

// Weather of one day at the site via Open-Meteo (free, no key; https://open-meteo.com/en/docs). No AI.
// Recent days (and forecast) from /v1/forecast with past_days, older days from /v1/archive.
// Never invents weather: if Open-Meteo fails, the app asks the user to enter it.

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

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Datum fehlt." }, { status: 400 });
  const { lat, lon } = project.koordinaten;
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.now()) / 86_400_000);
  if (days > 15) return Response.json({ error: "Zu weit in der Zukunft." }, { status: 404 });
  const common = `latitude=${lat}&longitude=${lon}&daily=${DAILY}&timezone=Europe%2FBerlin`;
  const url =
    days >= -60
      ? `https://api.open-meteo.com/v1/forecast?${common}&past_days=${Math.min(92, Math.max(1, -days + 1))}&forecast_days=16`
      : `https://archive-api.open-meteo.com/v1/archive?${common}&start_date=${date}&end_date=${date}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { daily?: Record<string, (number | string | null)[]> };
    const d = data.daily;
    const i = d?.time?.indexOf(date) ?? -1;
    if (!d || i < 0) throw new Error("no day");
    const pick = (k: string) => {
      const v = d[k]?.[i];
      return typeof v === "number" ? v : null;
    };
    const code = pick("weather_code");
    const tMin = pick("temperature_2m_min");
    const tMax = pick("temperature_2m_max");
    const rain = pick("precipitation_sum");
    const wind = pick("wind_speed_10m_max");
    if (code === null || tMin === null || tMax === null) throw new Error("incomplete");
    const word = [codeWord(code), tMin < 0 && code < 71 ? "Frost" : ""].filter(Boolean).join(", ");
    const parts = [
      word,
      `${num(tMin)}–${num(tMax)} °C`,
      rain !== null ? `${num(rain, 1)} mm Niederschlag` : "",
      wind !== null ? `Wind bis ${num(wind)} km/h` : "",
    ].filter(Boolean);
    return Response.json({ text: parts.join(" · ") });
  } catch {
    return Response.json({ error: "Wetter nicht verfügbar." }, { status: 502 });
  }
}
