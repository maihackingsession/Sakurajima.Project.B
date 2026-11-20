import { jsonRoute, readData, requireText, runPrompt } from "@/lib/claude";
import { isLetterType, type DeviationResult } from "@/lib/types";

export const maxDuration = 60;

const SEVERITIES = ["niedrig", "mittel", "hoch"] as const;

export const POST = jsonRoute<{ input?: unknown }>(async (body) => {
  const report = requireText(body.input, "einen Tagesbericht");
  const result = await runPrompt<DeviationResult>(
    "deviation",
    { user_input: report, plan: await readData("plan.json") },
    { effort: "medium" },
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
    })),
  } satisfies DeviationResult;
});
