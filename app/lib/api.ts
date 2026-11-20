// POST JSON helper: always resolves to data or throws an Error with a German message.
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Keine Verbindung zum Server. Bitte Internetverbindung prüfen.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || "Unbekannter Fehler. Bitte erneut versuchen.");
  }
  return data as T;
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : "Unbekannter Fehler. Bitte erneut versuchen.";
}
