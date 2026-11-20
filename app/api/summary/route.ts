import { jsonRoute, requireText, runPrompt } from "@/lib/claude";
import type { SummaryResult } from "@/lib/types";

export const maxDuration = 60;

const list = (v: unknown) => (Array.isArray(v) ? v : []);

export const POST = jsonRoute<{ input?: unknown }>(async (body) => {
  const text = requireText(body.input, "Text zum Zusammenfassen", 30000);
  const r = await runPrompt<SummaryResult>("summary", { user_input: text }, { effort: "medium" });
  return {
    summary: typeof r.summary === "string" ? r.summary : "",
    decisions: list(r.decisions).map(String),
    open_items: list(r.open_items).map((o) => ({ task: String(o?.task ?? ""), owner: String(o?.owner ?? ""), due: String(o?.due ?? "") })),
    deadlines: list(r.deadlines).map((d) => ({ date: String(d?.date ?? ""), what: String(d?.what ?? "") })),
    risks: list(r.risks).map(String),
  } satisfies SummaryResult;
});
