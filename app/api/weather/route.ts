import { connection } from "next/server";
import project from "@/data/project.json";
import { weatherText, weatherUrl } from "@/lib/weather";

// Weather of one day at the site via Open-Meteo (lib/weather.ts). No AI.
// Never invents weather: if Open-Meteo fails, the browser tries Open-Meteo itself, then asks the user.
export async function GET(request: Request) {
  await connection(); // always dynamic: never serve a cached or prerendered answer
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Datum fehlt." }, { status: 400 });
  const url = weatherUrl(date, project.koordinaten.lat, project.koordinaten.lon);
  if (!url) return Response.json({ error: "Zu weit in der Zukunft." }, { status: 404 });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const text = weatherText(await res.json(), date);
    if (!text) throw new Error("no day");
    return Response.json({ text });
  } catch (e) {
    console.error(`[wetter] fehler=${e instanceof Error ? e.message : "unbekannt"}`);
    return Response.json({ error: "Wetter nicht verfügbar." }, { status: 502 });
  }
}
