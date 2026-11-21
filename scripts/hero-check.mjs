// Runs the hero story once with real AI: Tagesbericht → Abweichung → Rückfrage → Entwurf.
// Prints the waiting time of each step (what the audience will see on stage).
// Usage: node scripts/hero-check.mjs [baseUrl] ["Antwort auf die Rückfrage"]
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const answer = process.argv[3] || "übermorgen, 12:00 Uhr";

async function post(route, body) {
  const t = Date.now();
  const res = await fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`${route}: ${data.error || res.status}`);
  return { data, s: ((Date.now() - t) / 1000).toFixed(1) };
}

const { reports } = await (await fetch(`${base}/api/samples`)).json();
const report = reports[0].text;
const dev = await post("/api/deviation", { input: report });
const d = dev.data.deviations.find((x) => x.suggested_letter);
console.log(`1 Tagesbericht prüfen: ${dev.s} s →`, d ? `${d.suggested_letter} | ${d.reason} | Datum ${d.event_date}` : "KEINE ANZEIGE EMPFOHLEN", "\n  facts:", JSON.stringify(d?.facts));
if (!d) process.exit(1);
const input = [`${d.activity}: ${d.actual}`, `Geplant laut Bauzeitenplan: ${d.planned}`, d.explanation].join("\n");
const gaps = await post("/api/gaps", { letter_type: d.suggested_letter, input, facts: d.facts });
console.log(`2 Rückfragen: ${gaps.s} s → ${gaps.data.questions.length}:`, gaps.data.questions.map((q) => `${q.question} (${q.field})`).join(" | "));
const answers = Object.fromEntries(gaps.data.questions.slice(0, 1).map((q) => [q.field, answer]));
const letter = await post("/api/letter", { letter_type: d.suggested_letter, input, facts: d.facts, answers });
console.log(`3 Schreiben: ${letter.s} s\n\n${letter.data.subject}\n\n${letter.data.body}\n\nRechtsgrundlage: ${letter.data.legal_basis}\nFrist/Form: ${letter.data.deadline_hint}\nOffen: ${letter.data.missing.join("; ") || "–"}`);
console.log(`\nGesamt: ${(+dev.s + +gaps.s + +letter.s).toFixed(1)} s`);
