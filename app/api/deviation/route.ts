import { jsonRoute, readData, requireText, runPrompt } from "@/lib/claude";
import { addDays, parseGermanDate, today } from "@/lib/dates";
import { isLetterType, type DeviationResult } from "@/lib/types";

export const maxDuration = 60;

const SEVERITIES = ["niedrig", "mittel", "hoch"] as const;

type Plan = {
  vorgaenge?: { start?: string; ende?: string }[];
  plananlieferungen?: { faellig?: string }[];
  [k: string]: unknown;
};

/** Only the schedule items around the report's dates (3 days before to 10 days after; no dates → today). */
function relevantPlan(plan: Plan, report: string): Plan {
  const dates = (report.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) ?? []).map((s) => parseGermanDate(s)).filter((d): d is Date => !!d);
  if (!dates.length) dates.push(today());
  const from = addDays(new Date(Math.min(...dates.map(Number))), -3);
  const to = addDays(new Date(Math.max(...dates.map(Number))), 10);
  const inRange = (start?: string, end?: string) => {
    const s = parseGermanDate(start ?? "");
    const e = parseGermanDate(end ?? start ?? "");
    return !!s && !!e && s <= to && e >= from;
  };
  return {
    ...plan,
    vorgaenge: (plan.vorgaenge ?? []).filter((v) => inRange(v.start, v.ende)),
    plananlieferungen: (plan.plananlieferungen ?? []).filter((p) => inRange(p.faellig)),
  };
}

export const POST = jsonRoute<{ input?: unknown }>(async (body, ctx) => {
  const report = requireText(body.input, "einen Tagesbericht");
  const result = await runPrompt<DeviationResult>(
    "deviation",
    { user_input: report, plan: relevantPlan(await readData<Plan>("plan.json"), report) },
    { effort: "medium", mock: ctx.mock },
  );
  return {
    summary: typeof result.summary === "string" ? result.summary : "",
    deviations: (Array.isArray(result.deviations) ? result.deviations : []).map((d) => ({
      activity: String(d?.activity ?? ""),
      planned: String(d?.planned ?? ""),
      actual: String(d?.actual ?? ""),
      severity: SEVERITIES.includes(d?.severity) ? d.severity : "mittel",
      suggested_letter: isLetterType(d?.suggested_letter) ? d.suggested_letter : null,
      explanation: String(d?.explanation ?? ""),
      reason: String(d?.reason ?? ""),
      event_date: String(d?.event_date ?? ""),
      facts: d?.facts && typeof d.facts === "object" ? d.facts : {},
    })),
  } satisfies DeviationResult;
});
