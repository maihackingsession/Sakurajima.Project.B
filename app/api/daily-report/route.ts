import { jsonRoute, PromptError, runPrompt } from "@/lib/claude";
import { DAILY_REPORT_KEYS, type DailyReportResult } from "@/lib/types";

export const maxDuration = 60;

type Body = { date?: unknown; entries?: unknown };

/** Sorts the day's entries into the fields of a Bautagesbericht (nothing invented; empty stays empty). */
export const POST = jsonRoute<Body>(async (body, ctx) => {
  const date = typeof body.date === "string" ? body.date : "";
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const lines = entries
    .map((e) => (e && typeof e === "object" ? `${String((e as { time?: unknown }).time ?? "")} Uhr: ${String((e as { text?: unknown }).text ?? "")}` : ""))
    .filter((l) => l.length > 6)
    .join("\n")
    .slice(0, 20000);
  if (!lines) throw new PromptError("Keine Einträge für diesen Tag.", 400);
  const r = await runPrompt<Partial<DailyReportResult>>("daily-report", { date, entries: lines }, { effort: "low", mock: ctx.mock });
  const out = {} as DailyReportResult;
  for (const k of DAILY_REPORT_KEYS) out[k] = typeof r[k] === "string" ? (r[k] as string).trim() : "";
  return out;
});
